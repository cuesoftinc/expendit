-- Core schema: identity, orgs, ledger, imports, tickets, outbox, rule sets.
-- data-model.md §1–§6 as Postgres (X-5), plus system-design.md §5.2.
-- Every org-scoped table has row-level security keyed on org_id (S-11):
-- the app sets app.org_id per transaction; workers set app.bypass_rls.
-- gen_random_uuid() is core since Postgres 13.


CREATE FUNCTION app_org_visible(row_org uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.bypass_rls', true), '') = 'on'
      OR row_org = nullif(current_setting('app.org_id', true), '')::uuid
$$;

-- ── Identity (X-1: Firebase, Google only) ───────────────────────────────

CREATE TABLE app_user (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid  text NOT NULL UNIQUE,
  email         text NOT NULL,
  name          text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX app_user_email ON app_user (lower(email));

CREATE TABLE consent_record (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  document     text NOT NULL CHECK (document IN ('tos', 'privacy', 'ai_processing')),
  version      text NOT NULL,
  accepted_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consent_record_user ON consent_record (user_id, document, accepted_at DESC);

-- ── Orgs (E-4) ──────────────────────────────────────────────────────────

CREATE TABLE org (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  kind                text NOT NULL CHECK (kind IN ('personal', 'company')),
  currency            char(3) NOT NULL DEFAULT 'NGN',
  country             char(2) NOT NULL DEFAULT 'NG',
  fiscal_year_end     char(5) NOT NULL DEFAULT '12-31' CHECK (fiscal_year_end ~ '^\d{2}-\d{2}$'),
  registered_address  jsonb,
  -- Bumped on every change a computed figure depends on (D5, §6.5).
  data_version        bigint NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE org ENABLE ROW LEVEL SECURITY;
ALTER TABLE org FORCE ROW LEVEL SECURITY;
CREATE POLICY org_tenant ON org USING (app_org_visible(id)) WITH CHECK (app_org_visible(id));

CREATE TABLE org_member (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES org (id) ON DELETE CASCADE,
  -- Null while an email invite is pending its first sign-in.
  user_id    uuid REFERENCES app_user (id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  status     text NOT NULL CHECK (status IN ('active', 'pending')),
  joined_at  timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
CREATE UNIQUE INDEX org_member_email ON org_member (org_id, lower(email));
CREATE INDEX org_member_user ON org_member (user_id);
ALTER TABLE org_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_member FORCE ROW LEVEL SECURITY;
CREATE POLICY org_member_tenant ON org_member USING (app_org_visible(org_id)) WITH CHECK (app_org_visible(org_id));

-- ── Ledger ──────────────────────────────────────────────────────────────

CREATE TABLE category (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES org (id) ON DELETE CASCADE,
  name           text NOT NULL,
  type           text NOT NULL CHECK (type IN ('expense', 'income')),
  color          text NOT NULL DEFAULT '#8A8F98',
  tax_treatment  text NOT NULL DEFAULT 'taxable_income' CHECK (tax_treatment IN ('taxable_income', 'exempt', 'ignore')),
  vat_treatment  text NOT NULL DEFAULT 'vatable' CHECK (vat_treatment IN ('vatable', 'zero_rated', 'exempt')),
  vat_basis      text NOT NULL DEFAULT 'inclusive' CHECK (vat_basis IN ('inclusive', 'exclusive')),
  ai_proposed    boolean NOT NULL DEFAULT false,
  ai_note        text,
  archived_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX category_name ON category (org_id, type, lower(name));
ALTER TABLE category ENABLE ROW LEVEL SECURITY;
ALTER TABLE category FORCE ROW LEVEL SECURITY;
CREATE POLICY category_tenant ON category USING (app_org_visible(org_id)) WITH CHECK (app_org_visible(org_id));

CREATE TABLE import_job (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES org (id) ON DELETE CASCADE,
  created_by       uuid REFERENCES app_user (id) ON DELETE SET NULL,
  source           text NOT NULL CHECK (source IN ('upload', 'bank_sync')),
  source_link_id   uuid,
  status           text NOT NULL CHECK (status IN ('awaiting_upload', 'processing', 'completed', 'failed')),
  file_name        text,
  file_type        text CHECK (file_type IN ('csv', 'xlsx', 'pdf', 'image')),
  declared_bytes   bigint,
  object_key       text,
  -- Replaces the gateway's in-memory cache (flows/import.md §2): unique per
  -- org while the job is live, released when it fails.
  idempotency_key  text,
  total_parsed     integer NOT NULL DEFAULT 0,
  duplicates_found integer NOT NULL DEFAULT 0,
  imported         integer NOT NULL DEFAULT 0,
  summary          jsonb,
  ai_summary       text,
  anomalies        jsonb NOT NULL DEFAULT '[]',
  warnings         jsonb NOT NULL DEFAULT '[]',
  error_code       text,
  confirmed        boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  processing_at    timestamptz,
  completed_at     timestamptz,
  confirmed_at     timestamptz
);
CREATE UNIQUE INDEX import_job_idempotency ON import_job (org_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND status <> 'failed';
CREATE INDEX import_job_org ON import_job (org_id, created_at DESC);
CREATE INDEX import_job_status ON import_job (status, created_at);
ALTER TABLE import_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_job FORCE ROW LEVEL SECURITY;
CREATE POLICY import_job_tenant ON import_job USING (app_org_visible(org_id)) WITH CHECK (app_org_visible(org_id));

CREATE TABLE ledger_txn (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 uuid NOT NULL REFERENCES org (id) ON DELETE CASCADE,
  description            text NOT NULL,
  amount                 numeric(18, 2) NOT NULL CHECK (amount >= 0),
  direction              text NOT NULL CHECK (direction IN ('income', 'expense')),
  category_id            uuid NOT NULL REFERENCES category (id),
  txn_date               date NOT NULL,
  source                 text NOT NULL CHECK (source IN ('manual', 'csv', 'pdf', 'receipt', 'bank')),
  source_link_id         uuid,
  import_job_id          uuid REFERENCES import_job (id) ON DELETE SET NULL,
  ai_categorized         boolean NOT NULL DEFAULT false,
  excluded_from_reports  boolean NOT NULL DEFAULT false,
  anomalies              jsonb NOT NULL DEFAULT '[]',
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_txn_org_date ON ledger_txn (org_id, txn_date DESC, id DESC);
CREATE INDEX ledger_txn_category ON ledger_txn (category_id);
ALTER TABLE ledger_txn ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_txn FORCE ROW LEVEL SECURITY;
CREATE POLICY ledger_txn_tenant ON ledger_txn USING (app_org_visible(org_id)) WITH CHECK (app_org_visible(org_id));

CREATE TABLE staged_txn (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id             uuid NOT NULL REFERENCES import_job (id) ON DELETE CASCADE,
  org_id             uuid NOT NULL REFERENCES org (id) ON DELETE CASCADE,
  position           integer NOT NULL,
  description        text NOT NULL,
  amount             numeric(18, 2) NOT NULL,
  direction          text NOT NULL CHECK (direction IN ('income', 'expense')),
  category_id        uuid NOT NULL REFERENCES category (id),
  ai_categorized     boolean NOT NULL DEFAULT false,
  is_duplicate       boolean NOT NULL DEFAULT false,
  include_duplicate  boolean NOT NULL DEFAULT false,
  txn_date           date NOT NULL,
  anomalies          jsonb NOT NULL DEFAULT '[]',
  UNIQUE (job_id, position)
);
CREATE INDEX staged_txn_org_date ON staged_txn (org_id, txn_date);
ALTER TABLE staged_txn ENABLE ROW LEVEL SECURITY;
ALTER TABLE staged_txn FORCE ROW LEVEL SECURITY;
CREATE POLICY staged_txn_tenant ON staged_txn USING (app_org_visible(org_id)) WITH CHECK (app_org_visible(org_id));

-- ── Upload tickets (S-5) ────────────────────────────────────────────────

CREATE TABLE upload_ticket (
  jti          text PRIMARY KEY,
  org_id       uuid NOT NULL REFERENCES org (id) ON DELETE CASCADE,
  target_kind  text NOT NULL CHECK (target_kind IN ('import_job', 'fin_statement')),
  target_id    uuid NOT NULL,
  file_type    text NOT NULL,
  max_bytes    bigint NOT NULL,
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX upload_ticket_target ON upload_ticket (target_kind, target_id);
ALTER TABLE upload_ticket ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_ticket FORCE ROW LEVEL SECURITY;
CREATE POLICY upload_ticket_tenant ON upload_ticket USING (app_org_visible(org_id)) WITH CHECK (app_org_visible(org_id));

-- ── Transactional outbox (§6.6) ─────────────────────────────────────────

CREATE TABLE outbox (
  id            bigserial PRIMARY KEY,
  topic         text NOT NULL,
  message_key   text NOT NULL,
  payload       jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  published_at  timestamptz
);
CREATE INDEX outbox_pending ON outbox (id) WHERE published_at IS NULL;

-- ── Tax rule sets (tax-engine.md §1; published via outbox, S-10) ────────

CREATE TABLE tax_ruleset (
  id              text PRIMARY KEY,
  jurisdiction    text NOT NULL DEFAULT 'NG',
  tax_kind        text NOT NULL CHECK (tax_kind IN ('pit', 'cit', 'vat')),
  effective_from  date NOT NULL,
  effective_to    date,
  signed_off      boolean NOT NULL DEFAULT false,
  signed_off_by   text,
  rules           jsonb NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now()
);
