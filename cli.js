#!/usr/bin/env node

import { Command } from 'commander';
import registerAuthCommands from './commands/auth.js';
import registerWebhookCommands from './commands/webhook.js';
import registerConfigCommands from './commands/config.js';
import registerSampleCommands from './commands/samples.js';
import registerOpenApiCommands from './commands/openapi.js';
import registerApiCommands from './commands/api.js';
import { checkPackageUpdate } from './lib/helpers.js';

const CLI_VERSION = '0.0.7';
const program = new Command();

program
  .name('paystack')
  .description('Paystack Developer CLI - Build, test, and manage Paystack integrations from the command line')
  .version(CLI_VERSION);

// Register all command modules
registerAuthCommands(program);
registerWebhookCommands(program);
registerConfigCommands(program);
registerSampleCommands(program);
registerOpenApiCommands(program);
registerApiCommands(program);

// Non-blocking version check
checkPackageUpdate(CLI_VERSION);

program.parseAsync(process.argv).catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
