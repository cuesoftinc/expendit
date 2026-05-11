# DevOps

## Repo Restructure — Monorepo Migration

**Author:** @adeboyefrancis  
**Date:** May 11 2026  
**Branch:** `feature/refactor-repo`

---

### Overview

The repository was migrated from a flat, ad-hoc layout to a standard open-source monorepo structure to support scaling across multiple API SDKs, web apps, and mobile targets.

---

### Before and After

| Old path | New path | Notes |
|---|---|---|
| `Home/` | `web/` | Next.js root app |
| `App/` | `web/dashboard/` | Next.js dashboard app |
| `App/k8s/` | `deploy/k8s/` | Extracted from frontend — infra doesn't belong in app folder |
| `CommonServer/` | `api/nodejs/` | Node.js backend API |
| `Deploy/` | `deploy/` | Lowercase convention |
| `Docs/` | `docs/` | Lowercase convention |
| `compose.yaml` | `deploy/docker/compose.yaml` | Moved into infra structure |

**New directories created:**

```
api/go/              # Future Go SDK (stub)
api/python/          # Future Python SDK (stub)
deploy/helm/         # Helm charts
deploy/terraform/    # Terraform modules
web/supabase/        # Supabase config, migrations, types
web/shared/context/  # Shared React context between web apps
app/android/         # Future Android app (stub)
app/ios/             # Future iOS app (stub)
app/flutter/         # Future Flutter app (stub)
scripts/             # DevOps and CI utility scripts
```

---

### Final Structure

```
/
├── api/
│   ├── go/
│   ├── python/
│   └── nodejs/
├── docs/
├── deploy/
│   ├── docker/
│   ├── helm/
│   ├── k8s/
│   └── terraform/
├── scripts/
├── web/
│   ├── / (root app — expendit-home)
│   ├── /dashboard  (expendit-app)
│   ├── /shared     (shared context, types)
│   └── /supabase
├── app/
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
```

---

### Migration Script

The migration is repeatable and documented at `scripts/refactor_repo.sh`. It handles directory moves, k8s extraction, dotfile moves, and root `package.json` path fixes in a single idempotent run.

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

---

### Root package.json

Stripped down to workspace orchestration only. Husky `prepare` script remains. All `lint`, `build`, `test`, and `dev` scripts delegate to workspaces via `npm-run-all`:

```json
{
  "scripts": {
    "prepare": "husky install || true",
    "dev": "npm-run-all --parallel dev:api dev:web dev:dashboard",
    "build": "npm-run-all build:api build:web build:dashboard",
    "test": "npm-run-all test:api test:web test:dashboard",
    "lint": "npm-run-all lint:api lint:web lint:dashboard"
  }
}
```
---

### Port Allocation

| Service | Port | Notes |
|---|---|---|
| `web/` (root app) | 3000 | Default Next.js port |
| `web/dashboard/` | 3001 | Set explicitly in `package.json` dev script |
| `api/nodejs/` | TBD | Set in `api/nodejs/` config |

To avoid port conflicts, `web/dashboard/package.json` should have:
```json
"dev": "next dev --port 3001",
"start": "next start --port 3001"
```

---

### Stub Directories

Empty placeholder directories have a `README.md` stub so Git tracks them on clone:

```
api/go/README.md
api/python/README.md
app/android/README.md
app/ios/README.md
app/flutter/README.md
scripts/README.md
```

When a new SDK or mobile app is ready to be built out, the stub is replaced with real source code. No restructuring needed — the slots are already in place.
