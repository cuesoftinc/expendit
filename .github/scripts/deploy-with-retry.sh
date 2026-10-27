#!/usr/bin/env bash
# Usage: deploy-with-retry.sh <command...>; retries only when Cloud Run cannot pull the image yet.
set -uo pipefail
attempts=0
log=$(mktemp)
while :; do
  attempts=$((attempts + 1))
  "$@" 2>&1 | tee "$log"
  status=${PIPESTATUS[0]}
  [ "$status" -eq 0 ] && exit 0
  [ "$attempts" -lt 6 ] || exit "$status"
  grep -qE 'not found|Container import failed' "$log" || exit "$status"
  delay=$((60 + (attempts - 1) * 6))
  echo "Cloud Run cannot pull the image yet, retrying in ${delay}s (attempt ${attempts} of 6)"
  sleep "$delay"
done
