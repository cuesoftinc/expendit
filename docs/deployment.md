# Deployment — Cloud Contract

> Implements decision X-3. Cloud deploys follow the proven cueprise/getpp
> patterns (workflows verified 2026-07-16); provisioning goes through the
> **cuesoft-iac** Pulumi ecosystem — never ad-hoc gcloud. Self-hosting via
> `deploy/` (compose/helm/terraform) is unchanged and shares only images.

## 1. Topology

| Surface | Runs on | Provisioned by |
| --- | --- | --- |
| `api/common` (Go) | Cloud Run | cuesoft-iac stack `expendit` |
| `web` (Next.js) | **Firebase App Hosting** | App Hosting backend |

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
| `build-and-test.yml` | PRs | build + tests per service |
| `build-push-and-release-staging.yml` | push to `main` | matrix over services: buildx (GHA cache) → push `cuesoft/expendit-<service>` (tags: `latest` + `sha`) → Cloud Run deploy **by image digest** via WIF |
| `build-push-and-release-production.yml` | GitHub Release | same, pinned to the release commit; frontend rollout via `firebase-tools apphosting:rollouts:create --git-commit` |

Two hard-won rules inherited from cueprise, non-negotiable:

1. **Deploy by digest, never by tag** — Cloud Run pulls Docker Hub images
   through the `mirror.gcr.io` cache, which has served stale manifests for
   tags; the staging workflow threads `steps.build.outputs.digest` into the
   deploy step.
2. **WIF only** (`google-github-actions/auth@v3` with
   `workload_identity_provider` + `service_account`) — no JSON keys.

GitHub environments (`Staging <Project>`, `Production`) gate the deploy
jobs and carry the URLs.

## 4. Not in this phase

Writing these workflows + the Pulumi stack is **implementation work**, out of
scope for the docs phase — this document is the contract they'll be built
against. Docker Hub repos already exist for every image name above.
