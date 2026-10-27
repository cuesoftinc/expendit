-- Request ids on the shared bus (CueLABS shared-messaging.md rules 1, 8, 9):
-- every request carries one, a re-send keeps it, and its result echoes it.
ALTER TABLE outbox ADD COLUMN request_id uuid;
ALTER TABLE import_job ADD COLUMN request_id uuid;
ALTER TABLE fin_statement ADD COLUMN request_id uuid;

-- One pending compute request per (org, kind, scope, data_version); reads
-- reuse it instead of queuing another. The first result per request_id
-- wins; the reaper re-sends an overdue request once and expires it at
-- 10 minutes. scope: the period, statement_id:mapping_version, or ''.
CREATE TABLE compute_request (
  request_id    uuid PRIMARY KEY,
  org_id        uuid NOT NULL REFERENCES org (id) ON DELETE CASCADE,
  kind          text NOT NULL,
  scope         text NOT NULL DEFAULT '',
  data_version  bigint NOT NULL,
  outbox_id     bigint,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  resent_at     timestamptz,
  result_at     timestamptz,
  completed_at  timestamptz,
  status        text CHECK (status IN ('ok', 'failed', 'expired'))
);
CREATE UNIQUE INDEX compute_request_pending ON compute_request (org_id, kind, scope, data_version)
  WHERE completed_at IS NULL;
CREATE INDEX compute_request_open ON compute_request (requested_at) WHERE completed_at IS NULL;
ALTER TABLE compute_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE compute_request FORCE ROW LEVEL SECURITY;
CREATE POLICY compute_request_tenant ON compute_request USING (app_org_visible(org_id)) WITH CHECK (app_org_visible(org_id));
