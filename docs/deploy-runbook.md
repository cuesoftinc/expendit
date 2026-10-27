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
| `expendit-api-common` | Cloud Run service | `cuesoft/expendit-api-common` | Go. The only Postgres client. Kafka consumers + outbox run while an instance is up. Also serves `POST /internal/jobs/<name>` for the sweeps |
| `expendit-api-statements` | Cloud Run service | `cuesoft/expendit-api-statements` | Node upload gateway (`POST /api/v1/uploads`) |
| `expendit-api-analytics-extract` | Cloud Run service | `cuesoft/expendit-api-analytics` | Python, `ANALYTICS_POOL=extract`. Kafka only; reached only by common's wake-ups |
| `expendit-api-analytics-compute` | Cloud Run service | `cuesoft/expendit-api-analytics` | Python, `ANALYTICS_POOL=compute` |
| `expendit-{reaper,tmp-cleanup,retention}` | Cloud Scheduler | n/a | `POST /internal/jobs/<name>` on common with an OIDC token |
| Postgres, Kafka, Valkey | Aiven (shared `sandbox-db`, `sandbox-kafka`, `sandbox-cache`) | n/a | |
| Object storage | the shared bucket `sandbox-e306a.firebasestorage.app` | n/a | prefix `expendit/stg/` |

Staging is GCP project `sandbox-e306a`, region `us-central1`, created by
[cuesoft-iac PR 368](https://github.com/cuesoftinc/cuesoft-iac/pull/368).
Service URLs are `https://<service>-805800737799.us-central1.run.app`.

Images are built and deployed by `.github/workflows/release.yml` when a
`v*` tag is created (§7). **Your infrastructure code creates the resources;
the workflow only swaps their image digests.**

### 1.1 Everything scales to zero

No service runs while nobody uses the app ([system-design.md §16
I-16](system-design.md)). Kafka needs a running consumer, and Cloud Run
starts one only for an HTTP request, so each service that publishes wakes
the one that consumes with a `GET /health`:

```
browser → common (creates the import) → statements (upload)
statements ──upload.received──▶ Kafka, then wakes common
common ──import.ready on cuelabs.requests──▶ Kafka, then wakes analytics-extract
analytics-extract ──import.processed on cuelabs.results──▶ Kafka, then wakes common
(compute works the same way with compute.requested / compute.results)
```

Every service has `min-instances 0` and request-based CPU. Once woken, a
service consumes while Cloud Run keeps the instance, until it retires the
idle instance (up to about 15 minutes). The reaper is the safety net:
every 5 minutes Cloud Scheduler calls it on common, and it wakes common and
analytics-extract if work is still pending.
The first import after a quiet period takes about 5–10 seconds (cold start
plus Kafka consumer-group join); later ones take 1–2 seconds.

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

On staging this is the shared `sandbox-db` service, created by the IaC.

The connection string the app gets (`DATABASE_URL`):
`postgres://expendit_app:<password>@<host>:<port>/expendit?sslmode=require`.
Tables are created by the app itself on start (migrations under an
advisory lock); there is nothing to run by hand.

### 3.2 Kafka (the CueLABS shared bus)

Expendit, Apparule and Upstat share **one Kafka service** and its three
topics; the rules are in the CueLABS delivery standard
(`references/shared-messaging.md`). Create these once, for every product,
if they don't exist yet. The app never creates topics (auto-create stays
off).

| Topic | Partitions | Retention | Carries |
| --- | --- | --- | --- |
| `cuelabs.uploads` | 2 | the service default (24 h where it can be set) | upload gateways → control planes |
| `cuelabs.requests` | 2 | same | control planes → processing services |
| `cuelabs.results` | 2 | same | processing services → control planes |

The service allows five topics in total; the other two are held in reserve
for all products, so don't create Expendit-specific topics.

Expendit has **one SASL user**, `expendit`, with topic ACLs for read and
write on the three `cuelabs.*` topics (the IaC creates it). All three
Expendit services use it. If the free plan refuses SASL, fall back to
client certificates.

**Operating the shared service:**

- **It powers itself off after 24 hours with no messages**, loses the
  messages in its topics (topics, users and ACLs come back), and stays
  off until powered on. **Expendit is the keep-alive owner for every
  product** ([system-design.md §16 I-17, I-18](system-design.md)): its
  reaper sends a heartbeat every 6 hours, powers the service back on
  through the Aiven API if it finds it off (set the three `AIVEN_*`
  values in §6, on common only), and re-sends any import whose message
  was lost. Power-on itself takes minutes to hours, so expect failed
  uploads during that window.
