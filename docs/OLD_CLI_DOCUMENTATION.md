# Legacy Paystack CLI Documentation (v0.0.7)

This document provides a comprehensive overview of the original **Paystack CLI** architecture prior to its modernization.

---

## 1. Overview & Architecture

The legacy Paystack CLI was built as an **interactive REPL (Read-Eval-Print Loop) shell** powered by [`vorpal`](https://github.com/dthree/vorpal). 

When launched, instead of executing standard shell one-liners, it started a custom interactive terminal prompt (`paystack $`):

```bash
$ paystack
paystack $ 
```

### Architecture Components
* **REPL Framework**: `vorpal` (v1.12.0)
* **Local Storage**: `lowdb` writing to `db.json` in the current working directory (`process.cwd()`)
* **Tunneling**: `ngrok` (v5.0.0-beta.2)
* **API Definitions**: Custom static JavaScript file (`lib/paystack/apis.js`)

---

## 2. Legacy Command Reference

Inside the interactive `paystack $` prompt, the following commands were available:

### Authentication & Account
* **`login`**: Interactively prompts for email and password. Executes authentication against Paystack backend, receives a JWT token, and fetches integration details.
* **`select_integration`**: Prompts the user to select an active business integration from a numbered list.

### Webhook & Tunneling
* **`listen`**: Starts an `ngrok` HTTP tunnel forwarding external webhook traffic to a local port (default: 3000).
* **`ping [event]`**: Calculates an HMAC SHA-512 signature (`x-paystack-signature`) for sample event payloads and POSTs them to a specified URL.

### Sample Applications
* **`samples`**: Clones sample GitHub repositories (`sample-vue`, `sample-react`, `sample-gift-store`, `Kix`) and attempts to run `npm start` / `yarn start` directly inside the CLI process.

### API Resource Commands
Dynamically generated subcommands under `api` based on static `lib/paystack/apis.js`:
* **`api <command> [options]`**: Runs API endpoints mapped in `apis.js` (e.g. `subaccount`, `customer`, `transaction`, `plan`).

---

## 3. The Good, The Bad, and The Ugly

### The Good
* **ES Module Foundation**: Configured `"type": "module"` in `package.json`, keeping module loading modern.
* **Declarative Endpoint Mapping**: Grouped API resources in `apis.js` instead of writing individual wrapper functions for every endpoint.
* **Webhook Hashing**: Implemented cryptographic HMAC SHA-512 calculation for event verification.

### The Bad
* **Vorpal REPL Lock-In**: Required users to enter an interactive REPL shell. This blocked non-interactive script execution in Bash, Zsh, GitHub Actions, and CI/CD pipelines (`paystack status` was impossible in a standard script).
* **Ngrok Dependency Friction**: Required users to sign up for third-party `ngrok` accounts, configure authtokens, and rely on external server status for local webhook testing.
* **Workspace Contamination (`db.json`)**: Wrote `db.json` directly into whatever directory the CLI was executed from, polluting code repositories and risking accidental commits of sensitive tokens.

### The Ugly
* **Security & Credential Risks**: Plaintext storage of JWT tokens, user email, and business integration IDs inside local project directories.
* **Path Parameter Parsing Bugs**: The path parameter replacer in `lib/helpers.js` used fragile string slicing (`endpoint.slice(endpoint.indexOf('{') + 1, endpoint.indexOf('}'))`), causing failures on URLs with multiple or complex parameter names.
* **Blocking Subprocesses**: Running sample starter commands invoked blocking `npm start` subprocesses directly inside the CLI session, freezing the prompt.

---

## 4. Summary of Legacy Limitations

| Area | Legacy CLI Behavior | Impact |
| :--- | :--- | :--- |
| **Execution Model** | Interactive REPL (`paystack $`) | Incompatible with terminal scripts, Makefiles, and CI/CD |
| **Tunneling** | Third-party `ngrok` dependency | External account friction, bandwidth limits |
| **Config Path** | `./db.json` in local working folder | Pollutes git repos with plaintext credentials |
| **API Schema** | Hand-maintained `apis.js` | Out of sync with official Paystack documentation |
| **Diagnostics** | No `status` or `config` commands | Developers could not inspect session or integration state |
