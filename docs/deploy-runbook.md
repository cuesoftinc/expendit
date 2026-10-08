# Deploy Runbook — GCP + Aiven

> For the person deploying Expendit to the company's GCP project and Aiven
> account. It turns [deployment.md](deployment.md) and the
> [system design](system-design.md) §10 into steps. Everything in the repo
> is ready; the steps below are the parts only an account owner can do.
> Work through them in order: each part lists what to create and the exact
> names and values the code expects.

## 0. Read first: merging this branch changes the live website

The website rides **Firebase App Hosting rollouts from `main`**. After this
branch merges, App Hosting rebuilds `web/`, and how it behaves depends on
one build variable:

- **`NEXT_PUBLIC_TEST_MODE=1`**: the site runs on its built-in mock API,
  exactly as today. **Keep this set until the backend is deployed (§9).**
- **Unset**: the site signs in with Firebase and calls the real API. If
  the API or the Firebase config isn't there yet, sign-in and every
  dashboard screen fail.

So: merge, check the site still works in TEST_MODE, and only remove the
flag in §9.

## 1. What runs where

| Unit | Runs on | Image / source | Notes |
| --- | --- | --- | --- |
| `web` | Firebase App Hosting | `web/` from `main` | Proxies `/api/v1/*` to the API services (no browser CORS) |
| `expendit-api-common` | Cloud Run service | `cuesoft/expendit-api-common` | Go. The only Postgres client. Kafka consumers + outbox run in the background |
| `expendit-api-statements` | Cloud Run service | `cuesoft/expendit-api-statements` | Node upload gateway (`POST /api/v1/uploads`) |
| `expendit-api-analytics-extract` | Cloud Run service | `cuesoft/expendit-api-analytics` | Python, `ANALYTICS_POOL=extract`. Kafka only, no public traffic |
| `expendit-api-analytics-compute` | Cloud Run service | `cuesoft/expendit-api-analytics` | Python, `ANALYTICS_POOL=compute` |
| `expendit-sweep-{reaper,tmp-cleanup,retention}` | Cloud Run jobs + Cloud Scheduler | `cuesoft/expendit-api-common` | `./jobs <name>` |
| Postgres, Kafka, Redis | Aiven | — | |
| Object storage | the project's default Cloud Storage bucket | — | prefix `expendit/stg/` |

Images are built and deployed by `.github/workflows/release.yml` when a
`v*` tag is created (§7). **Your infrastructure code creates the resources;
the workflow only swaps their image digests.**

## 2. Firebase Auth (sign-in)

Google sign-in only (X-1). A Firebase project is the GCP project, so use
the same project as Cloud Run.

