# Paystack CLI - Architecture & Security Decisions

This document details the core architectural decisions, security models, trade-offs, and design patterns governing the modernized **Paystack CLI**.

---

## ADR-001: Automatic Key Retrieval & Session Security Architecture

### Context & Problem
In the legacy CLI (or manual API workflows), developers were forced to manually locate, copy, paste, and pass their secret API keys (`sk_test_...` or `sk_live_...`) into environment variables or CLI flags. This introduced friction, shell history leaks, and accidental commits of production secret keys to version control repositories.

### Decision
Implement **Automatic Secret Key Resolution** powered by session token authentication.

```
┌─────────────────────────┐         1. paystack-cli login      ┌──────────────────────────┐
│   ~/.config/paystack/   ├───────────────────────────────────►│ Paystack Auth Endpoint   │
│       config.json       │◄───────────────────────────────────┤ (Obtains Session Token)  │
└────────────┬────────────┘         2. Store JWT Token         └──────────────────────────┘
             │
             │                      3. Execute API Command
             ▼                   (paystack-cli api transaction list)
┌─────────────────────────┐                                    ┌──────────────────────────┐
│   lib/helpers.js        ├───────────────────────────────────►│ Paystack Key Endpoint    │
│  (helpers.getKeys)      │     4. Auto-Fetch Secret Key       │ (/integration/keys)      │
└────────────┬────────────┘◄───────────────────────────────────┴──────────────────────────┘
             │
             │                      5. Perform Authorized API Request
             ▼                   (Header: Authorization: Bearer sk_test_...)
┌─────────────────────────┐
│ Paystack Core REST API  │
└─────────────────────────┘
```

#### How It Works
1. Upon running `paystack-cli login`, the CLI authenticates against Paystack and securely stores a session JWT token in `~/.config/paystack/config.json`.
2. When any API command is executed (e.g. `paystack-cli api transaction verify --reference ref123`), `lib/helpers.js` invokes `helpers.getKeys()`.
3. `helpers.getKeys()` queries the official Paystack key resolution endpoint (`https://api.paystack.co/integration/keys`) using the session token.
4. The backend returns the valid secret key matching the selected business integration and active environment domain (`test` or `live`).
5. The CLI automatically attaches `Authorization: Bearer <secret_key>` to the HTTP request and disposes of the secret key in memory.

### Security Guarantees & Assessment

| Security Property | Implementation Detail | Guarantee |
| :--- | :--- | :--- |
| **OS Permission Isolation** | Stored in `~/.config/paystack/config.json` | Access restricted to the OS user account (`0600` permissions) |
| **No Workspace Pollution** | Credentials isolated outside workspace directory | Impossible to commit secret keys to git repositories |
| **Domain Safety** | Strict `--domain test` / `--domain live` isolation | Prevents accidental live account mutation during test runs |
| **Zero Memory Persistence** | Keys fetched ephemerally per request execution | Secret keys are not written to disk in plaintext |

---

## ADR-002: Framework Migration from Vorpal REPL to Commander CLI

### Context & Problem
The legacy CLI used `vorpal`, an interactive shell framework (`paystack $`). While interactive prompts are user-friendly for manual experimentation, they block standard command execution in terminals, shell scripts (Bash/Zsh), Makefiles, and CI/CD automation pipelines (GitHub Actions).

