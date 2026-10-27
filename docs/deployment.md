# Deployment — Cloud Contract

> Implements decision X-3. Cloud deploys follow the proven cueprise/getpp
> patterns (workflows verified 2026-07-16); provisioning goes through the
> **cuesoft-iac** Pulumi ecosystem — never ad-hoc gcloud. Self-hosting via
> `deploy/` (compose/helm/terraform) is unchanged and shares only images.

## 1. Topology **[Decided — system-design.md §10, S-12]**

| Unit | Runs on | Scaling | Provisioned by |
| --- | --- | --- | --- |
| `api/common` (Go) `./server` | Cloud Run **service** (also serves `POST /internal/jobs/<name>`) | **0**–2, woken over HTTP (system-design.md §16 I-16) | cuesoft-iac stack `expendit` |
| Sweeps `expendit-reaper`, `expendit-tmp-cleanup`, `expendit-retention` | Cloud Scheduler, `POST /internal/jobs/<name>` on common with an OIDC token | reaper every 5 min (also wakes services while work is pending), tmp-cleanup every 15 min, retention daily; created paused until the handlers deploy | cuesoft-iac stack `expendit` |
| `api/statements` (Node) | Cloud Run **service** | 0–5 | cuesoft-iac stack `expendit` |
| `api/analytics` (Python), `ANALYTICS_POOL=extract` | Cloud Run service, authenticated only (common wakes it) | **0**–2, capped by the Vertex quota | cuesoft-iac stack `expendit` |
| `api/analytics`, `ANALYTICS_POOL=compute` | Cloud Run service, authenticated only | **0**–2 | cuesoft-iac stack `expendit` |
| `web` (Next.js) | **Firebase App Hosting** | managed | App Hosting backend |
| Postgres, Kafka, Valkey | Aiven, shared (`sandbox-db`, `sandbox-kafka`, `sandbox-cache`) | n/a | cuesoft-iac |
| Object storage | shared bucket `sandbox-e306a.firebasestorage.app`, `expendit/stg/…`, 1-day lifecycle rule on `tmp/` and `compute/` | n/a | cuesoft-iac |

Services hand data to each other only over Aiven Kafka (D4); the one
direct call is a `GET /health`, carrying no data, that wakes a scaled-to-zero
consumer after something was published for it (system-design.md §16 I-16). Each service has its own SASL user with topic-level ACLs, and
each has Storage IAM on its prefixes only (S-11): `statements` can write
`tmp/`, `analytics` can read `tmp/` and `compute/`, and `common` can do
everything. Kafka is the CueLABS shared bus (system-design.md §16 I-18):
three lanes shared with Apparule and Upstat, created once
(`deploy/docker/kafka/create-topics.sh` mirrors them locally), with every
payload by pointer.

## 2. Provisioning (cuesoft-iac)

- **Pulumi, bun runtime**; state in `gs://cuesoft-iac-pulumi-state-bucket`;
  per-product stack (`Pulumi.<product>.yaml`) added alongside existing ones
  (getpp, swaves, …).
- Cloud Run services instantiate the shared module
  `common/modules/gcp/cloud-run-service.ts`; the GitHub→GCP deploy identity
  uses **Workload Identity Federation** (`common/helpers/wif.ts`) — no
  service-account keys in GitHub.
- Secrets/env flow from **Doppler** (`cueprise/cuesoft_stg` pattern) into
  Cloud Run env; the repo's `.env.example` files document the variable
  names, Doppler owns values.

## 3. CI/CD (GitHub Actions, cueprise/getpp pattern)

| Workflow | Trigger | Does |
| --- | --- | --- |
| `build-and-test.yml` | PRs **and** push to `main` | build + tests per service; **no deploy, no image push** (`release.yml` deploys) |
| `release.yml` | **push to `main` touching `api/**`** | buildx (GHA cache) → push `cuesoft/expendit-api-{common,statements,analytics}` (tags: sha, `latest`) → Cloud Run services updated **by image digest** via WIF in the `Sandbox` environment → fails unless every newest revision is Ready. The website is not in it: App Hosting rolls out from `main`. Step-by-step setup: [deploy-runbook.md](deploy-runbook.md) |

**Gating (X-6, revised 2026-10-27):** `stg` (sandbox) is the only
environment. A merge to `main` that touches `api/**` deploys the API services
to the sandbox; review and merge rights on `main` are the gate. The deploy job
runs in the `Sandbox` environment, which holds the WIF variables. No version
tags: images carry the commit sha and `latest`.

Two hard-won rules inherited from cueprise, non-negotiable:

1. **Deploy by digest, never by tag** — Cloud Run pulls Docker Hub images
   through the `mirror.gcr.io` cache, which has served stale manifests for
   tags; the staging workflow threads `steps.build.outputs.digest` into the
   deploy step.
2. **WIF only** (`google-github-actions/auth@v3` with
   `workload_identity_provider` + `service_account`) — no JSON keys.

The single protected GitHub environment is **`Sandbox`** (X-6) — required
reviewers + the sandbox variables (`GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_DEPLOY_SERVICE_ACCOUNT`). No other deploy
environments exist.

## 4. Runtime contract (Cloud Run)

| Unit | CPU / mem | Concurrency | Instances | Timeout |
| --- | --- | --- | --- | --- |
| api/common | 1 vCPU / 512 MiB | 80 | 0–2 | 300 s |
| api/statements | 1 vCPU / 1 GiB | 20 (15 MB bodies in memory) | 0–5 | 60 s |
| api/analytics extract | 1 vCPU / 1 GiB | 80 (only wake-ups arrive) | 0–2 | 60 s |
| api/analytics compute | 1 vCPU / 512 MiB | 80 (only wake-ups arrive) | 0–2 | 60 s |

**[Decided defaults]** for common; the other rows are **[Proposed]** until
the first load test.

- Routing (S-14): there is no load balancer. The web proxies `/api/v1/*` to
  `api/common` and `/api/v1/uploads` to `api/statements`. `api/analytics`
  is reachable only by `api/common`.
- Rate limits are per org, enforced by `common` before a ticket exists, so
  no client-IP attribution is needed (the trusted-proxy settings are gone).
- Postgres: connect as a **non-superuser** that owns the database, because
  superusers bypass row-level security. Migrations run at `server` start
  under an advisory lock; `./jobs migrate` runs them on their own, locally.
- Sweeps: Cloud Scheduler calls `POST /internal/jobs/<name>` on common. The
  handler checks the OIDC token against `SCHEDULER_AUDIENCE` and
  `SCHEDULER_INVOKER_EMAIL`. Every service stays at `min-instances 0`.
- Upload-ticket keys: `common` gets `UPLOAD_TICKET_PRIVATE_KEY`, and
  `statements` gets every live public key in `UPLOAD_TICKET_PUBLIC_KEYS`.
  To rotate, add the new public key, switch the private key, then drop the
  old public key after 5 minutes.
- Rollback: redeploy the previous image digest (recorded in the release run).
- Web env: `NEXT_PUBLIC_*` flows Doppler → `apphosting.yaml` at rollout.
- Variable names: system-design.md §10.3 and each service's `.env.example`.

## 5. Not in this phase

`release.yml` landed on 2026-10-08; the staging estate is created by
[cuesoft-iac PR 368](https://github.com/cuesoftinc/cuesoft-iac/pull/368),
described in [deploy-runbook.md](deploy-runbook.md) §7. The images now exist as
`cuesoft/expendit-api-common`, `cuesoft/expendit-api-statements`,
`cuesoft/expendit-api-analytics` and `cuesoft/expendit-web`. The
`intake`/`process` Docker Hub repos can be retired.