1. In the [Firebase console](https://console.firebase.google.com), add
   Firebase to the GCP project.
2. **Authentication → Sign-in method → Google → Enable.**
3. **Authentication → Settings → Authorized domains**: add the website's
   domain (`expendit.cuesoft.io`) and the backend's own App Hosting domain
   (`<backend>--<project>.<region>.hosted.app`, listed in App Hosting;
   wildcards aren't accepted). `localhost` is there by default.
4. **Project settings → Your apps → Add app → Web.** Note `apiKey`,
   `authDomain` and `projectId`; they go into §6. They are public by design.

The API verifies tokens against Google's public keys and the project ID,
so the services need **no Firebase key or service-account JSON**.

## 3. Aiven

### 3.1 Postgres

Use a dedicated database and a **non-superuser** role. Row-level security
(S-11) does not apply to superusers or roles with `BYPASSRLS`, and Aiven's
`avnadmin` should not run the app. As `avnadmin`:

```sql
CREATE ROLE expendit_app LOGIN PASSWORD '<generate>' NOSUPERUSER NOBYPASSRLS;
CREATE DATABASE expendit OWNER expendit_app;
```

The connection string the app gets (`DATABASE_URL`):
`postgres://expendit_app:<password>@<host>:<port>/expendit?sslmode=require`.
Tables are created by the app itself on start (migrations under an
advisory lock); there is nothing to run by hand.

### 3.2 Kafka

Create these topics before the first deploy. The app never creates
topics (auto-create stays off).

| Topic | Partitions | Retention / cleanup |
| --- | --- | --- |
| `expendit.config.rulesets` | 1 | `cleanup.policy=compact` |
| `expendit.upload.received` | 3 | `retention.ms=86400000` (24 h) |
| `expendit.import.ready` | 3 | 24 h |
| `expendit.import.processed` | 3 | 24 h |
| `expendit.statement.ready` | 3 | 24 h |
| `expendit.statement.mapped` | 3 | 24 h |
| `expendit.compute.requested` | 3 | 24 h |
| `expendit.compute.results` | 3 | 24 h |

Create them in the Aiven console (**Topics → Add topic**, advanced
configuration for cleanup policy and retention) or with
`avn service topic-create`.

Create **one service user per service** (S-11) with these permissions:

| User | Read (consume) | Write (produce) |
| --- | --- | --- |
| `expendit-common` | `upload.received`, `import.processed`, `statement.mapped`, `compute.results` | `config.rulesets`, `import.ready`, `statement.ready`, `compute.requested` |
| `expendit-statements` | — | `upload.received` |
| `expendit-analytics` | `import.ready`, `statement.ready`, `compute.requested`, `config.rulesets` | `import.processed`, `statement.mapped`, `compute.results` |

All topic names carry the `expendit.` prefix. Consumer groups are
`expendit-common`, `expendit-analytics-extract` and
`expendit-analytics-compute`; the rule-set reader uses no group.

Connection settings for every service: `KAFKA_BROKERS` (the service URI,
`host:port`), `KAFKA_USERNAME`, `KAFKA_PASSWORD`, and `KAFKA_SSL_CA` = the
**text** of Aiven's CA certificate (`-----BEGIN CERTIFICATE-----…`). The
clients use SASL/SCRAM-SHA-256 over TLS, so enable SASL on the service.

### 3.3 Redis

The shared Aiven Redis/Valkey, with Expendit on its own database index:
`REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`,
`REDIS_TLS=true`, `REDIS_DB=<free index>`. Only `common` uses it, for rate
limits; if it is unreachable the limits fail open.

## 4. Cloud Storage

1. Use the project's default bucket with **uniform bucket-level access**.
   Expendit uses only the prefix `expendit/stg/`.
2. Add a lifecycle rule: **delete objects older than 1 day with prefix
   `expendit/stg/tmp/`**. This is the backstop for raw uploads (S-4); the
   app normally deletes them within seconds.

## 5. Service accounts and IAM

| Service account | Used by | Roles |
| --- | --- | --- |
| `expendit-common` | common, the sweep jobs | `roles/storage.objectAdmin` on the bucket, condition below (A) |
| `expendit-statements` | statements | `roles/storage.objectCreator` on the bucket, condition (B) |
| `expendit-analytics` | both analytics services | `roles/storage.objectViewer`, condition (C); `roles/storage.objectCreator`, condition (D); `roles/aiplatform.user` on the project (Vertex AI) |
| `expendit-scheduler` | Cloud Scheduler | `roles/run.invoker` on the three sweep jobs |
| `expendit-deploy` | GitHub Actions (WIF) | `roles/run.developer` on the project; `roles/iam.serviceAccountUser` on the four runtime accounts |

IAM conditions (`B` = the bucket name):

- **(A)** `resource.name == "projects/_/buckets/B" || resource.name.startsWith("projects/_/buckets/B/objects/expendit/stg/")`
  (the first half allows listing, which the tmp/ sweep needs)
- **(B)** `resource.name.startsWith("projects/_/buckets/B/objects/expendit/stg/tmp/")`
- **(C)** `resource.name.startsWith("projects/_/buckets/B/objects/expendit/stg/tmp/") || resource.name.startsWith("projects/_/buckets/B/objects/expendit/stg/compute/")`
- **(D)** `resource.name.startsWith("projects/_/buckets/B/objects/expendit/stg/compute/")`

Enable the APIs: Cloud Run, Cloud Scheduler, Vertex AI
(`aiplatform.googleapis.com`), IAM Credentials, and Firebase App Hosting.

## 6. Configuration (Doppler `stg` → Cloud Run / App Hosting)

Names follow [system-design.md §10.3](system-design.md). Secrets are marked
🔒. Cloud Run sets `PORT` itself.

**Upload-ticket keys.** Generate once and keep the pair together:

```sh
cd api/common && go run ./cmd/ticketkey 2026-10
# UPLOAD_TICKET_PRIVATE_KEY=2026-10:…   → common only
# UPLOAD_TICKET_PUBLIC_KEYS=2026-10:…   → statements only
```

| Variable | common | statements | analytics |
| --- | --- | --- | --- |
| `DATABASE_URL` 🔒 | ✓ | | |
| `FIREBASE_PROJECT_ID` | ✓ (the GCP project id) | | |
| `UPLOAD_TICKET_PRIVATE_KEY` 🔒 | ✓ | | |
| `UPLOAD_TICKET_PUBLIC_KEYS` | | ✓ | |
| `KAFKA_BROKERS`, `KAFKA_SSL_CA` | ✓ | ✓ | ✓ |
| `KAFKA_USERNAME`, `KAFKA_PASSWORD` 🔒 | ✓ own user | ✓ own user | ✓ own user |
| `REDIS_HOST/PORT/USERNAME`, `REDIS_PASSWORD` 🔒, `REDIS_TLS=true`, `REDIS_DB` | ✓ | | |
| `STORAGE_DRIVER=gcs`, `STORAGE_BUCKET`, `STORAGE_PREFIX=expendit/stg` | ✓ | ✓ | ✓ |
| `CORS_ORIGINS` (the website origin) | ✓ | ✓ | |
| `ANALYTICS_POOL` | | | `extract` / `compute` |
| `GOOGLE_CLOUD_PROJECT`, `VERTEX_LOCATION` (e.g. `us-central1`) | | | ✓ |

Never set in cloud: `FIREBASE_AUTH_EMULATOR_HOST`, `GROQ_API_KEY`,
`GEMINI_API_KEY` (cloud AI is Vertex, X-4), `STORAGE_ENDPOINT` and the
`STORAGE_*_KEY`s (those are for the self-host S3 driver).

**Website (App Hosting, `web/`):**

| Variable | Available at | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_TEST_MODE` | build | `1` until §9, then remove |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID` | build | from §2 step 4 |
| `API_ORIGIN` | runtime | the `expendit-api-common` URL (`https://…run.app`) |
| `UPLOADS_ORIGIN` | runtime | the `expendit-api-statements` URL |

## 7. Cloud Run resources (cuesoft-iac stack)

Add these to the `expendit` stack. The first image can be any tag from
Docker Hub, because every release replaces it by digest.

| Name | Kind | Account | Port | Instances | CPU / memory | CPU allocation | Ingress / auth |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `expendit-api-common` | service | `expendit-common` | 8080 | **min 1**, max 5 | 1 / 512 MiB | **always allocated** (background consumers + outbox) | all · allow unauthenticated (the app checks Firebase tokens) |
| `expendit-api-statements` | service | `expendit-statements` | 8081 | 0–5 | 1 / 1 GiB, concurrency 20 (uploads up to 15 MB are held in memory), timeout 60 s | request-based | all · allow unauthenticated (auth is the upload ticket) |
| `expendit-api-analytics-extract` | service | `expendit-analytics` | 8082 | **min 1**, max 3 | 1 / 1 GiB | **always allocated** | internal · authenticated only |
| `expendit-api-analytics-compute` | service | `expendit-analytics` | 8082 | **min 1**, max 2 | 1 / 512 MiB | **always allocated** | internal · authenticated only |
| `expendit-sweep-reaper` | job, `./jobs reaper` | `expendit-common` | — | 1 task, 0 retries | 1 / 512 MiB | — | Scheduler: `* * * * *` |
| `expendit-sweep-tmp-cleanup` | job, `./jobs tmp-cleanup` | `expendit-common` | — | 1 task | 1 / 512 MiB | — | Scheduler: `*/15 * * * *` |
| `expendit-sweep-retention` | job, `./jobs retention` | `expendit-common` | — | 1 task | 1 / 512 MiB | — | Scheduler: `17 3 * * *` |

Cloud Scheduler calls each job with an HTTP `POST` to
`https://run.googleapis.com/v2/projects/<project>/locations/<region>/jobs/<job>:run`,
authenticated as `expendit-scheduler` (OAuth).

The analytics pools are services with always-on CPU because they only
consume Kafka. Cloud Run **worker pools** fit this better (S-12) where the
stack's module supports them; then swap the two
`gcloud run services update` lines in `release.yml` for the worker-pool
equivalent.

## 8. GitHub (release workflow)

On `cuesoftinc/expendit`:

1. **Environment `Sandbox`** with required reviewers, and these environment
   **variables**: `GCP_REGION`, `GCP_WORKLOAD_IDENTITY_PROVIDER`
   (`projects/<number>/locations/global/workloadIdentityPools/<pool>/providers/<provider>`),
   `GCP_DEPLOY_SERVICE_ACCOUNT` (the `expendit-deploy` email).
2. **Repository secrets**: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` (push to
   `cuesoft/expendit-api-*`).
3. **Tag ruleset** restricting `v*` tag creation to owners.
4. The WIF provider trusts this repository, and `expendit-deploy` grants it
   `roles/iam.workloadIdentityUser`.

## 9. First release and switching the website over

1. Merge to `main`; confirm the site still works (TEST_MODE, §0).
2. Create the infrastructure (§2–§7) and fill Doppler (§6).
3. Tag a release: `git tag v0.2.0 && git push origin v0.2.0`. Approve the
   `Sandbox` deployment when GitHub asks.
4. The workflow fails unless every service's newest revision is Ready and
   common answers `/ready`. Check the logs of `expendit-api-common` for
   `migration applied` and `rule set published`, and of analytics for
   `rule set loaded`.
5. In App Hosting, set `API_ORIGIN`, `UPLOADS_ORIGIN` and the
   `NEXT_PUBLIC_FIREBASE_*` values, **then remove `NEXT_PUBLIC_TEST_MODE`**
   and roll out.
6. Smoke test on the site: sign in with Google, add a transaction, import a
   small CSV, confirm it. Each import leaves a trail in the logs: filter on
   `jsonPayload.step` and the job id (`upload.received` → `outbox` →
   `import.ready` → `import.processed` → `upload deleted`).

## 10. Day-2

| Task | How |
| --- | --- |
| Roll back | Redeploy the previous image digest (it is in the earlier release run) with `gcloud run services update <name> --image docker.io/cuesoft/expendit-api-<svc>@sha256:…` |
| Rotate the ticket key | Generate a new pair with a new kid; **add** its public key to `UPLOAD_TICKET_PUBLIC_KEYS` (comma-separated) and deploy statements; switch `UPLOAD_TICKET_PRIVATE_KEY` and deploy common; after 5 minutes, drop the old public key |
| Rebuild the rule-set topic | If `expendit.config.rulesets` is recreated, run the `./jobs republish-rulesets` job once |
| Run migrations alone | `./jobs migrate` (common also runs them on start) |
| Sign off a tax rule set | After a licensed practitioner's review, set `signed_off = true, signed_off_by = '<name>'` on the row in `tax_ruleset`, then `./jobs republish-rulesets`. Until then estimates are labelled estimate-only and filings are refused (tax-engine.md) |

## 11. Not built yet

Bank linking (Mono, which will also need a Cloud KMS key), reports and
downloads, export-all and delete-all, tax filings, the ratio trace, and
OpenTelemetry export. Their screens show errors on the real backend until
those land (api.md §5).
