# Expendit — Engineering Contracts

> Error catalog, authorization matrix, rate limits, testing strategy, logging
> rules. Ecosystem conventions shared with apparule/upstat (envelope, code
> discipline, never-log gating — see apparule engineering.md §1 for the
> envelope definition).

## 1. Error catalog (product families)

Shared envelope + HTTP families per the ecosystem standard. Expendit-specific
codes live in their flow specs: import (flows/import.md §3 — `file_too_large`,
`unsupported_type`, `no_transactions_found`, `password_protected_pdf`,
`ai_unavailable`, `job_already_confirmed`), bank-link (flows/bank-link.md —
`already_linked`, `link_expired`, `reauth_required`), tax
(`ruleset_unsigned`, `period_incomplete`, `mapping_unconfirmed`), statements
(`mapping_identity_violation`, `unmapped_threshold_exceeded` —
line-items.md §4), rights (`purge_pending`, `grace_expired`).

## 2. Authorization matrix (org model, E-4)

Roles: **member** (read + own uploads), **admin** (member + manage data),
**owner** (admin + destructive/legal). Personal orgs: the user is owner.

| Resource / action | member | admin | owner |
| --- | --- | --- | --- |
| Ledger read, reports read | ✓ | ✓ | ✓ |
| Upload imports, correct categories, confirm/discard own jobs | ✓ | ✓ | ✓ |
| Confirm/discard any job; bulk re-categorize; manage categories | — | ✓ | ✓ |
| Bank links: create/sync | — | ✓ | ✓ |
| Bank links: unlink (+purge choice) | — | — | ✓ |
| Statements upload + mapping | — | ✓ | ✓ |
| Ratio reports | ✓ read | ✓ | ✓ |
| Tax estimates read | ✓ | ✓ | ✓ |
| Tax filing generate/**submit** | — | generate | ✓ submit |
| Org members manage | — | — | ✓ |
| Export-all (USR-001) | — | — | ✓ |
| Purge (USR-002) | — | — | ✓ (type-to-confirm + grace) |
| Consent records | self | self | self |

Middleware resolves `{user, org, role}` once; handlers declare capability.
Cross-org access is `404 not_found`, never `403` (no existence leaks).

## 3. Rate limits

| Surface | Limit |
| --- | --- |
| Import uploads | 10/hr per org, 30/day |
| Manual bank sync | 1/10min per link (flows/bank-link.md) |
| Report generation | 12/hr per org |
| Export-all | 2/day per org |
| Tax filing generation | 6/hr per org |
| Auth | Firebase-managed; Redis limiter retired from auth routes only |

## 4. Testing strategy

| Layer | Scope | Non-negotiables |
| --- | --- | --- |
| Unit | parsers, engines, tax math | **tax golden tests** per rule set at band edges (tax-engine.md §6); line-item derivation + identity cross-check fixtures; duplicate-detector similarity table |
| Contract | error catalog | every documented code producible |
| Integration (compose) | import pipeline end-to-end | fixture files per failure-taxonomy row; idempotent upload/confirm under retry storms |
| Migration tests | Mongo→Postgres (with E-4) | row-count + checksum parity harness; org auto-create mapping |
| E2E smoke (release tag) | signin → upload → review → confirm → report download | against sandbox in release.yml |
| Privacy invariants | logs + responses | grep-gate: no transaction descriptions/amounts in logs; bank tokens absent everywhere |

## 5. Logging & observability

Ecosystem conventions (request-id line, account/org ids only). Product
**never-log list** (CI grep-gated): transaction descriptions & amounts,
statement/receipt text (the retired `[pdf] sample:` class), bank provider
tokens, generated tax documents' contents, AI prompts containing user data
(log token counts + latency, not payloads).

## 6. Acceptance

- [ ] Tax golden suite green on both rule sets before any filing UI ships
- [ ] Authz matrix tests per row incl. cross-org 404 behaviour
- [ ] Migration parity harness exists before E-4 executes
- [ ] Never-log grep gate in build-and-test.yml
- [ ] Fixture library covers every import failure-taxonomy row
