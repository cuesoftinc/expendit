-- The outbox stores the event type; the publisher maps it to a topic, since
-- one topic can carry several events (system-design.md §16 I-16).
ALTER TABLE outbox RENAME COLUMN topic TO event;
