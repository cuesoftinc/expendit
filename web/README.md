# Expendit Web (`web`)

Next.js 16 (App Router, TypeScript) front-end for the Expendit expense
tracker: marketing site plus the authenticated app (transactions, imports,
accounts, reports, company, taxes, categories, settings).

## Run

From the repo root (recommended): `make up` → http://localhost:3000

Dev server:

```bash
npm install
npm run dev
```

`NEXT_PUBLIC_*` values are inlined at build time — set them in the root `.env`
(see `.env.example`).

## Test

```bash
npm test
npm run test:e2e
```
