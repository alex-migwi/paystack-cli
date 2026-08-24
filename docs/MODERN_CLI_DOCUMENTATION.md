# Modernized Paystack CLI Documentation

The **Modernized Paystack CLI** is a robust, developer-first command-line tool modeled after modern CLI standards (`stripe-cli`). It replaces REPL prompts with standard scriptable subcommands, integrates the official **Paystack Enriched OpenAPI 3.0 specification** ([`paystack-spec-enriched`](https://github.com/PaystackOSS/paystack-spec-enriched)), eliminates 3rd-party tunneling dependencies, and secures workspace configuration in system-standard directories.

---

## 1. Key Modernization Improvements

* **Standard Scriptable CLI (`commander`)**: Execute commands directly from Bash, Zsh, Makefiles, or CI/CD pipelines (`paystack status`, `paystack webhook trigger charge.success`, `paystack config list`).
* **Official Enriched OpenAPI Specification Engine**: Powered by [`paystack-spec-enriched`](https://github.com/PaystackOSS/paystack-spec-enriched) with **40.3x faster native V8 JSON parsing** (`lib/paystack/openapi.json`), serving **125 endpoints across 27 API resources** with flags, types, idempotency defaults (`x-idempotency`), auto-retry hints (`x-retry-safe`), and pagination metadata (`x-pagination`).
* **Zero-Dependency Local Webhook Engine**: No `ngrok` or 3rd-party accounts required. Trigger signed HMAC SHA-512 payloads directly to local endpoints (`paystack webhook trigger`) or run a local proxy listener (`paystack webhook listen`).
* **Secure Home Directory Configuration**: Stores active tokens and preferences in `~/.config/paystack/config.json`, keeping local project repositories clean.
* **Diagnostics & Inspection**: Dedicated `paystack status` and `paystack config` commands with full `--json` support for machine-readable piping (`jq`).

---

## 2. Command Reference

### Authentication & Account Status

#### `paystack login`
Sign in with your Paystack credentials and select an active business integration.
```bash
paystack login
```

#### `paystack logout`
Sign out and purge saved credentials from `~/.config/paystack/config.json`.
```bash
paystack logout
```

#### `paystack status`
Display authentication status, active business name & ID, environment domain (`test` / `live`), token expiry, and configuration file path.
```bash
paystack status
paystack status --json
```

---

### Webhook Engine & Forwarding (Zero-Dependency)

#### `paystack webhook trigger [event]` (Alias: `paystack webhook ping`)
Simulate a Paystack webhook event, compute an authentic HMAC SHA-512 signature (`x-paystack-signature`), and POST the payload directly to a local development endpoint.
```bash
# List all available mock webhook events
paystack webhook trigger --list

# Trigger a charge.success event to a local app route
paystack webhook trigger charge.success --forward-to http://localhost:3000/api/paystack-webhook

# Supply a custom secret key and output raw response JSON
paystack webhook trigger transfer.success --forward-to http://localhost:8000/webhooks --secret sk_test_12345 --json
```

#### `paystack webhook listen`
Run a lightweight local proxy server that receives, inspects, logs, and forwards webhooks to your application route.
```bash
paystack webhook listen --port 7777 --forward-to http://localhost:3000/api/paystack-webhook
```

---

### Configuration Management (`paystack config`)

Manage CLI settings stored in `~/.config/paystack/config.json`.

```bash
# View all configurations
paystack config list
paystack config list --json

# Read a specific key
paystack config get domain

# Set a configuration setting
paystack config set domain test
paystack config set domain live
```

---

### OpenAPI Engine Management (`paystack openapi`)

Inspect and synchronize the CLI's user configuration with the bundled enriched OpenAPI specification.

```bash
# View active OpenAPI specification details
paystack openapi info
paystack openapi info --json

# Synchronize user configuration with CLI bundled artifact (lib/paystack/openapi.json)
paystack openapi sync

# Import a custom local or remote OpenAPI 3.0 spec (JSON or YAML)
paystack openapi import ./my-custom-paystack-spec.json
paystack openapi import https://example.com/openapi.json
```

---

### Dynamic API Resource Commands (`paystack api`)

Dynamically execute requests against all Paystack resources defined in the OpenAPI specification:
`transaction`, `charge`, `bulkcharge`, `subaccount`, `split`, `terminal`, `virtualterminal`, `customer`, `directdebit`, `dedicatedvirtualaccount`, `applepay`, `plan`, `subscription`, `transferrecipient`, `transfer`, `balance`, `paymentrequest`, `product`, `storefront`, `order`, `page`, `settlement`, `integration`, `refund`, `dispute`, `bank`, `miscellaneous`.

```bash
# View all subcommands for a resource
paystack api transaction --help

# Verify a transaction via OpenAPI engine
paystack api transaction verify --reference qTPrJoy9Bx --json

# Initialize a payment
paystack api transaction initialize --email customer@example.com --amount 50000 --domain test

# Raw HTTP shortcuts
paystack get transaction/verify/qTPrJoy9Bx
paystack post transaction/initialize --domain test
```

---

### Starter Samples (`paystack samples`)

Browse and clone Paystack starter sample applications into local directories.

```bash
# List available starter templates
paystack samples list

# Clone a sample project
paystack samples create sample_vue my-paystack-app
```

---

## 3. Comparison: Legacy CLI vs. Modern CLI

| Feature / Capability | Legacy CLI (v0.0.7) | Modernized CLI | Developer Impact |
| :--- | :--- | :--- | :--- |
| **CLI Architecture** | Interactive REPL (`vorpal`) | One-shot subcommands (`commander`) | Compatible with shell scripts, Makefiles, and CI/CD pipelines |
| **API Specification** | Static custom `apis.js` | Official [`paystack-spec-enriched`](https://github.com/PaystackOSS/paystack-spec-enriched) | 100% API coverage (125 paths, 27 resources) synced with Paystack docs |
| **Parsing Engine** | Plain JS object mapping | Native V8 JSON engine (`openapi.json`) | 40.3x faster startup performance (~360ms total command execution) |
| **Webhook Tunneling** | Requires 3rd-party `ngrok` | Zero-dependency local proxy & trigger engine | Works offline with zero 3rd-party friction or authtoken requirements |
| **Webhook Security** | Basic HMAC SHA-512 | Authentic HMAC SHA-512 (`x-paystack-signature`) | Tests real production signature verification locally |
| **Config Storage** | Local directory `./db.json` | System standard `~/.config/paystack/config.json` | Keeps code repos clean and prevents token leaks |
| **Diagnostics & Inspection** | None | `paystack status` & `paystack config` | Instantly check active business, token expiry, and domain |
| **Machine Readability** | Plain console text | `--json` flag on all major commands | Seamless integration with `jq` and automated automation scripts |
| **Spec Management** | Manual file updates | `paystack openapi sync` & GitHub Actions auto-sync | Automated zero-drift updates via release triggers |

---

## 4. Developer Experience (DevEx) & CI/CD Workflow

### Non-Interactive CI/CD Example (GitHub Actions)
```yaml
name: Test Webhook Integration
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g @paystack-oss/dev-cli
      - run: paystack status --json
      - run: paystack webhook trigger charge.success --forward-to http://localhost:3000/api/webhook
```

### Local Development Flow
```bash
# 1. Inspect CLI status
paystack status

# 2. Trigger mock event to local Next.js/Express server
paystack webhook trigger charge.success --forward-to http://localhost:3000/api/paystack-webhook

# 3. Perform API query and output formatted JSON
paystack api transaction list --json | jq '.data[0]'
```
