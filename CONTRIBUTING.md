# Contributing to Expendit

Thank you for taking the time to contribute! 
We welcome all contributions — from fixing a typo to building new features.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Code of Conduct

This project follows a [Contributor Code of Conduct](./CODE_OF_CONDUCT.md).  
By participating, you agree to uphold it. Please report unacceptable behaviour to **hello@cuesoftinc.com**.

---

## How to Contribute

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/expendit.git
   cd expendit
   ```
3. **Add the upstream remote:**
   ```bash
   git remote add upstream https://github.com/cuesoftinc/expendit.git
   ```
4. **Create a branch** (see [Branch Naming](#branch-naming))
5. **Make your changes**, write tests where applicable
6. **Push** to your fork and open a **Pull Request**

---

## Project Structure

Each top-level folder is a self-contained workspace:

| Folder | Description |
|---|---|
| `api/go` | Go REST API |
| `api/python` | Python analytics service |
| `api/nodejs` | Node.js auth & webhook service |
| `app/flutter` | Flutter cross-platform app |
| `app/android` | Native Android app |
| `app/ios` | Native iOS app |
| `web/` | Next.js landing page |
| `web/dashboard` | Next.js web dashboard |
| `web/supabase` | Supabase migrations & config |
| `deploy/` | Docker, Helm, Terraform |
| `docs/` | Documentation |
| `scripts/` | Dev & CI scripts |

---

## Development Setup

```bash
# Install dependencies for all workspaces
make setup

# Start all services (requires Docker)
make dev

# Run tests across all services
make test

# Lint all services
make lint
```

See individual `README.md` files inside each workspace folder for service-specific instructions.

---

## Branch Naming

Use lowercase kebab-case with a prefix:

| Prefix | Use For |
|---|---|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `chore/` | Maintenance, tooling, config |
| `refactor/` | Code restructuring (no feature/fix) |
| `test/` | Adding or fixing tests |
| `ci/` | CI/CD pipeline changes |

**Examples:**
```
feat/expense-categories
fix/dashboard-date-filter
docs/api-authentication
```

---

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(optional scope): <short description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `perf`

**Examples:**
```
feat(flutter): add expense category screen
fix(api/go): handle nil pointer in expense handler
docs: update local development setup guide
chore: upgrade Node.js to v20
```

- Use present tense ("add feature" not "added feature")
- Keep the subject line under 72 characters
- Reference issues in the footer: `Closes #42`

---

## Pull Request Process

1. Ensure your branch is up to date with `main`:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```
2. Make sure all tests pass: `make test`
3. Make sure linting passes: `make lint`
4. Fill in the PR template completely
5. Request a review from at least one maintainer
6. A maintainer will merge once approved and CI passes

> **Do not** push directly to `main`. All changes must go through a PR.

---

## Code Style

| Service | Standard |
|---|---|
| Go | `gofmt`, `golint`, `go vet` |
| Python | PEP 8, `flake8`, `black` |
| Node.js / TypeScript | ESLint + Prettier (config in repo) |
| Flutter / Dart | `dart format`, `flutter analyze` |
| SQL | Lowercase keywords, snake_case identifiers |

---

## Reporting Bugs

Use the [Bug Report template](https://github.com/cuesoftinc/expendit/issues/new?template=bug_report.md).

Include:
- Steps to reproduce
- Expected vs actual behaviour
- Screenshots or logs if applicable
- Environment (OS, device, app version)

---

## Requesting Features

Use the [Feature Request template](https://github.com/cuesoftinc/expendit/issues/new?template=feature_request.md).

Include:
- The problem you're solving
- Your proposed solution
- Any alternatives you've considered
