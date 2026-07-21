# Next.js production image (standalone). node:*-slim (glibc) — Next's Turbopack
# build workers are unreliable on Alpine, and Next 16 needs Node 20+.
# Build context is the REPO ROOT (docker-compose `context: .`,
# `dockerfile: web/Dockerfile`): prebuild embeds the canonical OpenAPI
# document (docs/api/openapi.yaml) as a string asset, so the spec must
# ship into the context alongside web/. Context contents are pruned by
# web/Dockerfile.dockerignore (BuildKit per-Dockerfile ignore).
# ---- deps ----
FROM node:24-slim AS deps
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci

# ---- builder ----
FROM node:24-slim AS builder
WORKDIR /app/web
COPY --from=deps /app/web/node_modules ./node_modules
COPY web/ ./
COPY docs/api/openapi.yaml /app/docs/api/openapi.yaml
# NEXT_PUBLIC_* are inlined at build time.
ARG NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
RUN npm run build

# ---- runner ----
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/web/public ./public
COPY --from=builder --chown=node:node /app/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/web/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "server.js"]
