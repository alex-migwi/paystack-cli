import http from 'http';
import axios from 'axios';
import crypto from 'crypto';
import chalk from 'chalk';
import * as helpers from '../lib/helpers.js';
import db from '../lib/db.js';
import webhookSamples from '../lib/paystack/webhooks.js';

export function registerWebhookCommands(program) {
  const webhookCmd = program
    .command('webhook')
    .description('Utilities for listening to and triggering Paystack webhooks');

  // paystack webhook trigger <event>
  const triggerAction = async (eventArg, options) => {
    const availableEvents = Object.keys(webhookSamples);

    if (options.list || !eventArg) {
      console.log(chalk.bold('\nAvailable Webhook Events to Trigger:\n'));
      availableEvents.forEach((ev) => console.log(`  - ${chalk.cyan(ev)}`));
      console.log(`\nExample: ${chalk.bold('paystack webhook trigger charge.success --forward-to http://localhost:3000/api/webhook')}\n`);
      return;
    }

    const eventName = eventArg.toLowerCase();
    const eventPayload = webhookSamples[eventName];

    if (!eventPayload) {
      helpers.errorLog(`Unknown event type: "${eventArg}".`);
      console.log(`Available events: ${availableEvents.join(', ')}`);
      process.exit(1);
    }

    const forwardUrl = options.forwardTo || 'http://localhost:3000/api/paystack-webhook';
    const domain = options.domain || db.read('domain') || 'test';
    const token = db.read('token');

    let secretKey = options.secret;
    if (!secretKey && token) {
      try {
        secretKey = await helpers.getKeys(token, 'secret', domain);
      } catch (e) {
        // fallback to dummy secret key if not logged in
        secretKey = 'sk_test_mock_paystack_secret_key_for_testing';
      }
    }
    if (!secretKey) {
      secretKey = 'sk_test_mock_paystack_secret_key_for_testing';
    }

    const payloadStr = JSON.stringify(eventPayload);
    const signature = crypto
      .createHmac('sha512', secretKey)
      .update(payloadStr)
      .digest('hex');

    helpers.infoLog(`Sending ${chalk.bold(eventName)} payload to ${chalk.underline(forwardUrl)}`);
    console.log(`x-paystack-signature: ${chalk.gray(signature.substring(0, 32) + '...')}`);

    const startTime = Date.now();
    try {
      const response = await axios.post(forwardUrl, eventPayload, {
        headers: {
          'Content-Type': 'application/json',
          'x-paystack-signature': signature,
          'User-Agent': 'Paystack-CLI/1.0.0',
        },
        timeout: 10000,
      });

      const duration = Date.now() - startTime;
      helpers.successLog(`HTTP ${response.status} ${response.statusText} (${duration}ms)`);
      if (options.json) {
        helpers.jsonLog(response.data);
      } else if (helpers.isJson(response.data)) {
        helpers.jsonLog(response.data);
      } else {
        console.log(response.data);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      if (error.response) {
        helpers.errorLog(`HTTP ${error.response.status} ${error.response.statusText} (${duration}ms)`);
        if (error.response.data) {
          helpers.jsonLog(error.response.data);
        }
      } else {
        helpers.errorLog(`Failed to connect to ${forwardUrl}: ${error.message} (${duration}ms)`);
      }
      process.exit(1);
    }
  };

  webhookCmd
    .command('trigger [event]')
    .alias('ping')
    .description('Trigger a mock Paystack webhook event to a local endpoint with HMAC SHA-512 signature')
    .option('--forward-to <url>', 'URL to forward the simulated webhook event to', 'http://localhost:3000/api/paystack-webhook')
    .option('--secret <secretKey>', 'Paystack secret key used to compute x-paystack-signature HMAC')
    .option('--domain <domain>', 'Paystack environment (test or live)', 'test')
    .option('--list', 'List all available mock events')
    .option('--json', 'Output response as raw JSON')
    .action(triggerAction);

  // paystack webhook listen
  webhookCmd
    .command('listen')
    .description('Start a local proxy server to receive, log, and forward webhooks to your local app')
    .option('--port <port>', 'Local port to listen for incoming webhooks', '7777')
    .option('--forward-to <url>', 'Local application URL to forward webhooks to', 'http://localhost:3000/api/paystack-webhook')
    .action((options) => {
      const port = parseInt(options.port, 10) || 7777;
      const forwardUrl = options.forwardTo;

      const server = http.createServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          const startTime = Date.now();
          const signature = req.headers['x-paystack-signature'] || 'none';
          const eventType = req.headers['x-paystack-event'] || 'webhook';

          console.log(
            `\n${chalk.cyan(req.method)} ${req.url} -> ${chalk.underline(forwardUrl)} [sig: ${signature.substring(0, 16)}...]`
          );

          try {
            let parsedBody = body;
            try {
              parsedBody = JSON.parse(body);
            } catch (e) {
              // keep string
            }

            const targetResponse = await axios({
              method: req.method,
              url: forwardUrl,
              data: parsedBody,
              headers: {
                'Content-Type': req.headers['content-type'] || 'application/json',
                'x-paystack-signature': signature,
              },
            });

            const duration = Date.now() - startTime;
            console.log(chalk.green(`✔ ${targetResponse.status} ${targetResponse.statusText} (${duration}ms)`));

            res.writeHead(targetResponse.status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: true, message: 'Webhook forwarded successfully' }));
          } catch (err) {
            const duration = Date.now() - startTime;
            const status = err.response ? err.response.status : 502;
            console.log(chalk.red(`✖ ${status} Forward Error: ${err.message} (${duration}ms)`));

            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: false, error: err.message }));
          }
        });
      });

      server.listen(port, () => {
        console.log(chalk.bold.blue('\nPaystack Local Webhook Proxy'));
        console.log('----------------------------');
        console.log(`Listening on: ${chalk.green(`http://localhost:${port}`)}`);
        console.log(`Forwarding to: ${chalk.cyan(forwardUrl)}`);
        console.log(`Press ${chalk.bold('Ctrl+C')} to stop.\n`);
      });
    });
}

export default registerWebhookCommands;