- **The Aiven API token (auto power-on).** The reaper needs a token to
  check the Kafka service's state and power it back on:
  1. In the Aiven console, create a token for an **application user**
     (Organization → Application users), so it isn't tied to a person.
     Give that user a role on the Kafka project that can update services
     (operator or admin). A personal token (User profile → Tokens) also
     works.
  2. Note the **project name** and the **Kafka service name**, both shown
     in the console.
  3. In Doppler `expendit` → `stg`, add `AIVEN_API_TOKEN` 🔒 (the token),
     `AIVEN_PROJECT` (the project name) and `AIVEN_KAFKA_SERVICE` (the
     service name). Expose them to **common only**, which runs the sweeps; the other
     services don't need them.
  4. **Test it once**: power Kafka off in the console, wait up to
     5 minutes, and check the `expendit-api-common` logs for the `reaper` job and
     `power-on requested` (log step `kafka.power`). Kafka is back once
     Aiven finishes starting it, which can take a few minutes. Aiven's docs
     only show the console for power-on on this plan, so this confirms the
     API works. If the log shows a 403, the token's role is too narrow.

  Without these three values the reaper skips the check, and someone has
  to power Kafka on in the console when it goes off.
- **SASL:** enable it under **Service settings → Advanced configuration →
  `kafka_authentication_methods.sasl`** (PLAIN and SCRAM-SHA-256/512 are
  listed for this plan). If it can't be enabled, tell the developer: the
  services would need client-certificate login instead.

Connection settings for every service: `KAFKA_BROKERS` (the service URI,
`host:port`), `KAFKA_USERNAME`, `KAFKA_PASSWORD`, and `KAFKA_SSL_CA` = the
**text** of Aiven's CA certificate (`-----BEGIN CERTIFICATE-----…`). The
clients use SASL/SCRAM-SHA-256 over TLS, so enable SASL on the service.

### 3.3 Valkey

The shared Aiven Valkey `sandbox-cache`, user `expendit`, whose ACL allows
only keys `expendit:*`: `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`,
`REDIS_PASSWORD`, `REDIS_TLS=true`, `REDIS_KEY_PREFIX=expendit` (the default).
Only `common` uses it, for rate limits; if it is unreachable the limits
fail open.

## 4. Cloud Storage

1. Use the shared bucket `sandbox-e306a.firebasestorage.app` with
   **uniform bucket-level access**. Expendit uses only the prefix
   `expendit/stg/`.
2. Add lifecycle rules: **delete objects older than 1 day with prefix
   `expendit/stg/tmp/`**, and the same for **`expendit/stg/compute/`**.
   They are the backstop for raw uploads (S-4) and for the payloads of
   Kafka messages, which go by pointer on the shared bus; the app's
   cleanup sweep normally deletes both sooner. The IaC creates the rules.

## 5. Service accounts and IAM

| Service account | Used by | Roles |
| --- | --- | --- |
| `expendit-common` | common (including the sweeps) | `roles/storage.objectAdmin` on the bucket, condition below (A); `roles/run.invoker` on **both analytics services** (to wake them) |
| `expendit-statements` | statements | `roles/storage.objectCreator` on the bucket, condition (B) |
| `expendit-analytics` | both analytics services | `roles/storage.objectViewer`, condition (C); `roles/storage.objectCreator`, condition (D); `roles/aiplatform.user` on the project (Vertex AI) |
| `expendit-deploy` | GitHub Actions (WIF) | `roles/run.developer` on the project; `roles/iam.serviceAccountUser` on the four runtime accounts |

Cloud Scheduler signs its OIDC token as the account named in
`SCHEDULER_INVOKER_EMAIL` (§6), and common checks that email and the
audience `SCHEDULER_AUDIENCE` on every `POST /internal/jobs/<name>`.

IAM conditions (`B` = the bucket name):

- **(A)** `resource.name == "projects/_/buckets/B" || resource.name.startsWith("projects/_/buckets/B/objects/expendit/stg/")`
  (the first half allows listing, which the tmp/ sweep needs)
- **(B)** `resource.name.startsWith("projects/_/buckets/B/objects/expendit/stg/tmp/")`
- **(C)** `resource.name.startsWith("projects/_/buckets/B/objects/expendit/stg/tmp/") || resource.name.startsWith("projects/_/buckets/B/objects/expendit/stg/compute/")`
- **(D)** `resource.name.startsWith("projects/_/buckets/B/objects/expendit/stg/compute/")`

