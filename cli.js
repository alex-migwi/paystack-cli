#!/usr/bin/env node

import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import registerAuthCommands from './commands/auth.js';
import registerWebhookCommands from './commands/webhook.js';
import registerConfigCommands from './commands/config.js';
import registerSampleCommands from './commands/samples.js';
import registerOpenApiCommands from './commands/openapi.js';
import registerApiCommands from './commands/api.js';
import { checkPackageUpdate } from './lib/helpers.js';


// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
const pkgPath = join(__dirname, 'package.json');
const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
const CLI_VERSION = pkg.version;

const program = new Command();

program
  .name('paystack-cli')
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
