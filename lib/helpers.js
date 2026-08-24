import chalk from 'chalk';
import readlineSync from 'readline-sync';
import { URL } from 'url';
import axios from 'axios';
import db from './db.js';
import APIs from './paystack/apis.js';

export function prompt(question, mute = false) {
  return readlineSync.question(question, { hideEchoBack: mute });
}

export const promiseWrapper = (promise) =>
  promise.then((data) => [null, data]).catch((error) => [error]);

export function jsonLog(json) {
  console.log(JSON.stringify(json, null, 2));
}

export function successLog(msg) {
  console.log(chalk.green('✔ ' + msg));
}

export function errorLog(msg) {
  console.error(chalk.red('✖ ' + (msg?.message || msg)));
}

export function infoLog(msg) {
  console.log(chalk.blueBright('ℹ ' + msg));
}

export function warnLog(msg) {
  console.log(chalk.yellow('⚠ ' + msg));
}

export function isJson(val) {
  return val instanceof Array || typeof val === 'object';
}

export function parseURL(uri) {
  if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
    uri = 'http://' + uri;
  }
  return new URL(uri);
}

export function findSchema(resource, action) {
  const resourceSchemas = APIs[resource];
  if (!resourceSchemas) return null;
  return resourceSchemas.find((item) => item.api === action) || null;
}

export async function getKeys(token, type = 'secret', domain = 'test') {
  if (!token) {
    throw new Error('Not authenticated. Please run `paystack login` first.');
  }

  try {
    const response = await axios.get('https://api.paystack.co/integration/keys', {
      headers: { Authorization: 'Bearer ' + token, 'jwt-auth': true },
    });

    const keys = response.data?.data || [];
    const matched = keys.find((k) => k.domain === domain && k.type === type);
    if (matched && matched.key) {
      return matched.key;
    }
    throw new Error(`No ${domain} ${type} key found for this integration.`);
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}

export async function updateWebhookUrl(token, webhookUrl, domain = 'test') {
  if (!token) return null;
  try {
    const field = domain === 'test' ? 'test_webhook_url' : 'live_webhook_url';
    const resp = await axios.put(
      'https://api.paystack.co/integration/payment_page',
      { [field]: webhookUrl },
      { headers: { Authorization: 'Bearer ' + token, 'jwt-auth': true } }
    );
    return resp.data;
  } catch (err) {
    try {
      const secretKey = await getKeys(token, 'secret', domain);
      const resp = await axios.put(
        'https://api.paystack.co/integration/webhooks',
        { webhook_url: webhookUrl },
        { headers: { Authorization: `Bearer ${secretKey}` } }
      );
      return resp.data;
    } catch (e) {
      return null;
    }
  }
}

export async function executeSchema(schema, options = {}, pathParams = {}) {
  const domain = options.domain || db.read('domain') || 'test';
  const token = db.read('token');

  if (!token) {
    throw new Error('Authentication required. Please run `paystack login` first.');
  }

  const key = await getKeys(token, 'secret', domain);

  let endpoint = schema.endpoint;

  // Replace URL placeholders like {id}, {ID}, {id_or_code}, {reference}, {code}, etc.
  const pathMatches = endpoint.match(/\{([^}]+)\}/g);
  if (pathMatches) {
    for (const match of pathMatches) {
      const paramName = match.replace('{', '').replace('}', '');
      // look in pathParams first, then in options
      const paramVal = pathParams[paramName] || options[paramName] || options.id || options.code || options.reference;
      if (!paramVal) {
        throw new Error(`Missing required path parameter: ${paramName}`);
      }
      endpoint = endpoint.replace(match, encodeURIComponent(paramVal));
    }
  }

  // Remove control/meta options from request body/query
  const payload = { ...options };
  delete payload.domain;
  delete payload.json;

  const config = {
    url: endpoint.startsWith('http') ? endpoint : `https://api.paystack.co/${endpoint.replace(/^\//, '')}`,
    method: schema.method || 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  };

  if (config.method.toUpperCase() === 'GET') {
    config.params = payload;
  } else {
    config.data = payload;
  }

  try {
    const resp = await axios(config);
    return resp.data;
  } catch (err) {
    if (err.response?.data?.message) {
      throw new Error(err.response.data.message);
    }
    throw err;
  }
}

export function getDescription(section, title) {
  if (!Array.isArray(section)) return title;
  const actions = section.map((f) => f.api).join(', ');
  return `${title} operations (${actions})`;
}

export async function checkPackageUpdate(currentVersion) {
  if (
    process.env.CI ||
    process.argv.includes('--json') ||
    !process.stdout?.isTTY
  ) {
    return;
  }

  const lastCheck = db.read('lastUpdateCheck') || 0;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();

  if (now - lastCheck < ONE_DAY) {
    return;
  }

  try {
    const res = await axios.get('https://registry.npmjs.org/@paystack-oss/dev-cli/latest', {
      timeout: 2000,
    });
    db.write('lastUpdateCheck', now);

    const latestVersion = res.data?.version;
    if (latestVersion && latestVersion !== currentVersion) {
      console.error(
        `\n${chalk.yellow('Update available!')} ${chalk.dim(currentVersion)} → ${chalk.green(latestVersion)}\n` +
        `Run ${chalk.cyan('npm install -g @paystack-oss/dev-cli')} to update CLI & OpenAPI spec.\n`
      );
    }
  } catch (err) {
    // Fail silently so CLI execution is never blocked
  }
}

