# Security Policy

## Supported Versions

Security fixes are applied to the `main` branch. Deployed environments are
expected to track `main`.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Report privately using GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
(the **Security → Report a vulnerability** tab), or email the maintainers listed
in CODEOWNERS.

Please include a description and impact, steps to reproduce, and the affected
component. We aim to acknowledge within 3 business days.

## Handling of Secrets

- Never commit credentials, service-account keys, or `.env` files. These are
  covered by `.gitignore` and `.dockerignore`.
- Supply configuration at runtime via environment variables or a secret
  manager — never baked into an image.
