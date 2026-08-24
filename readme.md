# Paystack CLI (`@paystack-oss/dev-cli`)

[![Paystack Logo](https://res.cloudinary.com/drps6uoe4/image/upload/c_scale,w_200/v1584835701/Paystack-CeruleanBlue-StackBlue-HL_2_neik7g.png)](https://paystack.com)

The **Paystack CLI** is a robust, developer-first command-line tool modeled after modern CLI standards (`stripe-cli`). It enables developers to build, test, script, and manage their Paystack integrations directly from their terminal or CI/CD pipelines.

---

## ⚡ Key Developer Experience (DevEx) Features

* **🔑 Automatic Secret Key Retrieval**: Authenticate once via `paystack login`. The CLI securely stores your session token in `~/.config/paystack/config.json` and automatically resolves the correct secret API key (`test` or `live`) behind the scenes per request. **No manual API key copying or hardcoded `.env` files required!**
* **🌐 Complete Online Paystack API Surface**: Execute requests against **125 endpoints across 27 API resources** (`transaction`, `customer`, `subaccount`, `plan`, `subscription`, `transfer`, `refund`, `bank`, `dispute`, etc.) with strict parameter type validation.
* **⚡ 40x Faster Native Spec Engine**: Powered by an offline bundled JSON spec (`lib/paystack/openapi.json`) derived from [`paystack-spec-enriched`](https://github.com/PaystackOSS/paystack-spec-enriched), achieving **~360ms total command execution time**.
* **⚓ Zero-Dependency Local Webhooks**: Simulate signed webhook events with authentic HMAC SHA-512 signatures (`x-paystack-signature`) via `paystack webhook trigger` or listen to local webhooks with `paystack webhook listen` — **no 3rd-party tunneling services (`ngrok`) required**.
* **🤖 Scriptable & Machine-Readable**: One-shot subcommands built with `commander`. Pass `--json` to pipe response payloads directly into shell utilities like `jq` or GitHub Actions scripts.

---

## 🚀 Installation & Quick Start

Requires [Node.js](https://nodejs.org/) v18+.

```bash
# Global installation via npm
npm install -g @paystack-oss/dev-cli

# Verify installation
paystack --version
```

---

## 🔐 1. Authentication & Automatic Key Resolution

### Sign In (`paystack login`)
Interactively log in to your Paystack account and select your active business integration.

```bash
paystack login
```
> **How It Works Under the Hood**:
> 1. The CLI authenticates your account and stores a session JWT token in system-standard `~/.config/paystack/config.json` with user-only (`0600`) permissions.
> 2. Whenever you execute an API command, `lib/helpers.js` queries Paystack's key resolution endpoint (`/integration/keys`) behind the scenes using the session token.
> 3. The CLI automatically retrieves and attaches the appropriate Bearer Secret Key (`test` or `live`) for the request and disposes of it in memory.

### Inspect Status (`paystack status`)
View your current login account, active business name & ID, environment domain (`TEST`/`LIVE`), token expiration time, and config path.

```bash
paystack status
paystack status --json
```

---

## 📡 2. Calling the Paystack API

Execute requests against any Paystack API resource directly from your terminal.

```bash
# Initialize a payment
paystack api transaction initialize \
  --email "customer@example.com" \
  --amount 50000 \
  --currency "NGN" \
  --domain test

# Verify a transaction (piped with jq)
paystack api transaction verify --reference "qTPrJoy9Bx" --json | jq '.data.status'

# List transactions
paystack api transaction list --perPage 10 --status success

# Create a customer
paystack api customer create --email "alex@example.com" --first_name "Alex" --last_name "Muturi"

# Raw REST HTTP Shortcuts
paystack get transaction/verify/qTPrJoy9Bx --domain test
paystack post transaction/initialize --domain test
```

### Domain Environment Switching
Toggle between `test` and `live` modes on any command:
* Pass `--domain live` or `--domain test` on specific commands.
* Or set a global default: `paystack config set domain test`.

---

## ⚓ 3. Webhook Testing & Simulation (Zero-Dependency)

Test local webhook endpoints without installing `ngrok` or setting up 3rd-party tunneling accounts.

```bash
# List all pre-configured mock webhook events
paystack webhook trigger --list

# Trigger a charge.success event with a signed HMAC SHA-512 header
paystack webhook trigger charge.success \
  --forward-to http://localhost:3000/api/paystack-webhook

# Run a local proxy listener
paystack webhook listen --port 7777 --forward-to http://localhost:3000/api/paystack-webhook
```

---

## 🛠️ 4. Configuration & Auto-Reporting Package Updates

The CLI includes built-in **Self-Reporting Package Update Notifications**. Once every 24 hours, the CLI non-blockingly checks the NPM registry. When a new version of `@paystack-oss/dev-cli` is published, the CLI notifies you directly in your terminal. 

Updating `@paystack-oss/dev-cli` via NPM automatically updates both the CLI logic and the bundled OpenAPI specification:

```bash
# Update CLI and OpenAPI specification to latest release
npm install -g @paystack-oss/dev-cli

# View CLI configurations
paystack config list
paystack config list --json

# Read or set a specific preference
paystack config get domain
paystack config set domain live

# Inspect active OpenAPI spec details
paystack openapi info

# Reset custom local spec back to bundled release spec
paystack openapi sync
```

---

## 📦 5. Starter Sample Applications

Browse and clone Paystack starter sample templates:

```bash
# List available sample repositories
paystack samples list

# Clone a sample project
paystack samples create sample_vue my-paystack-app
```

---

## 📚 Complete Documentation Suite

For detailed technical references, check the [`docs/`](file:///home/alex-muturi/alex/paystack-cli/docs/) directory:

* **[`CLI_USER_GUIDE.md`](file:///home/alex-muturi/alex/paystack-cli/docs/CLI_USER_GUIDE.md)**: Hands-on user guide with full command options, flag reference, and Bash/`jq` automation recipes.
* **[`MODERN_CLI_DOCUMENTATION.md`](file:///home/alex-muturi/alex/paystack-cli/docs/MODERN_CLI_DOCUMENTATION.md)**: Modern CLI architecture, OpenAPI spec engine, and Old vs. New feature comparison table.
* **[`ARCHITECTURAL_DECISIONS.md`](file:///home/alex-muturi/alex/paystack-cli/docs/ARCHITECTURAL_DECISIONS.md)**: Architectural Decision Records (ADRs 001 - 006) covering session key security, offline spec bundling, and zero-drift GitHub Actions workflows.
* **[`OLD_CLI_DOCUMENTATION.md`](file:///home/alex-muturi/alex/paystack-cli/docs/OLD_CLI_DOCUMENTATION.md)**: Legacy REPL CLI documentation and critique.

---

## 📄 License

MIT
