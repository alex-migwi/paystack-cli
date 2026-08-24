import * as helpers from '../lib/helpers.js';
import * as Paystack from '../lib/Paystack.js';
import db from '../lib/db.js';
import chalk from 'chalk';

export function registerAuthCommands(program) {
  program
    .command('login')
    .description('Sign in with your Paystack credentials')
    .action(async () => {
      const expiry = parseInt(db.read('token_expiry') || 0) * 1000;
      const now = Date.now();
      const user = db.read('user');

      if (expiry > now && user && user.email) {
        helpers.infoLog(`Already logged in as ${user.email}`);
        const reAuth = helpers.prompt('Do you want to re-authenticate? (y/N): ');
        if (reAuth.toLowerCase() !== 'y') {
          return;
        }
      }

      const email = helpers.prompt('Email address: ');
      const password = helpers.prompt('Password: ', true);

      const [err, response] = await helpers.promiseWrapper(Paystack.signIn(email, password));

      if (err || !response || !response.data) {
        helpers.errorLog('Authentication failed. Please check your credentials.');
        process.exit(1);
      }

      Paystack.storeLoginDetails(response);
      const token = response.data.token;
      const userData = response.data.user;

      if (userData && Array.isArray(userData.integrations) && userData.integrations.length > 0) {
        let integration;
        if (userData.integrations.length === 1) {
          integration = userData.integrations[0];
        } else {
          const [intErr, selected] = await helpers.promiseWrapper(
            Paystack.selectIntegration(userData.integrations, token)
          );
          if (intErr) {
            helpers.errorLog(intErr);
            process.exit(1);
          }
          integration = selected;
        }

        if (integration) {
          db.write('selected_integration', integration);
          const [getErr, integrationData] = await helpers.promiseWrapper(
            Paystack.getIntegration(integration.id, token)
          );
          if (!getErr && integrationData) {
            db.write('selected_integration', integrationData);
          }
          helpers.successLog(
            `Logged in as ${userData.email} - ${integration.business_name} (${integration.id})`
          );
        }
      } else {
        helpers.successLog(`Logged in as ${userData.email}`);
      }
    });

  program
    .command('logout')
    .description('Sign out and remove saved session credentials')
    .action(() => {
      db.clear();
      helpers.successLog('Successfully logged out.');
    });

  program
    .command('status')
    .description('Show current CLI authentication and active integration status')
    .option('--json', 'Output status as JSON')
    .action((options) => {
      const user = db.read('user') || {};
      const integration = db.read('selected_integration') || {};
      const token = db.read('token');
      const expiry = parseInt(db.read('token_expiry') || 0) * 1000;
      const domain = db.read('domain') || 'test';
      const configPath = db.getConfigPath();
      const isLoggedIn = Boolean(token && expiry > Date.now());

      const statusData = {
        authenticated: isLoggedIn,
        user: user.email || null,
        integration_name: integration.business_name || null,
        integration_id: integration.id || null,
        domain,
        config_path: configPath,
        token_expires: expiry ? new Date(expiry).toISOString() : null,
      };

      if (options.json) {
        helpers.jsonLog(statusData);
        return;
      }

      console.log(chalk.bold('\nPaystack CLI Status\n-------------------'));
      if (isLoggedIn) {
        console.log(`Logged in as:       ${chalk.green(user.email)}`);
        console.log(`Active Business:    ${chalk.cyan(integration.business_name || 'N/A')} (${integration.id || 'N/A'})`);
        console.log(`Environment Domain: ${chalk.yellow(domain.toUpperCase())}`);
        console.log(`Token Expiry:       ${new Date(expiry).toLocaleString()}`);
      } else {
        console.log(`Status:             ${chalk.red('Not Logged In')}`);
        console.log(`Run ${chalk.bold('paystack login')} to authenticate.`);
      }
      console.log(`Config File:        ${configPath}\n`);
    });
}

export default registerAuthCommands;
