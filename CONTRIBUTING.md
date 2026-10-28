# Contributing

Thanks for your interest in contributing! This guide applies across CueLABS™
repositories, which share a common structure and conventions.

## Getting started

1. Fork and clone the repository.
2. Create a feature branch: `git checkout -b feature/short-description`.
3. Read `README.md` for repository-specific prerequisites.
4. Copy `.env.example` to `.env` when the repository provides one, then supply
   development-safe values. Never reuse production secrets.
5. Run `make help` to discover the supported setup, development, lint, and test
   targets, then run the targets relevant to your change.

## Repository layout

CueLABS™ repositories follow a shared standard:

- `api/common` — Go backend (auth + core API)
- `api/<service>` — additional services, named by function
- `web` — Next.js web + dashboard
- `mobile/flutter` — Flutter mobile app
- `deploy`, `docs`, `scripts`

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.

## Before opening a pull request

- Run the relevant lint and tests for the area you changed.
- Do **not** commit secrets, credentials, or `.env` files.
- Fill out the pull request template and link any related issues.
- Keep PRs focused; smaller PRs review faster.

## Code review

At least one approving review from a [CODEOWNER](CODEOWNERS) is required before
merge. Be responsive to review feedback.

## Code of Conduct

Participation is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).