The IaC creates all of this. Enable the APIs: Cloud Run, Cloud Scheduler, Vertex AI
(`aiplatform.googleapis.com`), IAM Credentials, and Firebase App Hosting.

## 6. Configuration (Doppler `stg` → Cloud Run / App Hosting)

Names follow [system-design.md §10.3](system-design.md). Secrets are marked
🔒 and live in Doppler project `expendit`, config `stg`. Cloud Run sets
`PORT` itself.

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
| `KAFKA_USERNAME`, `KAFKA_PASSWORD` 🔒 | ✓ `expendit` | ✓ `expendit` | ✓ `expendit` |
| `REDIS_HOST/PORT/USERNAME`, `REDIS_PASSWORD` 🔒, `REDIS_TLS=true`, `REDIS_DB`, `REDIS_KEY_PREFIX=expendit` | ✓ | | |
| `SCHEDULER_AUDIENCE` (the `expendit-api-common` URL), `SCHEDULER_INVOKER_EMAIL` (the account Cloud Scheduler signs as) | ✓ | | |
| `STORAGE_DRIVER=gcs`, `STORAGE_BUCKET`, `STORAGE_PREFIX=expendit/stg` | ✓ | ✓ | ✓ |
| `CORS_ORIGINS` (the website origin) | ✓ | ✓ | |
| `WAKE_COMMON_URL` (the `expendit-api-common` URL) | | ✓ | ✓ |
| `WAKE_EXTRACT_URL`, `WAKE_COMPUTE_URL` (the two analytics URLs) | ✓ | | |
| `AIVEN_API_TOKEN` 🔒, `AIVEN_PROJECT`, `AIVEN_KAFKA_SERVICE` (lets the reaper power the shared Kafka back on; a token that can update that one service) | ✓ | | |
| `ANALYTICS_POOL` | | | `extract` / `compute` |
| `GOOGLE_CLOUD_PROJECT`, `VERTEX_LOCATION` (e.g. `us-central1`) | | | ✓ |

The `WAKE_*` values are the services' own `https://…run.app` URLs, without a
path; `SCHEDULER_AUDIENCE` is the same URL as common's. Create the services first, then fill these in and redeploy.

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

The `expendit` stack creates these (PR 368). The first image can be any tag
from Docker Hub, because every release replaces it by digest.

| Name | Kind | Account | Port | Instances | CPU / memory | CPU allocation | Ingress / auth |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `expendit-api-common` | service | `expendit-common` | 8080 | **0**–2 | 1 / 512 MiB, timeout 300 s | request-based | all · allow unauthenticated (the app checks Firebase tokens; `/internal/jobs/*` checks the scheduler OIDC token) |
| `expendit-api-statements` | service | `expendit-statements` | 8081 | 0–5 | 1 / 1 GiB, concurrency 20 (uploads up to 15 MB are held in memory), timeout 60 s | request-based | all · allow unauthenticated (auth is the upload ticket) |
| `expendit-api-analytics-extract` | service | `expendit-analytics` | 8082 | **0**–2 | 1 / 1 GiB | request-based | all · **authenticated only** (invoker: `expendit-common`) |
| `expendit-api-analytics-compute` | service | `expendit-analytics` | 8082 | **0**–2 | 1 / 512 MiB | request-based | all · **authenticated only** (invoker: `expendit-common`) |

There are no Cloud Run jobs and no worker pools. Cloud Scheduler runs three
jobs, created **paused** until the release that ships
`/internal/jobs/<name>` is deployed (§9):

| Scheduler job | Schedule | Request |
| --- | --- | --- |
| `expendit-reaper` | `*/5 * * * *` | `POST <common URL>/internal/jobs/reaper` |
| `expendit-tmp-cleanup` | `*/15 * * * *` | `POST <common URL>/internal/jobs/tmp-cleanup` |
| `expendit-retention` | `17 3 * * *` | `POST <common URL>/internal/jobs/retention` |

Each request carries a Google OIDC token. Common answers 200 with
`{"job":"<name>","ms":<elapsed>}` when the sweep finishes, 401 or 403 when
the token or its email is wrong, 503 when `SCHEDULER_AUDIENCE` or
`SCHEDULER_INVOKER_EMAIL` is unset, and 404 for an unknown name. The sweeps
run inside the request (attempt deadline 60 s).

In gcloud terms: `--min-instances 0` everywhere with the default
request-based CPU.

Why analytics ingress is **all** rather than internal: common wakes them
over their `run.app` URL, and a call from another Cloud Run service only
counts as internal through a VPC. Requiring authentication (no
`allUsers` invoker) keeps them private: only `expendit-common`, which
holds `roles/run.invoker` on them, can reach them, and it sends an ID
token on every wake.

