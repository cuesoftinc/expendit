-- Re-send from Postgres (system-design.md §16 I-17): keep the upload pointer
-- a job or statement was queued with, so the reaper can queue it again once
-- if the message was lost (e.g. the shared Aiven Kafka powered off and dropped
-- its topic data). resent_at makes that a single retry.
ALTER TABLE import_job ADD COLUMN upload jsonb, ADD COLUMN resent_at timestamptz;
ALTER TABLE fin_statement ADD COLUMN upload jsonb, ADD COLUMN processing_at timestamptz,
  ADD COLUMN resent_at timestamptz;
