# Paystack CLI - User Guide & Command Reference

A complete hands-on guide for building, testing, and managing Paystack integrations directly from your terminal.

---

## Table of Contents
1. [Installation & Setup](#1-installation--setup)
2. [Authentication (`paystack-cli login`, `logout`, `status`)](#2-authentication)
3. [Configuration Management (`paystack-cli config`)](#3-configuration-management)
4. [OpenAPI Engine (`paystack-cli openapi`)](#4-openapi-engine)
5. [Executing API Operations (`paystack-cli api`, `get`, `post`)](#5-executing-api-operations)
6. [Webhook Testing & Proxying (`paystack-cli webhook`)](#6-webhook-testing--proxying)
7. [Starter Sample Projects (`paystack-cli samples`)](#7-starter-sample-projects)
8. [Scripting Recipes & Piping (`--json` & `jq`)](#8-scripting-recipes--piping)

---

## 1. Installation & Setup

Ensure Node.js (v18+) is installed on your system.

```bash
# Clone and install globally or link locally
cd paystack-cli
npm install
npm link

# Verify installation
paystack-cli --version
```

---

## 2. Authentication

The CLI automatically retrieves your integration API secret keys (`test` or `live`) upon login so you never need to hardcode API secret keys in bash scripts or source code.

### `paystack-cli login`
Interactively authenticates your Paystack account and stores session credentials securely in `~/.config/paystack/config.json`.

```bash
paystack-cli login
```
* **Interactive Prompts**: Prompts for your Email, Password, and active business integration if multiple exist.

---

### `paystack-cli logout`
Removes saved authentication tokens and integration details from `~/.config/paystack/config.json`.

```bash
paystack-cli logout
```

---

### `paystack-cli status`
Displays your current login account, active business name & ID, environment domain (`test`/`live`), token expiration time, and configuration file path.

```bash
# Human-readable table
paystack-cli status

# Machine-readable JSON output
paystack-cli status --json
```

---

## 3. Configuration Management

Manage CLI preferences stored in `~/.config/paystack/config.json`.

### Options & Subcommands

| Command | Usage | Description |
| :--- | :--- | :--- |
| `paystack-cli config list` | `paystack-cli config list [--json]` | List all saved configuration settings |
| `paystack-cli config get` | `paystack-cli config get [key] [--json]` | Retrieve a specific setting key |
| `paystack-cli config set` | `paystack-cli config set <key> <value>` | Update a configuration setting |

### Examples

```bash
# List all settings
paystack-cli config list

# Switch default domain environment to 'test' or 'live'
paystack-cli config set domain test
paystack-cli config set domain live

# Get current domain setting
paystack-cli config get domain
```

---

## 4. OpenAPI Engine & Auto-Reporting Package Updates

Inspect and manage the OpenAPI 3.0 specification powering the CLI.

> [!NOTE]
> **Automatic Spec Updates**: The CLI bundles the enriched OpenAPI specification directly inside `@paystack-oss/dev-cli`. Updating the CLI package via NPM (`npm install -g @paystack-oss/dev-cli`) automatically updates the OpenAPI spec. The CLI periodically (every 24 hours) checks NPM in the background and notifies you when an update is available.

### Subcommands

#### `paystack-cli openapi info`
Shows details about the active OpenAPI specification (title, version, source location, total path count, and total operation count).

```bash
paystack-cli openapi info
paystack-cli openapi info --json
```

#### `paystack-cli openapi sync` (Alias: `update`)
Resets local specification configuration back to the CLI's bundled release spec (`lib/paystack/openapi.json`).

```bash
paystack-cli openapi sync
```

#### `paystack-cli openapi import <source>` *(Advanced / Dev Tool)*
Imports a local or remote OpenAPI 3.0 specification file (YAML or JSON format). Designed for API engineers testing unreleased endpoint branches.

```bash
# Import from a local file
paystack-cli openapi import ./custom-spec.yaml

# Import from a remote URL
paystack-cli openapi import https://example.com/paystack-openapi.json
```

---

## 5. Executing API Operations

The CLI dynamically builds subcommands for all **Paystack API resources** (`transaction`, `customer`, `subaccount`, `plan`, `subscription`, `transfer`, `refund`, `verification`, `bank`, `dispute`, `terminal`, etc.).

### Command Structure
```bash
paystack-cli api <resource> <action> [options]
```

### Global Options for API Commands
* `--domain <domain>`: Override environment domain (`test` or `live`). Defaults to configured domain.
* `--json`: Output raw response JSON directly to stdout.

---

### Transaction Operations (`paystack-cli api transaction`)

#### 1. Initialize Payment (`initialize`)
```bash
paystack-cli api transaction initialize \
  --email "customer@example.com" \
  --amount 50000 \
  --currency "NGN" \
  --domain test
```

#### 2. Verify Transaction (`verify`)
```bash
paystack-cli api transaction verify \
  --reference "qTPrJoy9Bx" \
  --json
```

#### 3. List Transactions (`list`)
```bash
paystack-cli api transaction list \
  --perPage 10 \
  --page 1 \
  --status success
```

---

### Customer Operations (`paystack-cli api customer`)

#### 1. Create Customer (`create`)
```bash
paystack-cli api customer create \
  --email "user@example.com" \
  --first_name "Alex" \
  --last_name "Muturi" \
  --phone "0712345678"
```

#### 2. Fetch Customer (`fetch`)
```bash
paystack-cli api customer fetch \
  --email_or_code "CUS_qo38as2hpsgk2r0"
```

---

### Subaccount Operations (`paystack-cli api subaccount`)

#### 1. Create Subaccount (`create`)
```bash
paystack-cli api subaccount create \
  --business_name "Partner Store" \
  --settlement_bank "058" \
  --account_number "0123456789" \
  --percentage_charge 15.5
```

---

### Raw HTTP Shortcuts (`paystack-cli get` & `paystack-cli post`)

Perform arbitrary REST requests directly to any endpoint without selecting a resource action:

```bash
# Raw GET
paystack-cli get transaction/verify/qTPrJoy9Bx --domain test

# Raw POST
paystack-cli post transaction/initialize --domain test
```

---

## 6. Webhook Testing & Proxying

Test and debug webhooks locally without relying on third-party tunneling services (`ngrok`).

### `paystack-cli webhook trigger [event]` (Alias: `paystack-cli webhook ping`)
Simulates a Paystack event payload, calculates an authentic HMAC SHA-512 signature (`x-paystack-signature`), and POSTs it directly to your local route.

#### Options
* `--forward-to <url>`: Target URL to deliver webhook (default: `http://localhost:3000/api/paystack-webhook`).
* `--secret <key>`: Paystack secret key for HMAC calculation.
* `--domain <domain>`: Environment domain (`test` or `live`).
* `--list`: List all available event fixtures.
* `--json`: Output raw response JSON.

#### Examples
```bash
# List available mock event names
paystack-cli webhook trigger --list

# Trigger a charge.success event
paystack-cli webhook trigger charge.success \
  --forward-to http://localhost:3000/api/paystack-webhook

# Trigger a transfer.success event with custom target
paystack-cli webhook trigger transfer.success \
  --forward-to http://localhost:8080/webhooks
```

---

### `paystack-cli webhook listen`
Runs an internal local proxy server that intercepts, inspects, and forwards webhooks to your local app.

#### Options
* `--port <port>`: Local port to listen on (default: `7777`).
* `--forward-to <url>`: Target application URL (default: `http://localhost:3000/api/paystack-webhook`).

#### Example
```bash
paystack-cli webhook listen --port 7777 --forward-to http://localhost:3000/api/paystack-webhook
```

---

## 7. Starter Sample Projects

Browse and clone Paystack starter sample apps.

```bash
# List available sample repositories
paystack-cli samples list

# Clone a sample project into a custom folder
paystack-cli samples create sample_vue my-paystack-app
```

---

## 8. Scripting Recipes & Piping (`--json` & `jq`)

Because the modern CLI runs non-interactively and supports standard exit codes (`0` on success, `1` on failure), it integrates seamlessly into scripts and CI/CD pipelines.

### Recipe 1: Extract Verification Status with `jq`
```bash
STATUS=$(paystack-cli api transaction verify --reference "qTPrJoy9Bx" --json | jq -r '.data.status')
echo "Transaction Status: $STATUS"
```

### Recipe 2: Automated CI/CD Webhook Test (Bash Script)
```bash
#!/usr/bin/env bash
set -e

echo "Starting Webhook Verification Test..."
paystack-cli status --json

# Trigger mock event to local server
HTTP_CODE=$(paystack-cli webhook trigger charge.success --forward-to http://localhost:3000/api/webhook --json | jq -r '.status')

if [ "$HTTP_CODE" == "true" ]; then
  echo "✔ Webhook test passed!"
  exit 0
else
  echo "✖ Webhook test failed!"
  exit 1
fi
```
