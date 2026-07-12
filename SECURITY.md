# Security Policy

The Expendit team takes the security of our software seriously. Thank you for
helping keep Expendit and its users safe.

## Supported Versions

Expendit is under active development. Security fixes are applied to the latest
released version and the `main` branch.

| Version        | Supported          |
| -------------- | ------------------ |
| `main` (latest)| :white_check_mark: |
| Older releases | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

Instead, report them privately using one of the following channels:

- Email **security@cuesoftinc.com** (or **hello@cuesoftinc.com**), or
- Use GitHub's [private vulnerability reporting](https://github.com/cuesoftinc/expendit/security/advisories/new).

Please include as much of the following as you can:

- The type of issue (e.g. authentication bypass, injection, secret exposure)
- Affected component (`api/common`, `web`, etc.) and version/commit
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code, if available
- The potential impact, including how an attacker might exploit it

## Disclosure Process

1. You report the vulnerability privately using a channel above.
2. We acknowledge receipt within **3 business days**.
3. We investigate, confirm the issue, and determine affected versions.
4. We prepare and test a fix, then release it as soon as practical.
5. We publicly disclose the issue and credit the reporter, unless you prefer to
   remain anonymous.

Please give us a reasonable amount of time to resolve the issue before any public
disclosure. We are committed to working with security researchers acting in good
faith.

## Secrets and Configuration

Never commit secrets (API keys, tokens, credentials, `.env` files) to the
repository. Use the provided `.env.example` files as templates and keep real
values out of version control. If you discover a leaked secret, report it through
the channels above so it can be rotated.
