# Paystack Scriptable CLI (`paystack-cli`)

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Commander.js](https://img.shields.io/badge/Commander.js-v11-blue?style=flat-square)](https://github.com/tj/commander.js)

A high-performance, scriptable Command Line Interface (CLI) for the Paystack API ecosystem. Built with Commander.js, TypeScript, and V8 native JSON parsing, this tool provides a non-interactive, CI/CD-friendly CLI interface powered directly by the enriched OpenAPI 3.0 specification (`paystack-spec-enriched`).

---

## Key Features

- **Non-Interactive CI/CD Native**: Designed for shell scripting, automated pipelines, and non-interactive execution.
- **Enriched Spec Source of Truth**: Dynamically executes operations and validates inputs against `paystack-spec-enriched`.
- **Automated Update Notification**: Non-blocking background updater that checks NPM for spec/CLI releases without delaying execution.
- **Zero-Dependency Webhook Engine**: Built-in local proxy and webhook listener engine for testing events without external tunneling services.

---

## Getting Started

### Installation

```bash
git clone https://github.com/Alex-Muturi/paystack-cli.git
cd paystack-cli
npm install
npm run build
```

---

## License & Assessment Notice

This repository was created by Alex Muturi as part of the technical assessment for the DevEx Lead position at Paystack.

This project is licensed under the [Candidate Assessment License](LICENSE) strictly for candidate evaluation and review purposes. All rights to production deployment, commercial usage, or integration into Paystack/Stripe products are reserved pending employment or licensing agreements.
