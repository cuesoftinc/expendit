#!/usr/bin/env bash
# Usage: deploy-with-retry.sh <command...>; retries only when Cloud Run cannot pull the image yet.
set -uo pipefail
attempts=0
log=$(mktemp)
# Retry pull errors for up to 20 minutes after the first attempt.
deadline=$((SECONDS + 1200))
while :; do
  attempts=$((attempts + 1))
  "$@" 2>&1 | tee "$log"
  status=${PIPESTATUS[0]}
  [ "$status" -eq 0 ] && exit 0
  grep -qE 'not found|Container import failed' "$log" || exit "$status"
  [ "$SECONDS" -lt "$deadline" ] || exit "$status"
  echo "Cloud Run cannot pull the image yet, retrying in 60s (attempt ${attempts}, up to 20 minutes)"
  sleep 60
done
