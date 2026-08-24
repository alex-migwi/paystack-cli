import db from '../lib/db.js';
import * as helpers from '../lib/helpers.js';
import chalk from 'chalk';

export function registerConfigCommands(program) {
  const configCmd = program
    .command('config')
    .description('Manage CLI configuration settings stored in ~/.config/paystack/config.json');

  configCmd
    .command('get [key]')
    .description('Get a configuration value or display all configurations')
    .option('--json', 'Output as JSON')
    .action((key, options) => {
      if (!key) {
        const all = db.getAll();
        if (options.json) {
          helpers.jsonLog(all);
        } else {
          console.log(chalk.bold('\nPaystack CLI Configuration:'));
          Object.entries(all).forEach(([k, v]) => {
            console.log(`  ${chalk.cyan(k)}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
          });
          console.log(`\nConfig file: ${db.getConfigPath()}\n`);
        }
        return;
      }

      const val = db.read(key);
      if (options.json) {
        helpers.jsonLog({ [key]: val });
      } else {
        console.log(`${chalk.cyan(key)} = ${typeof val === 'object' ? JSON.stringify(val, null, 2) : val}`);
      }
    });

  configCmd
    .command('set <key> <value>')
    .description('Set a configuration setting (e.g. domain test or live)')
    .action((key, value) => {
      let parsedValue = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(Number(value))) parsedValue = Number(value);

      db.write(key, parsedValue);
      helpers.successLog(`Set configuration ${key} = ${value}`);
    });

  configCmd
    .command('list')
    .description('List all CLI configuration settings')
    .option('--json', 'Output as JSON')
    .action((options) => {
      const all = db.getAll();
      if (options.json) {
        helpers.jsonLog(all);
      } else {
        console.log(chalk.bold('\nPaystack CLI Configuration:'));
        Object.entries(all).forEach(([k, v]) => {
          console.log(`  ${chalk.cyan(k)}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
        });
        console.log(`\nConfig file: ${db.getConfigPath()}\n`);
      }
    });
}

export default registerConfigCommands;
