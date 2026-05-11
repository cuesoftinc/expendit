#!/bin/bash
set -euo pipefail

echo "=== Step 1: Rename casing of existing directories ==="
mv Deploy deploy
mv Docs docs

echo "=== Step 2: Move Home → web/ (root Next.js app) ==="
mv Home web
mkdir -p web/supabase   

echo "=== Step 3: Extract k8s from App BEFORE App is removed ==="
mkdir -p deploy/k8s
mv App/k8s/* deploy/k8s/
rm -rf App/k8s

echo "=== Step 4: Move App → web/dashboard/ ==="
mkdir -p web/dashboard
mv App/__tests__ App/public App/src \
   App/.env App/.eslintrc.json App/.gitignore \
   App/Dockerfile App/README.md App/jest.config.js \
   App/next.config.js App/package-lock.json App/package.json \
   App/postcss.config.js App/tailwind.config.ts web/dashboard/
rm -rf App

echo "=== Step 5: Move CommonServer → api/nodejs/ ==="
mkdir -p api/nodejs api/go api/python   
mv CommonServer/* api/nodejs/
shopt -s dotglob
mv CommonServer/* api/nodejs/ 2>/dev/null || true
shopt -u dotglob
rm -rf CommonServer

echo "=== Step 6: Set up deploy/ structure ==="
mkdir -p deploy/docker deploy/helm deploy/terraform   
mv compose.yaml deploy/docker/compose.yaml

echo "=== Step 7: Create mobile app stubs ==="
mkdir -p app/android app/ios app/flutter   

echo "=== Step 8: Create root config file stubs ==="
touch -a .dockerignore .editorconfig .env.example Makefile

echo "=== Step 9: Fix root package.json scripts ==="
sed -i \
  -e 's|cd App |cd web/dashboard |g' \
  -e 's|App/src/\*\*|web/dashboard/src/**|g' \
  -e 's|lint:App|lint:dashboard|g' \
  -e 's|pre-push:App|pre-push:dashboard|g' \
  -e 's|lint:Home|lint:web|g' \
  -e 's|pre-push:Home|pre-push:web|g' \
  -e 's|cd Home |cd web |g' \
  -e 's|src/\*\*|web/src/**|g' \
  package.json

echo "=============== Completed ====================="