### Decision
Migrate the entire CLI entry point to [`commander`](https://github.com/tj/commander.js).

### Benefits & Architectural Impact
* **Unix Philosophy Composability**: Commands execute as one-shot processes, writing output to `stdout` and errors to `stderr`.
* **Standard Exit Codes**: Exits with code `0` on success and `1` on failure, allowing conditional shell execution (`&&`, `||`).
* **Non-Interactive & CI/CD Native**: Commands like `paystack-cli status --json` or `paystack-cli webhook trigger charge.success` run headlessly in scripts without waiting for user keyboard input.

---

## ADR-003: Native Enriched OpenAPI 3.0 Engine & Decoupled Bundled Artifacts

### Context & Problem
Directly linking to external local repository paths or making runtime network calls to external GitHub repositories creates tight coupling, network latency, and offline fragility.

### Decision
Adopt a **Decoupled Bundled Spec Architecture**:
1. `paystack-cli` bundles its own internal copy (`lib/paystack/openapi.json`).
2. At runtime, all commands read exclusively from this bundled local file (or user config `~/.config/paystack/openapi.json`). Zero runtime network requests are made to GitHub.
3. When `paystack-spec-enriched` releases a new spec version, a GitHub Actions workflow (`.github/workflows/sync-enriched-spec.yml`) runs in `paystack-cli`, updates `lib/paystack/openapi.json`, and opens a PR.

### Architectural Implementation
* **Single Source of Truth via Release Artifacts**: The CLI repository holds its own copy `lib/paystack/openapi.json` synced via GitHub Actions.
* **Enriched Metadata Extraction**: `lib/openApiParser.js` parses metadata extensions added by `paystack-spec-enriched`:
  * `x-operation-id`: 100% clean camelCase subcommand mapping (`initialize`, `verify`, `create`, `initiate`).
  * `x-idempotency: true`: Flags financial mutation endpoints for idempotency header injection.
  * `x-pagination`: Configures pagination parameters.
  * `x-retry-safe: true` / `x-dont-retry: true`: Guides resilient HTTP execution loops.
* **Offline-First Execution**: `paystack-cli openapi sync` syncs user config from the bundled `lib/paystack/openapi.json` without requiring internet connectivity.

---

## ADR-004: Zero-Dependency Webhook Proxy & Cryptographic Event Engine

### Context & Problem
Testing local webhooks required `ngrok`, introducing third-party account friction, token setup dependencies, and external network instability. Furthermore, payload generation lacked authentic cryptographic signature verification.

### Decision
Replace `ngrok` with a zero-dependency/config localtunnel proxy engine and built-in HMAC SHA-512 cryptographic payload generator.

> **Paystack should consider hosting localtunnel or create a websocket tunnelling for total zero-depedency**

### Architectural Features
* **`paystack-cli webhook trigger [event]`**:
  * Loads pre-defined Paystack event fixtures (`charge.success`, `transfer.success`, `subscription.create`, etc.).
  * Generates genuine HMAC SHA-512 signatures computed over the raw JSON payload using the active integration secret key.
  * Sets the `x-paystack-signature` HTTP header and POSTs directly to local server endpoints (e.g., `http://localhost:3000/api/webhook`).
* **`paystack-cli webhook listen`**:
  * Spins up a lightweight internal Node.js HTTP proxy server (`lib/helpers.js`).
  * Intercepts, logs, inspects, and forwards external or local webhook requests without requiring external tunneling software.

---

## ADR-005: Workspace Hygiene & Centralized Configuration Storage

### Context & Problem
The legacy CLI stored configuration in `db.json` inside whichever current working directory (`process.cwd()`) the user executed the CLI from.

### Decision
Centralize all CLI storage in system-standard user home directories (`~/.config/paystack/config.json`).

### Architectural Benefits
* **Clean Working Tree**: Project repositories remain untouched.
* **Global Session State**: Authenticating once via `paystack-cli login` allows executing `paystack-cli` commands across any project directory on the machine.
* **Lowdb Integration**: Refactored `lib/db.js` to ensure directory auto-creation and safe atomic JSON reads and writes.

---

## ADR-006: Diagnostic Observability & `--json` Format Standard

### Context & Problem
The legacy CLI offered no commands to check current authentication state, active business name, or domain settings. Output formatting was unstructured string logs.

### Decision
Introduce `paystack-cli status`, `paystack-cli config`, and mandate `--json` flag support across all commands.

### Architectural Impact
* **`paystack-cli status`**: Displays active account email, business integration name/ID, token expiration, domain (`test`/`live`), and config file path.
* **Machine-Readable Piping**: Passing `--json` outputs raw JSON payloads directly to `stdout`, enabling seamless piping into CLI utilities like `jq`:
  ```bash
  paystack-cli api transaction list --json | jq '.data[] | {id: .id, amount: .amount}'
  ```

---

## ADR-007: Self-Reporting Package & Spec Update Notifications

### Context & Problem
Previously, users had to manually run `paystack-cli openapi sync` to check for specification updates. This created version drift, confusing developer workflows, and disconnected CLI binary releases from the bundled OpenAPI specification.

### Decision
Implement **Self-Reporting Package Update Notifications** in `lib/helpers.js` that periodically check the NPM registry for `@paystack-oss/dev-cli` updates.

### Key Guarantees & Features
* **Zero Runtime Overhead & 24h Throttle**: The CLI checks NPM at most once every 24 hours (`lastUpdateCheck` timestamp saved in `~/.config/paystack/config.json`).
* **Non-Blocking & Fail-Silent**: Network timeouts or offline usage fail completely silently without delaying or interrupting command execution.
* **Automation & Script Safety**: Update notifications are automatically suppressed if `--json` is passed, if running non-interactively (`!stdout.isTTY`), or in CI environments (`process.env.CI`).
* **Unified Versioning**: Updating `@paystack-oss/dev-cli` via NPM (`npm install -g @paystack-oss/dev-cli`) updates both the CLI binary and the bundled OpenAPI specification atomically.

