#!/usr/bin/env bash
# Usage: deploy-with-retry.sh <command...>; retries only when Cloud Run cannot pull the image yet.
set -uo pipefail
attempts=0
log=$(mktemp)
image=""
prev=""
for arg in "$@"; do
  [ "$prev" = "--image" ] && image=$arg
  case "$arg" in --image=*) image=${arg#--image=} ;; esac
  prev=$arg
done
accept='application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.oci.image.manifest.v1+json,application/vnd.docker.distribution.manifest.v2+json'

# Cloud Run pulls Docker Hub images through mirror.gcr.io, which can miss a fresh push for many minutes until the image is fetched through it.
warm() {
  local ref=${image#docker.io/} repo tag manifest child blobs=0
  case "${ref%%/*}" in *.* | *:*) return 0 ;; esac
  [ -n "$ref" ] || return 0
  if [[ $ref == *@* ]]; then
    repo=${ref%@*} tag=${ref#*@}
  elif [[ ${ref##*/} == *:* ]]; then
    repo=${ref%:*} tag=${ref##*:}
  else
    repo=$ref tag=latest
  fi
  [[ $repo == */* ]] || repo="library/$repo"
  manifest=$(curl -fsSL -H "Accept: $accept" "https://mirror.gcr.io/v2/$repo/manifests/$tag" 2>/dev/null) || return 0
  for child in $(jq -r '.manifests[]?.digest' <<<"$manifest"); do
    manifest+=$'\n'$(curl -fsSL -H "Accept: $accept" "https://mirror.gcr.io/v2/$repo/manifests/$child" 2>/dev/null)
  done
  for blob in $(jq -r '.config.digest?, .layers[]?.digest' <<<"$manifest" 2>/dev/null | grep '^sha256:' | sort -u); do
    curl -fsSL -o /dev/null "https://mirror.gcr.io/v2/$repo/blobs/$blob" 2>/dev/null && blobs=$((blobs + 1))
  done
  echo "Fetched $blobs blobs of $repo@$tag through mirror.gcr.io"
}

# Retry pull errors for up to 20 minutes after the first attempt.
deadline=$((SECONDS + 1200))
while :; do
  attempts=$((attempts + 1))
  warm
  "$@" 2>&1 | tee "$log"
  status=${PIPESTATUS[0]}
  [ "$status" -eq 0 ] && exit 0
  grep -qE 'not found|Container import failed' "$log" || exit "$status"
  [ "$SECONDS" -lt "$deadline" ] || exit "$status"
  echo "Cloud Run cannot pull the image yet, retrying in 60s (attempt ${attempts}, up to 20 minutes)"
  sleep 60
done
