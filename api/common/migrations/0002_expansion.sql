-- Expansion entities (data-model.md §2, §5, §6): statements and line items,
-- ratio reports, tax profiles/estimates/filings, bank links, rights.

CREATE TABLE fin_statement (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES org (id) ON DELETE CASCADE,
  created_by        uuid REFERENCES app_user (id) ON DELETE SET NULL,
  kind              text NOT NULL CHECK (kind IN ('balance_sheet', 'income_statement', 'cash_flow')),
  period            text NOT NULL CHECK (period ~ '^(\d{4}-Q[1-4]|\d{4}-H[12]|FY\d{4})$'),
  currency          char(3) NOT NULL,
  source_file_type  text NOT NULL CHECK (source_file_type IN ('csv', 'xlsx', 'pdf', 'image', 'manual')),
  mapping_status    text NOT NULL CHECK (mapping_status IN ('awaiting_upload', 'processing', 'staged', 'confirmed', 'failed', 'superseded')),
  mapping_version   integer NOT NULL DEFAULT 1,
  -- Written from analytics' results (§6.4): {ok, codes[], mapping_version, warnings[]}.
  validation        jsonb,
  error_code        text,
  object_key        text,
  idempotency_key   text,
  superseded_by     uuid REFERENCES fin_statement (id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  confirmed_at      timestamptz
);
CREATE UNIQUE INDEX fin_statement_idempotency ON fin_statement (org_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND mapping_status <> 'failed';
CREATE INDEX fin_statement_org_period ON fin_statement (org_id, period, kind);
ALTER TABLE fin_statement ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_statement FORCE ROW LEVEL SECURITY;
CREATE POLICY fin_statement_tenant ON fin_statement USING (app_org_visible(org_id)) WITH CHECK (app_org_visible(org_id));

CREATE TABLE line_item (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id   uuid NOT NULL REFERENCES fin_statement (id) ON DELETE CASCADE,
  org_id         uuid NOT NULL REFERENCES org (id) ON DELETE CASCADE,
  position       integer NOT NULL,
  canonical_key  text,
  source_label   text NOT NULL DEFAULT '',
  amount         numeric(20, 2) NOT NULL,
  status         text NOT NULL CHECK (status IN ('mapped', 'unmapped')),
  confidence     real,
  mapped_by      text NOT NULL CHECK (mapped_by IN ('ai', 'user')),
  derived        boolean NOT NULL DEFAULT false
);
CREATE INDEX line_item_statement ON line_item (statement_id, position);
ALTER TABLE line_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_item FORCE ROW LEVEL SECURITY;
CREATE POLICY line_item_tenant ON line_item USING (app_org_visible(org_id)) WITH CHECK (app_org_visible(org_id));

CREATE TABLE ratio_report (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES org (id) ON DELETE CASCADE,
  period        text NOT NULL,
  ratios        jsonb NOT NULL,
  data_version  bigint NOT NULL,
  computed_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, period)
);
ALTER TABLE ratio_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratio_report FORCE ROW LEVEL SECURITY;
CREATE POLICY ratio_report_tenant ON ratio_report USING (app_org_visible(org_id)) WITH CHECK (app_org_visible(org_id));

CREATE TABLE tax_profile (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL UNIQUE REFERENCES org (id) ON DELETE CASCADE,
  jurisdiction         text NOT NULL DEFAULT 'NG',
  taxpayer_kind        text NOT NULL CHECK (taxpayer_kind IN ('individual', 'company')),
  tin                  text,
  state_of_residence   text,
  rc_number            text,
  nin                  text,
  category_treatments  jsonb NOT NULL DEFAULT '{}',
  annual_rent          numeric(18, 2),
  deductions           jsonb NOT NULL DEFAULT '{}',
  updated_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tax_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_profile FORCE ROW LEVEL SECURITY;
CREATE POLICY tax_profile_tenant ON tax_profile USING (app_org_visible(org_id)) WITH CHECK (app_org_visible(org_id));

CREATE TABLE tax_estimate (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES org (id) ON DELETE CASCADE,
  kind             text NOT NULL CHECK (kind IN ('pit', 'cit', 'vat')),
  period           text NOT NULL,
  amount_due       numeric(18, 2) NOT NULL,
  due_date         date NOT NULL,
  computed_fields  jsonb NOT NULL,
  authority        jsonb NOT NULL,
  ruleset_id       text NOT NULL,
  estimate_only    boolean NOT NULL,
  banners          jsonb NOT NULL DEFAULT '[]',
  data_version     bigint NOT NULL,
  computed_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, kind, period)
);
ALTER TABLE tax_estimate ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_estimate FORCE ROW LEVEL SECURITY;
CREATE POLICY tax_estimate_tenant ON tax_estimate USING (app_org_visible(org_id)) WITH CHECK (app_org_visible(org_id));

CREATE TABLE tax_filing (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES org (id) ON DELETE CASCADE,
  kind             text NOT NULL CHECK (kind IN ('pit', 'cit', 'vat')),
  period           text NOT NULL,
  status           text NOT NULL CHECK (status IN ('draft', 'generated', 'submitted', 'accepted')),
  amount_due       numeric(18, 2),
  due_date         date,
  computed_fields  jsonb,
  authority        jsonb,
  ruleset_id       text,
  artifact_key     text,
  filed_at         timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tax_filing ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_filing FORCE ROW LEVEL SECURITY;
CREATE POLICY tax_filing_tenant ON tax_filing USING (app_org_visible(org_id)) WITH CHECK (app_org_visible(org_id));

CREATE TABLE bank_link (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES org (id) ON DELETE CASCADE,
  provider            text NOT NULL DEFAULT 'mono',
  institution         text,
  masked_account      text,
  -- KMS-encrypted; never serialized or logged (§8).
  provider_token_enc  bytea,
  sync_cursor         text,
  status              text NOT NULL CHECK (status IN ('pending', 'active', 'reauth_required', 'degraded', 'paused')),
  consecutive_failures integer NOT NULL DEFAULT 0,
  auto_confirm        boolean NOT NULL DEFAULT false,
  last_synced_at      timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bank_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_link FORCE ROW LEVEL SECURITY;
CREATE POLICY bank_link_tenant ON bank_link USING (app_org_visible(org_id)) WITH CHECK (app_org_visible(org_id));

-- Raw provider webhooks, stored before anything acts on them (§5.2).
CREATE TABLE provider_event (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider     text NOT NULL,
  provider_id  text NOT NULL,
  payload      jsonb NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  handled_at   timestamptz,
  UNIQUE (provider, provider_id)
);

CREATE TABLE report_artifact (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES org (id) ON DELETE CASCADE,
  kind        text NOT NULL,
  format      text NOT NULL CHECK (format IN ('pdf', 'csv', 'json')),
  period      text,
  params      jsonb NOT NULL DEFAULT '{}',
  status      text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  object_key  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE report_artifact ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_artifact FORCE ROW LEVEL SECURITY;
CREATE POLICY report_artifact_tenant ON report_artifact USING (app_org_visible(org_id)) WITH CHECK (app_org_visible(org_id));

CREATE TABLE purge_request (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  status        text NOT NULL CHECK (status IN ('pending', 'cancelled', 'executed')),
  requested_at  timestamptz NOT NULL DEFAULT now(),
  effective_at  timestamptz NOT NULL
);
CREATE UNIQUE INDEX purge_request_pending ON purge_request (user_id) WHERE status = 'pending';
