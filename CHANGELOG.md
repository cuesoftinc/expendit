# Changelog

All notable changes to Expendit are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Standardized repository structure and shared CueLABS community-health files
  (SECURITY, CODE_OF_CONDUCT, CONTRIBUTING, CODEOWNERS, PR/issue templates), a
  scoped Dependabot config, `deploy/{docker,helm,terraform}`, and
  `docs/overview.md` + `docs/setup.md`.

### Changed
- Rewrote README/CONTRIBUTING to match the real stack (Go + Gin + MongoDB,
  Next.js); aligned `.gitignore`, `.editorconfig`, and `.dockerignore` to the
  shared standard.
- Fixed the Makefile to use Go tooling (it previously invoked npm against the Go
  service) and corrected CODEOWNERS.

### Removed
- GitHub Actions CI workflow and a committed `api/common/main.exe` build artifact.

### Security
- Migrated auth from the abandoned `dgrijalva/jwt-go` to `golang-jwt/jwt/v4` and
  added JWT signing-method validation.
- Bumped `golang.org/x/crypto` (critical advisories) and `excelize`; applied
  non-breaking npm fixes and pinned `postcss`.
