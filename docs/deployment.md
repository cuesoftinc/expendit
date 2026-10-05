# Deployment — Cloud Contract

> Implements decision X-3. Cloud deploys follow the proven cueprise/getpp
> patterns (workflows verified 2026-07-16); provisioning goes through the
> **cuesoft-iac** Pulumi ecosystem — never ad-hoc gcloud. Self-hosting via
> `deploy/` (compose/helm/terraform) is unchanged and shares only images.

## 1. Topology **[Decided — system-design.md §10, S-12]**

| Unit | Runs on | Scaling | Provisioned by |
| --- | --- | --- | --- |
| `api/common` (Go) `./server` | Cloud Run **service** | **min 1**, max 5: it consumes Kafka and publishes the outbox | cuesoft-iac stack `expendit` |
| `api/common` `./jobs <name>` | Cloud Run **jobs** + Cloud Scheduler | reaper every minute, tmp-cleanup every 15 min, retention daily | cuesoft-iac stack `expendit` |
| `api/statements` (Node) | Cloud Run **service** | 0–5 | cuesoft-iac stack `expendit` |
| `api/analytics` (Python), `ANALYTICS_POOL=extract` | Cloud Run **worker pool** | 1–3, capped by the Vertex quota | cuesoft-iac stack `expendit` |
| `api/analytics`, `ANALYTICS_POOL=compute` | Cloud Run **worker pool** | 1–2 | cuesoft-iac stack `expendit` |
| `web` (Next.js) | **Firebase App Hosting** | managed | App Hosting backend |
| Postgres, Kafka, Redis | Aiven | — | Aiven console / IaC |
| Object storage | default bucket, `expendit/stg/…`, 1-day lifecycle rule on `tmp/` | — | cuesoft-iac |

Services talk only over Aiven Kafka, never with direct service-to-service
calls (D4). Each service has its own SASL user with topic-level ACLs, and
each has Storage IAM on its prefixes only (S-11): `statements` can write
`tmp/`, `analytics` can read `tmp/` and `compute/`, and `common` can do
everything. Topics are created up front (`deploy/docker/kafka/create-topics.sh`
lists them; `config.rulesets` is compacted, every other topic keeps 24 h).

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
| `build-and-test.yml` | PRs **and** push to `main` | build + tests per service — **no deploy, no image push** (X-6: open-source repos; merges must be inert) |
| `release.yml` | **tag `v*` created** | matrix over services: buildx (GHA cache) → push `cuesoft/expendit-<service>` (tags: `latest`, `sha`, version) → Cloud Run deploy **by image digest** via WIF → App Hosting rollout pinned to the tag commit |

**Gating (X-6):** `stg` (sandbox) is the only environment and is treated as
production. Two independent gates: (1) a GitHub **tag ruleset** restricts
creating `v*` tags to owner-level access; (2) the deploy job runs in a
protected GitHub **environment** (`Sandbox`) with required reviewers. A merged
PR never reaches the sandbox on its own.

Two hard-won rules inherited from cueprise, non-negotiable:

1. **Deploy by digest, never by tag** — Cloud Run pulls Docker Hub images
   through the `mirror.gcr.io` cache, which has served stale manifests for
   tags; the staging workflow threads `steps.build.outputs.digest` into the
   deploy step.
2. **WIF only** (`google-github-actions/auth@v3` with
   `workload_identity_provider` + `service_account`) — no JSON keys.

The single protected GitHub environment is **`Sandbox`** (X-6) — required
reviewers + the sandbox URLs (`api.expendit.cuesoft.io`). No other deploy
environments exist.

## 4. Runtime contract (Cloud Run)

| Unit | CPU / mem | Concurrency | Instances | Timeout |
| --- | --- | --- | --- | --- |
| api/common | 1 vCPU / 512 MiB | 80 | 1–5 | 60 s |
| api/statements | 1 vCPU / 512 MiB | 20 (15 MB bodies in memory) | 0–5 | 60 s |
| api/analytics extract | 1 vCPU / 1 GiB | n/a (worker pool) | 1–3 | n/a |
| api/analytics compute | 1 vCPU / 512 MiB | n/a (worker pool) | 1–2 | n/a |

**[Decided defaults]** for common; the other rows are **[Proposed]** until
the first load test.

- Domain (S-14): `api.expendit.cuesoft.io` is one load balancer.
  `/api/v1/uploads` routes to `api/statements` and every other path to
  `api/common`. `api/analytics` has no ingress.
- Rate limits are per org, enforced by `common` before a ticket exists, so
  no client-IP attribution is needed (the trusted-proxy settings are gone).
- Postgres: connect as a **non-superuser** that owns the database, because
  superusers bypass row-level security. Migrations run at `server` start
  under an advisory lock; `./jobs migrate` runs them on their own.
- Upload-ticket keys: `common` gets `UPLOAD_TICKET_PRIVATE_KEY`, and
  `statements` gets every live public key in `UPLOAD_TICKET_PUBLIC_KEYS`.
  To rotate, add the new public key, switch the private key, then drop the
  old public key after 5 minutes.
- Rollback: redeploy the previous image digest (recorded in the release run).
- Web env: `NEXT_PUBLIC_*` flows Doppler → `apphosting.yaml` at rollout.
- Variable names: system-design.md §10.3 and each service's `.env.example`.

## 5. Not in this phase

`release.yml` and the Pulumi stack are still to be written; this document is
the contract they'll be built against. The images now exist as
`cuesoft/expendit-api-common`, `cuesoft/expendit-api-statements`,
`cuesoft/expendit-api-analytics` and `cuesoft/expendit-web`. The
`intake`/`process` Docker Hub repos can be retired.
