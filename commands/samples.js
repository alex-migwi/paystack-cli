import path from 'path';
import shell from 'shelljs';
import chalk from 'chalk';
import * as helpers from '../lib/helpers.js';
import samples from '../lib/samples.js';

export function registerSampleCommands(program) {
  const sampleCmd = program
    .command('samples')
    .alias('sample')
    .description('Browse and clone Paystack starter sample applications');

  sampleCmd
    .command('list')
    .description('List all available Paystack sample projects')
    .option('--json', 'Output as JSON')
    .action((options) => {
      if (options.json) {
        helpers.jsonLog(samples);
        return;
      }

      console.log(chalk.bold('\nAvailable Paystack Sample Projects:\n'));
      Object.entries(samples).forEach(([key, sample]) => {
        console.log(`  ${chalk.cyan.bold(key)} (${sample.name})`);
        console.log(`    Description: ${sample.description}`);
        console.log(`    Repository:  ${chalk.underline(sample.git)}\n`);
      });
    });

  sampleCmd
    .command('create [sample_name] [destination]')
    .description('Clone and set up a Paystack sample project in a specified directory')
    .action((sampleName, destination) => {
      const keys = Object.keys(samples);

      if (!shell.which('git')) {
        helpers.errorLog('Git is required to clone sample repositories. Please install git.');
        process.exit(1);
      }

      let selectedKey = sampleName;
      if (!selectedKey || !samples[selectedKey]) {
        console.log(chalk.bold('\nChoose a sample project to create:\n'));
        keys.forEach((key, index) => {
          console.log(`  ${index + 1}) ${chalk.cyan(key)} - ${samples[key].description}`);
        });
        const choice = helpers.prompt('\nEnter number or sample name: ');
        const choiceNum = parseInt(choice, 10);
        if (choiceNum >= 1 && choiceNum <= keys.length) {
          selectedKey = keys[choiceNum - 1];
        } else if (samples[choice]) {
          selectedKey = choice;
        } else {
          helpers.errorLog('Invalid sample selection.');
          process.exit(1);
        }
      }

      const sample = samples[selectedKey];
      const targetFolder = destination || sample.name;
      const targetPath = path.resolve(process.cwd(), targetFolder);

      helpers.infoLog(`Cloning ${sample.name} into ${targetPath}...`);

      const gitRes = shell.exec(`git clone ${sample.git} "${targetPath}"`);
      if (gitRes.code !== 0) {
        helpers.errorLog('Failed to clone sample repository.');
        process.exit(1);
      }

      helpers.successLog(`Successfully cloned ${sample.name} into ${targetPath}`);
      console.log(chalk.bold('\nNext Steps:'));
      console.log(`  cd ${targetFolder}`);
      if (Array.isArray(sample.init_commands)) {
        sample.init_commands.forEach((cmd) => console.log(`  ${cmd}`));
      }
      console.log('');
    });
}

export default registerSampleCommands;
