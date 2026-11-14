-- The outbox publisher leases a batch instead of holding its row locks while
-- it writes to storage and Kafka; a lease that lapses lets another pass retry.
SET LOCAL lock_timeout = '10s';
ALTER TABLE outbox ADD COLUMN lease_until timestamptz, ADD COLUMN lease_owner text;
