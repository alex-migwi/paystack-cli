import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bundledJsonPath = path.join(__dirname, 'paystack', 'openapi.json');
const bundledYamlPath = path.join(__dirname, 'paystack', 'paystack.yaml');

const customJsonPath = path.join(os.homedir(), '.config', 'paystack', 'openapi.json');
const customYamlPath = path.join(os.homedir(), '.config', 'paystack', 'paystack.yaml');

export function loadActiveSpec() {
  // 1. Prefer custom JSON spec if present (fastest native V8 parse)
  if (fs.existsSync(customJsonPath)) {
    try {
      return JSON.parse(fs.readFileSync(customJsonPath, 'utf8'));
    } catch (e) {}
  }
  // 2. Custom YAML fallback
  if (fs.existsSync(customYamlPath)) {
    try {
      return YAML.parse(fs.readFileSync(customYamlPath, 'utf8'));
    } catch (e) {}
  }
  // 3. Bundled JSON spec (40x faster startup performance)
  if (fs.existsSync(bundledJsonPath)) {
    try {
      return JSON.parse(fs.readFileSync(bundledJsonPath, 'utf8'));
    } catch (e) {}
  }
  // 4. Bundled YAML fallback
  if (fs.existsSync(bundledYamlPath)) {
    try {
      return YAML.parse(fs.readFileSync(bundledYamlPath, 'utf8'));
    } catch (e) {}
  }
  return { openapi: '3.0.1', paths: {} };
}

export function saveCustomSpec(specContent, isYaml = false) {
  const configDir = path.join(os.homedir(), '.config', 'paystack');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const targetPath = isYaml ? customYamlPath : customJsonPath;
  fs.writeFileSync(
    targetPath,
    typeof specContent === 'string' ? specContent : (isYaml ? YAML.stringify(specContent) : JSON.stringify(specContent, null, 2)),
    'utf8'
  );
}

export function parseOpenApiSpec(spec = loadActiveSpec()) {
  const resources = {};

  if (!spec || !spec.paths) {
    return resources;
  }

  const paths = spec.paths;

  Object.keys(paths).forEach((endpointPath) => {
    const pathItem = paths[endpointPath];
    if (!pathItem) return;

    ['get', 'post', 'put', 'delete', 'patch'].forEach((httpMethod) => {
      const op = pathItem[httpMethod];
      if (!op) return;

      // Extract Tag (Resource)
      let resourceName = 'miscellaneous';
      if (Array.isArray(op.tags) && op.tags.length > 0) {
        resourceName = op.tags[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      } else {
        const segments = endpointPath.split('/').filter(Boolean);
        if (segments.length > 0) {
          resourceName = segments[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        }
      }

      // Extract Enriched Operation ID / Action Name
      let rawAction = op['x-operation-id'] || op.operationId;
      let actionName = rawAction;

      if (!actionName) {
        const cleanPath = endpointPath.replace(/\{[^}]+\}/g, '').replace(/\/$/, '');
        const segments = cleanPath.split('/').filter(Boolean);
        actionName = segments.length > 1 ? segments[segments.length - 1] : httpMethod;
      } else {
        // Clean operationId e.g. initializeTransaction -> initialize, listTransactions -> list
        let cleaned = actionName
          .replace(new RegExp(`${resourceName}s?$`, 'i'), '')
          .replace(new RegExp(`^${resourceName}`, 'i'), '')
          .replace(/^[^a-zA-Z0-9]+/, '')
          .replace(/^./, (c) => c.toLowerCase());
        if (cleaned.length > 0) {
          actionName = cleaned;
        }
      }
      if (!actionName) actionName = httpMethod;

      // Collect parameters
      const parameters = [];

      // Path & Query parameters
      if (Array.isArray(op.parameters)) {
        op.parameters.forEach((param) => {
          if (param.name) {
            parameters.push({
              name: param.name,
              in: param.in || 'query',
              required: Boolean(param.required),
              type: param.schema?.type || 'string',
              description: param.description || '',
            });
          }
        });
      }

      // RequestBody parameters
      if (op.requestBody && op.requestBody.content) {
        const content = op.requestBody.content;
        const jsonContent = content['application/json'] || content['application/x-www-form-urlencoded'];
        if (jsonContent && jsonContent.schema && jsonContent.schema.properties) {
          const props = jsonContent.schema.properties;
          const requiredList = jsonContent.schema.required || [];

          Object.keys(props).forEach((propName) => {
            const propSchema = props[propName] || {};
            parameters.push({
              name: propName,
              in: 'body',
              required: requiredList.includes(propName),
              type: propSchema.type || 'string',
              description: propSchema.description || '',
            });
          });
        }
      }

      // Enriched Metadata Extensions
      const idempotency = Boolean(op['x-idempotency']);
      const retrySafe = Boolean(op['x-retry-safe']);
      const dontRetry = Boolean(op['x-dont-retry']);
      const pagination = op['x-pagination'] || null;

      const parsedOperation = {
        resource: resourceName,
        action: actionName,
        operationId: op['x-operation-id'] || op.operationId || actionName,
        method: httpMethod.toUpperCase(),
        endpoint: endpointPath,
        summary: op.summary || `${httpMethod.toUpperCase()} ${endpointPath}`,
        description: op.description || op.summary || '',
        parameters,
        idempotency,
        retrySafe,
        dontRetry,
        pagination,
      };

      if (!resources[resourceName]) {
        resources[resourceName] = [];
      }
      resources[resourceName].push(parsedOperation);
    });
  });

  return resources;
}

export function getSpecInfo(spec = loadActiveSpec()) {
  return {
    title: spec.info?.title || 'Paystack Enriched Specification',
    version: spec.info?.version || '1.0.0',
    description: spec.info?.description || '',
    pathCount: spec.paths ? Object.keys(spec.paths).length : 0,
    serverUrl: spec.servers?.[0]?.url || 'https://api.paystack.co',
    custom: fs.existsSync(customJsonPath) || fs.existsSync(customYamlPath),
    source: fs.existsSync(customJsonPath)
      ? customJsonPath
      : fs.existsSync(customYamlPath)
      ? customYamlPath
      : fs.existsSync(bundledJsonPath)
      ? bundledJsonPath
      : bundledYamlPath,
  };
}

export default {
  loadActiveSpec,
  saveCustomSpec,
  parseOpenApiSpec,
  getSpecInfo,
};
