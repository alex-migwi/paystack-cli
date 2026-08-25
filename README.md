# Paystack Scriptable CLI (`paystack-cli`)

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Commander.js](https://img.shields.io/badge/Commander.js-v11-blue?style=flat-square)](https://github.com/tj/commander.js)

A high-performance, scriptable Command Line Interface (CLI) for the Paystack API ecosystem. Built with Commander.js, TypeScript, and V8 native JSON parsing, this tool provides a non-interactive, CI/CD-friendly CLI interface powered directly by the enriched OpenAPI 3.0 specification (`paystack-spec-enriched`).

---

### Proof of Concept

This project was created as a proof of concept.

It demonstrates the proposed approach, developer experience, and technical thinking behind the solution. The implementation is intentionally open to further refinement and iteration.

---

## Key Features

- **Non-Interactive CI/CD Native**: Designed for shell scripting, automated pipelines, and non-interactive execution.
- **Enriched Spec Source of Truth**: Dynamically executes operations and validates inputs against `paystack-spec-enriched` API resources** (`transaction`, `customer`, `subaccount`, `plan`, `subscription`, `transfer`, `refund`, `bank`, `dispute`, etc.)
- **Automated Update Notification**: Non-blocking background updater that checks NPM for spec/CLI releases without delaying execution.
- **Zero-Dependency Webhook Engine**: Built-in local proxy and webhook listener engine for testing events without external tunneling services.
- **Scriptable & Machine-Readable**: One-shot subcommands built with `commander`. Pass `--json` to pipe response payloads directly into shell utilities like `jq` or GitHub Actions scripts.
---

## Getting Started

### Installation

Requires [Node.js](https://nodejs.org/) v18+.


```bash
git clone https://github.com/Alex-Muturi/paystack-cli.git
cd paystack-cli
npm install

# Install from the repo after build
npm link

# Verify installation
paystack-cli --version
```

---

## 🔐 1. Authentication & Automatic Key Resolution

### Sign In (`paystack login`)
Interactively log in to your Paystack account and select your active business integration.

```bash
paystack-cli login
```
> **How It Works Under the Hood**:
> 1. The CLI authenticates your account and stores a session JWT token in system-standard `~/.config/paystack/config.json` with user-only (`0600`) permissions.
> 2. Whenever you execute an API command, `lib/helpers.js` queries Paystack's key resolution endpoint (`/integration/keys`) behind the scenes using the session token.
> 3. The CLI automatically retrieves and attaches the appropriate Bearer Secret Key (`test` or `live`) for the request and disposes of it in memory.

### Inspect Status (`paystack-cli status`)
View your current login account, active business name & ID, environment domain (`TEST`/`LIVE`), token expiration time, and config path.

```bash
paystack-cli status
paystack-cli status --json
```

---

## 📡 2. Calling the Paystack API

Execute requests against any Paystack API resource directly from your terminal.

```bash
# Initialize a payment
paystack-cli api transaction initialize \
  --email "customer@example.com" \
  --amount 50000 \
  --currency "NGN" \
  --domain test

# Verify a transaction (piped with jq)
paystack-cli api transaction verify --reference "qTPrJoy9Bx" --json | jq '.data.status'

# List transactions
paystack-cli api transaction list --perPage 10 --status success

# Create a customer
paystack-cli api customer create --email "alex@example.com" --first_name "Alex" --last_name "Muturi"

# Raw REST HTTP Shortcuts
paystack-cli get transaction/verify/qTPrJoy9Bx --domain test
paystack-cli post transaction/initialize --domain test
```

### Domain Environment Switching
Toggle between `test` and `live` modes on any command:
* Pass `--domain live` or `--domain test` on specific commands.
* Or set a global default: `paystack-cli config set domain test`.

---

## ⚓ 3. Webhook Testing & Simulation (Zero-Dependency)

Test local webhook endpoints without installing `ngrok` or setting up 3rd-party tunneling accounts.

```bash
# List all pre-configured mock webhook events
paystack-cli webhook trigger --list

# Trigger a charge.success event with a signed HMAC SHA-512 header
paystack-cli webhook trigger charge.success \
  --forward-to http://localhost:3000/api/paystack-webhook

# Run a local proxy listener
paystack-cli webhook listen --port 7777 -- --forward-to http://localhost:3000/api/paystack-webhook
```

---

## 🛠️ 4. Configuration & Auto-Reporting Package Updates

The CLI includes built-in **Self-Reporting Package Update Notifications**. Once every 24 hours, the CLI non-blockingly checks the NPM registry. When a new version of `@paystack-cli` is published, the CLI notifies you directly in your terminal. 

Updating `@paystack-cli` via NPM automatically updates both the CLI logic and the bundled OpenAPI specification:

```bash
# Update CLI and OpenAPI specification to latest release
npm install -g @paystack-cli

# View CLI configurations
paystack-cli config list
paystack-cli config list --json

# Read or set a specific preference
paystack-cli config get domain
paystack-cli config set domain live

# Inspect active OpenAPI spec details
paystack-cli openapi info

# Reset custom local spec back to bundled release spec
paystack-cli openapi sync
```

---

## 📦 5. Starter Sample Applications

Browse and clone Paystack starter sample templates:

```bash
# List available sample repositories
paystack-cli samples list

# Clone a sample project
paystack-cli samples create sample_vue my-paystack-app
```

---

## 📚 Complete Documentation Suite

For detailed technical references, check the [`docs/`](./docs/) directory:

* **[`CLI_USER_GUIDE.md`](./docs/CLI_USER_GUIDE.md)**: Hands-on user guide with full command options, flag reference, and Bash/`jq` automation recipes.
* **[`MODERN_CLI_DOCUMENTATION.md`](./docs/MODERN_CLI_DOCUMENTATION.md)**: Modern CLI architecture, OpenAPI spec engine, and Old vs. New feature comparison table.
* **[`ARCHITECTURAL_DECISIONS.md`](./docs/ARCHITECTURAL_DECISIONS.md)**: Architectural Decision Records (ADRs 001 - 006) covering session key security, offline spec bundling, and zero-drift GitHub Actions workflows.
* **[`OLD_CLI_DOCUMENTATION.md`](./docs/OLD_CLI_DOCUMENTATION.md)**: Legacy REPL CLI documentation and critique.

---

---

## License Notice

This project is a proof of concept provided for evaluation purposes.

See [LICENSE](LICENSE).
