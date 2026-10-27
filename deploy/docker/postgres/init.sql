-- Runs once, on an empty data directory. api/common connects as
-- expendit_app: a non-superuser that owns its database, so FORCE row-level
-- security applies to it (S-11). Superusers bypass RLS entirely.
CREATE ROLE expendit_app LOGIN PASSWORD 'expendit_app' NOSUPERUSER NOBYPASSRLS;
CREATE DATABASE expendit OWNER expendit_app;
