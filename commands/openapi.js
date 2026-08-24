import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import * as helpers from '../lib/helpers.js';
import openApiParser from '../lib/openApiParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const bundledJsonPath = path.join(__dirname, '..', 'lib', 'paystack', 'openapi.json');

export function registerOpenApiCommands(program) {
  const openapiCmd = program
    .command('openapi')
    .description('Manage and inspect the CLI OpenAPI specification');

  openapiCmd
    .command('info')
    .description('Display details about the currently active OpenAPI specification')
    .option('--json', 'Output details as JSON')
    .action((options) => {
      const info = openApiParser.getSpecInfo();
      const parsedResources = openApiParser.parseOpenApiSpec();
      const totalOperations = Object.values(parsedResources).reduce((sum, res) => sum + res.length, 0);

      const data = {
        ...info,
        resourceCount: Object.keys(parsedResources).length,
        operationCount: totalOperations,
      };

      if (options.json) {
        helpers.jsonLog(data);
        return;
      }

      console.log(chalk.bold('\nPaystack OpenAPI Specification Info'));
      console.log('-----------------------------------');
      console.log(`Title:          ${chalk.green(data.title)} (v${data.version})`);
      console.log(`Description:    ${data.description}`);
      console.log(`Source File:    ${data.custom ? chalk.yellow('Custom Config') : chalk.cyan('Official Enriched Spec')}`);
      console.log(`Path:           ${data.source}`);
      console.log(`Base Server:    ${data.serverUrl}`);
      console.log(`Endpoints:      ${chalk.bold(data.pathCount)} paths, ${chalk.bold(data.operationCount)} operations across ${chalk.bold(data.resourceCount)} resources\n`);
    });

  openapiCmd
    .command('sync')
    .alias('update')
    .description('Reset local specification configuration back to the CLI bundled release spec (Note: Specs update automatically with NPM CLI updates)')
    .action(() => {
      if (!fs.existsSync(bundledJsonPath)) {
        helpers.errorLog(`Bundled specification file not found at ${bundledJsonPath}`);
        process.exit(1);
      }

      try {
        helpers.infoLog(`Resetting user specification to bundled release spec: ${chalk.underline(bundledJsonPath)}...`);
        const rawContent = fs.readFileSync(bundledJsonPath, 'utf8');
        openApiParser.saveCustomSpec(rawContent, false);

        const info = openApiParser.getSpecInfo();
        helpers.successLog(`Successfully synchronized ${info.title} v${info.version} (${info.pathCount} endpoints).`);
      } catch (err) {
        helpers.errorLog(`Failed to synchronize specification: ${err.message}`);
        process.exit(1);
      }
    });

  openapiCmd
    .command('import <source>')
    .description('[Advanced Dev] Import a custom OpenAPI 3.0 specification from a local file path or URL')
    .action(async (source) => {
      try {
        let content = '';
        if (source.startsWith('http://') || source.startsWith('https://')) {
          helpers.infoLog(`Downloading custom OpenAPI spec from ${source}...`);
          const axios = (await import('axios')).default;
          const res = await axios.get(source, { timeout: 15000 });
          content = typeof res.data === 'object' ? JSON.stringify(res.data) : res.data;
        } else {
          helpers.infoLog(`Reading OpenAPI spec from local file: ${source}...`);
          content = fs.readFileSync(source, 'utf8');
        }

        let parsedSpec;
        let isYaml = false;
        try {
          parsedSpec = JSON.parse(content);
        } catch (jsonErr) {
          try {
            parsedSpec = YAML.parse(content);
            isYaml = true;
          } catch (yamlErr) {
            throw new Error('Failed to parse specification. File must be valid JSON or YAML OpenAPI 3.0 document.');
          }
        }

        if (!parsedSpec.openapi || !parsedSpec.paths) {
          throw new Error('Invalid OpenAPI 3.0 document. Missing required "openapi" version or "paths" object.');
        }

        openApiParser.saveCustomSpec(content, isYaml);
        const info = openApiParser.getSpecInfo();
        helpers.successLog(`Successfully imported ${info.title} v${info.version} with ${info.pathCount} endpoints.`);
      } catch (err) {
        helpers.errorLog(err.message || err);
        process.exit(1);
      }
    });
}

export default registerOpenApiCommands;
