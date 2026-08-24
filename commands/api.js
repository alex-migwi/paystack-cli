import openApiParser from '../lib/openApiParser.js';
import * as helpers from '../lib/helpers.js';
import db from '../lib/db.js';

export function registerApiCommands(program) {
  const apiCmd = program
    .command('api')
    .description('Execute requests against Paystack API resources derived from OpenAPI specification');

  const resourcesMap = openApiParser.parseOpenApiSpec();

  Object.keys(resourcesMap).forEach((resourceName) => {
    const operations = resourcesMap[resourceName];

    const resourceCmd = apiCmd
      .command(resourceName)
      .description(`Manage ${resourceName} resources on Paystack`);

    const registeredActions = new Set();

    operations.forEach((op) => {
      let actionName = op.action;
      if (!actionName) return;

      // Handle duplicate action names safely
      if (registeredActions.has(actionName)) {
        if (op.endpoint.includes('bulk')) {
          actionName = `${actionName}-bulk`;
        } else if (op.method) {
          actionName = `${actionName}-${op.method.toLowerCase()}`;
        } else {
          let counter = 2;
          while (registeredActions.has(`${actionName}-${counter}`)) {
            counter++;
          }
          actionName = `${actionName}-${counter}`;
        }
      }
      registeredActions.add(actionName);

      const actionCmd = resourceCmd
        .command(actionName)
        .description(op.summary || `${op.method} ${op.endpoint}`)
        .option('--domain <domain>', 'API environment domain (test or live)', db.read('domain') || 'test')
        .option('--json', 'Output raw JSON response');

      // Register parameter flags
      if (Array.isArray(op.parameters)) {
        const addedParams = new Set(['domain', 'json']);
        op.parameters.forEach((param) => {
          const cleanParam = param.name ? param.name.trim() : '';
          if (cleanParam && !cleanParam.includes(' ') && !cleanParam.includes('(') && !addedParams.has(cleanParam)) {
            addedParams.add(cleanParam);
            const reqTag = param.required ? ' [required]' : '';
            const optFlag = `--${cleanParam} <value>`;
            actionCmd.option(optFlag, `${param.description || param.type}${reqTag}`);
          }
        });
      }

      actionCmd.action(async (options) => {
        try {
          const schema = {
            endpoint: op.endpoint,
            method: op.method,
            description: op.description,
          };
          const result = await helpers.executeSchema(schema, options);
          if (options.json) {
            helpers.jsonLog(result);
          } else {
            helpers.successLog(result.message || 'API request successful');
            if (result.data) {
              helpers.jsonLog(result.data);
            }
          }
        } catch (err) {
          helpers.errorLog(err.message || err);
          process.exit(1);
        }
      });
    });
  });

  // Shortcut raw HTTP commands: paystack get <endpoint>, paystack post <endpoint>
  program
    .command('get <endpoint>')
    .description('Perform a raw GET request to a Paystack API endpoint')
    .option('--domain <domain>', 'API environment domain (test or live)', 'test')
    .action(async (endpoint, options) => {
      try {
        const result = await helpers.executeSchema({ endpoint, method: 'GET' }, options);
        helpers.jsonLog(result);
      } catch (err) {
        helpers.errorLog(err.message || err);
        process.exit(1);
      }
    });

  program
    .command('post <endpoint>')
    .description('Perform a raw POST request to a Paystack API endpoint')
    .option('--domain <domain>', 'API environment domain (test or live)', 'test')
    .action(async (endpoint, options) => {
      try {
        const result = await helpers.executeSchema({ endpoint, method: 'POST' }, options);
        helpers.jsonLog(result);
      } catch (err) {
        helpers.errorLog(err.message || err);
        process.exit(1);
      }
    });
}

export default registerApiCommands;
