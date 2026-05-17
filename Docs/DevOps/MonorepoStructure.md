# DevOps

## Repo Restructure — Monorepo Migration

**Author:** @adeboyefrancis  
**Date:** May 17 2026  
**Branch:** `feature/refactor`

---

### Overview

The repository was migrated from a flat, ad-hoc layout to a standard open-source monorepo structure to support scaling across multiple API SDKs, web apps, and mobile targets.

---

<!-- ### Before and After ( Bumped moving files and retained existing structure)

| Old path | New path | Notes |
|---|---|---|
| `Home/` | `web/` | Next.js root app |
| `App/` | `web/dashboard/` | Next.js dashboard app |
| `App/k8s/` | `deploy/k8s/` | Extracted from frontend — infra doesn't belong in app folder |
| `CommonServer/` | `api/nodejs/` | Node.js backend API |
| `Deploy/` | `deploy/` | Lowercase convention |
| `Docs/` | `docs/` | Lowercase convention |
| `compose.yaml` | `deploy/docker/compose.yaml` | Moved into infra structure | -->

**New directories created:**

```
deploy/docker/         # Dockerfiles
deploy/terraform/    # Terraform modules
Home/supabase/        # Supabase config, migrations, types
mobile/android/         # Future Android app (stub)
mobile/ios/             # Future iOS app (stub)
mobile/flutter/         # Future Flutter app (stub)
scripts/             # DevOps and CI utility scripts
```

---

### Final Structure

```
/
├── CommonServer/
│   ├── go/
│   
│   
├── docs/
├── deploy/
│   ├── docker/
│   ├── helm/
│   ├
│   └── terraform/
├── scripts/
├── Home/
│   ├── / (root app — expendit-home)
│   ├── /dashboard  (TBD -> Removed in the interim)
│   ├
│   └── /supabase
├── mobile/
│   ├── android/
│   ├── ios/
│   └── flutter/
├── LICENSE
├── CHANGELOG.md
├── README.md
├── CONTRIBUTING.md
├── CODEOWNERS
├── .gitignore
├── .dockerignore
├── .editorconfig
└── Makefile
└── dockercompose.yml
```

---

### Makefile

Replaced the root `package.json` scripts with a proper `Makefile` at the repo root. All workspace commands are now run via `make`.

**Key targets:**

| Target | What it does |
|---|---|
| `make install` | Install dependencies in all workspaces |
| `make dev` | Start all services in parallel |
| `make build` | Build all workspaces for production |
| `make test` | Run all test suites |
| `make lint` | Lint all workspaces |
| `make pre-push` | Run lint + test (used by Husky) |
| `make docker-up` | Start via Docker Compose |
| `make docker-up-d` | Start detached |
| `make docker-down` | Stop containers |
| `make docker-build` | Build Docker images |
| `make k8s-apply` | Apply Kubernetes manifests |
| `make k8s-delete` | Delete Kubernetes resources |
| `make k8s-status` | Show pod/deployment status |
| `make clean` | Remove all build artifacts and node_modules |
| `make help` | List all targets with descriptions |

Per-workspace targets also available: `make dev-api`, `make build-web`, `make test-dashboard` etc.

**Important — how compound targets work:**

Compound targets use Make dependencies, not recursive `make` calls. This prevents infinite loops:

```makefile
# Correct — Make resolves dependency graph once
build: build-api build-web build-dashboard
    @printf "✓ All builds complete"

# Wrong — spawns new make process, causes loops
build:
    make build-api
    make build-web
```
