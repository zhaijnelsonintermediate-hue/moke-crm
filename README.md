# MOKE CRM MVP

MOKE CRM MVP is packaged as a static Vercel-ready site.

## Local Build

```bash
npm install
npm run build
npm run dev
```

If npm is not available in the current terminal, run the bundled Node build script directly:

```bash
node scripts/build-static.js
node scripts/serve-static.js
```

Then open:

```text
http://127.0.0.1:8765
```

## Vercel

The project uses:

- Build Command: `npm run build`
- Output Directory: `public`

`vercel.json` already contains this configuration.

## Source Files

- `outputs/moke-crm-mvp.html`: CRM MVP source page
- `outputs/moke-crm-imported-data.js`: full realistic demo dataset
- `public/index.html`: generated deployable entry page
- `public/moke-crm-mvp.html`: generated deployable CRM page
- `public/moke-crm-imported-data.js`: generated deployable demo data

## Environment Variables

No runtime secret is hardcoded in the deployed static app.

The Prisma schema references `DATABASE_URL`, but the current static MVP does not use it at runtime.