**Idle.** While nobody uses the app nothing is running. Each wake-up keeps
an instance for up to ~15 minutes. The only things that run regardless are
Aiven (Postgres, Valkey and the shared Kafka) and Cloud Scheduler's reaper
request every 5 minutes, which starts common for a moment.

## 8. GitHub (release workflow)

On `cuesoftinc/expendit`:

1. **Environment `Sandbox`** with required reviewers, and these environment
   **variables**: `GCP_PROJECT_ID`, `GCP_REGION`,
   `GCP_WORKLOAD_IDENTITY_PROVIDER`
   (`projects/<number>/locations/global/workloadIdentityPools/<pool>/providers/<provider>`),
   `GCP_DEPLOY_SERVICE_ACCOUNT` (the `expendit-deploy` email). The IaC
   sets them. Secrets come from Doppler project `expendit`, config `stg`.
2. **Repository secrets**: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` (push to
   `cuesoft/expendit-api-*`).
3. **Tag ruleset** restricting `v*` tag creation to owners.
4. The WIF provider trusts this repository, and `expendit-deploy` grants it
   `roles/iam.workloadIdentityUser`.

## 9. First release and switching the website over

1. Merge to `main`; confirm the site still works (TEST_MODE, §0).
2. Create the infrastructure (§2–§7, the IaC PR) and fill Doppler (§6).
3. Tag a release: `git tag v0.2.0 && git push origin v0.2.0`. Approve the
   `Sandbox` deployment when GitHub asks.
4. The workflow fails unless every service's newest revision is Ready and
   common answers `/ready`. Check the logs of `expendit-api-common` for
   `migration applied` (first deploy only) and `listening`.
5. Unpause the three Scheduler jobs, run each once and check for a 200 in
   the `expendit-api-common` logs (the IaC creates them paused).
6. In App Hosting, set `API_ORIGIN`, `UPLOADS_ORIGIN` and the
   `NEXT_PUBLIC_FIREBASE_*` values, **then remove `NEXT_PUBLIC_TEST_MODE`**
   and roll out.
7. Smoke test on the site: sign in with Google, add a transaction, import a
   small CSV, confirm it. Each import leaves a trail in the logs: filter on
   `jsonPayload.step` and the job id (`upload.received` → `wake` →
   `outbox` → `wake` → `import.ready` → `import.processed` → `upload
   deleted`).
8. Leave the app alone for 20 minutes and check that every service shows
   0 instances (Cloud Run → service → Metrics → Instance count). Then
   import again: it should work, a few seconds slower the first time.

## 10. Day-2

| Task | How |
| --- | --- |
| Roll back | Redeploy the previous image digest (it is in the earlier release run) with `gcloud run services update <name> --image docker.io/cuesoft/expendit-api-<svc>@sha256:…` |
| Rotate the ticket key | Generate a new pair with a new kid; **add** its public key to `UPLOAD_TICKET_PUBLIC_KEYS` (comma-separated) and deploy statements; switch `UPLOAD_TICKET_PRIVATE_KEY` and deploy common; after 5 minutes, drop the old public key |
| Run migrations alone | `./jobs migrate` from a local checkout (common also runs them on start) |
| Sign off a tax rule set | After a licensed practitioner's review, set `signed_off = true, signed_off_by = '<name>'` on the row in `tax_ruleset`. The next tax computation picks it up. Until then estimates are labelled estimate-only and filings are refused (tax-engine.md) |
| Kafka powered off (idle) | The reaper requests power-on within 5 minutes if the `AIVEN_*` values are set (§3.2), and Kafka is back once Aiven finishes starting it (log step `kafka.power`); otherwise power it on in the Aiven console. Uploads fail until it is back; imports already processing are re-sent from Postgres. Nothing is lost from Postgres |
| Check Kafka by hand | Run `./jobs heartbeat` locally against the stg config: it sends one message and fails loudly if Kafka is unreachable |
| Run a sweep by hand | Resume the Scheduler job's `Force run`, or `POST /internal/jobs/<name>` on common with an OIDC token |
| An import stuck in "processing" | Wait for the reaper (≤ 5 minutes): it wakes common and analytics-extract while work is pending. If it still sticks, check the `wake` log lines for `wake failed` |

## 11. Not built yet

Bank linking (Mono, which will also need a Cloud KMS key), reports and
downloads, export-all and delete-all, tax filings, the ratio trace, and
OpenTelemetry export. Their screens show errors on the real backend until
those land (api.md §5).
