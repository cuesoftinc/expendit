#!/bin/sh
# Creates the expendit.* topics (system-design.md §5.3) on the compose broker.
# Aiven gets the same set from Terraform/the console. Idempotent.
set -eu
BOOTSTRAP="$1"
TOPICS=/opt/kafka/bin/kafka-topics.sh
DAY_MS=86400000

# Compacted: the latest rule set per id is the current one (S-10).
"$TOPICS" --bootstrap-server "$BOOTSTRAP" --create --if-not-exists --topic expendit.config.rulesets \
  --partitions 1 --replication-factor 1 --config cleanup.policy=compact

# Financial data: 24 h retention on every hand-off topic (§5.3).
for topic in upload.received import.ready import.processed statement.ready statement.mapped compute.requested compute.results; do
  "$TOPICS" --bootstrap-server "$BOOTSTRAP" --create --if-not-exists --topic "expendit.$topic" \
    --partitions 3 --replication-factor 1 --config retention.ms=$DAY_MS
done

"$TOPICS" --bootstrap-server "$BOOTSTRAP" --list | grep '^expendit\.'
