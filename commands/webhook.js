import http from 'http';
import axios from 'axios';
import crypto from 'crypto';
import chalk from 'chalk';
import localtunnel from 'localtunnel';
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
    .description('Start a local proxy server and localtunnel to receive and forward live Paystack webhooks')
    .option('--port <port>', 'Local port to listen for incoming webhooks', '7777')
    .option('--forward-to <url>', 'Local application URL to forward webhooks to', 'http://localhost:3000/api/paystack-webhook')
    .option('--domain <domain>', 'Paystack environment (test or live)', 'test')
    .action(async (options) => {
      const port = parseInt(options.port, 10) || 7777;
      const forwardUrl = options.forwardTo;
      const domain = options.domain || db.read('domain') || 'test';

      const token = db.read('token');
      const PAYSTACK_SECRET = await helpers.getKeys(token, 'secret', domain);

      const server = http.createServer((req, res) => {
        let body = '';
        const chunks = []; // Store buffers, not strings

        req.on('data', (chunk) => {
          // Join buffers first, THEN convert to string
          chunks.push(chunk);
        });

        req.on('end', async () => {
          const startTime = Date.now();
          const signature = req.headers['x-paystack-signature'] || '';
          body = Buffer.concat(chunks).toString('utf8');

          // 1. VERIFY SIGNATURE BEFORE PROCESSING
          const hash = crypto
            .createHmac('sha512', PAYSTACK_SECRET)
            .update(body) // Use raw body string
            .digest('hex');

          if (hash !== signature) {
            console.log(chalk.red(`✖ Invalid Signature`));
            res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Invalid signature' }));
          }

          console.log(
            `\n${chalk.cyan(req.method)} ${req.url} -> ${chalk.underline(forwardUrl)} [sig: ${signature.substring(0, 16)}...]`
          );

          try {
            // 2. Parse only after verification
            let parsedBody;
            try {
              parsedBody = JSON.parse(body);
            } catch (e) {
              parsedBody = body; // Fallback if not JSON, though Paystack sends JSON
            }

            const targetResponse = await axios({
              method: req.method,
              url: forwardUrl,
              data: parsedBody,
              headers: {
                'Content-Type': req.headers['content-type'] || 'application/json',
                'x-paystack-signature': signature, // Forward the original signature
              },
            });

            const duration = Date.now() - startTime;
            console.log(chalk.green(`✔ ${targetResponse.status} (${duration}ms)`));

            res.writeHead(targetResponse.status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: true, message: 'Webhook forwarded successfully' }));
          } catch (err) {
            console.log("Axios error:", err.message); // Log 3

            const duration = Date.now() - startTime;
            const status = err.response ? err.response.status : 502;
            console.log(chalk.red(`✖ ${status} Forward Error: ${err.message} (${duration}ms)`));

            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: false, error: err.message }));
          }
        });
      });


      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          helpers.errorLog(`Port ${port} is already in use. Stop the process on port ${port} or run with --port <number>.`);
          process.exit(1);
        } else {
          helpers.errorLog(err.message);
          process.exit(1);
        }
      });

      server.listen(port, async () => {
        console.log(chalk.bold.blue('\nPaystack Webhook Listener & Tunnel Proxy'));
        console.log('------------------------------------------');
        console.log(`Local Proxy:   ${chalk.green(`http://localhost:${port}`)}`);
        console.log(`Forwarding to: ${chalk.cyan(forwardUrl)}`);

        try {
          helpers.infoLog('Establishing localtunnel connection to Paystack Sandbox...');
          const tunnel = await localtunnel({ port });
          helpers.successLog(`Tunnel URL: ${chalk.underline.bold(tunnel.url)}`);

          const token = db.read('token');
          const integration = db.read('selected_integration').id;

          if (token) {
            helpers.infoLog(`Auto-configuring Paystack Dashboard (${domain}) Test Webhook URL...`);
            const updated = await helpers.updateWebhookUrl(token, integration, tunnel.url, domain);
            if (updated) {
              helpers.successLog(`Webhook URL auto-configured on Paystack Dashboard!`);
            } else {
              helpers.warnLog(`Webhook tunnel active!!! Copy ${chalk.underline(tunnel.url)} to your Paystack Dashboard settings.`);
            }
          } else {
            helpers.warnLog(`Not logged in. Tunnel active at ${chalk.underline(tunnel.url)}. Run \`paystack login\` for auto-configuration.`);
          }

          console.log(`\n${chalk.bold.green('Ready!')} Listening for live Paystack events... Press ${chalk.bold('Ctrl+C')} to stop.\n`);

          process.on('SIGINT', () => {
            tunnel.close();
            process.exit(0);
          });
        } catch (err) {
          helpers.warnLog(`Could not start localtunnel: ${err.message}. Local proxy active on port ${port}.`);
        }
      });
    });
}

export default registerWebhookCommands;
