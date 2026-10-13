#!/bin/sh
# Creates the CueLABS shared bus lanes (system-design.md §5.3, §16 I-18) on
# the compose broker. In cloud every product shares one Kafka service with
# these same three topics. Idempotent.
set -eu
BOOTSTRAP="$1"
TOPICS=/opt/kafka/bin/kafka-topics.sh
DAY_MS=86400000

# Two partitions each, as on the shared service; 24 h retention.
for topic in cuelabs.uploads cuelabs.requests cuelabs.results; do
  "$TOPICS" --bootstrap-server "$BOOTSTRAP" --create --if-not-exists --topic "$topic" \
    --partitions 2 --replication-factor 1 --config retention.ms=$DAY_MS
done

# Expendit-only topics from before the shared bus; dropped so a reused
# volume matches the cloud.
for topic in config.rulesets import.ready import.processed statement.ready statement.mapped \
  upload.received extract.requested extract.results compute.requested compute.results; do
  "$TOPICS" --bootstrap-server "$BOOTSTRAP" --delete --if-exists --topic "expendit.$topic"
done

"$TOPICS" --bootstrap-server "$BOOTSTRAP" --list | grep '^cuelabs\.'
