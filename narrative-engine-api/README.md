# Narrative Engine API

Node.js/TypeScript Fastify service for Memetic Brand Labs Narrative Engine.

**Related docs:** [Supabase setup](../supabase/README.md) · [Frontend](../frontend/README.md) · [docs/narrative-engine/](../docs/narrative-engine/)

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | API runtime |
| npm | 9+ | Dependencies |
| Supabase project | — | Postgres, Auth, Storage |
| OpenAI API key | — | LLM pipeline (required) |
| Redis | optional | Async job queue (recommended for prod) |

---

## Run locally

### 1. Database (do this first)

Follow [supabase/README.md](../supabase/README.md) to apply migrations, seed data, and create the `share-graphics` storage bucket.

You need these values from the Supabase dashboard (**Project Settings → API**):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server only — never expose to the browser)
- `SUPABASE_ANON_KEY` (optional locally; used for JWT validation)

### 2. Configure environment

```bash
cd narrative-engine-api
cp .env.example .env
```

Edit `.env`:

```bash
# Required
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
CORS_ORIGIN=http://localhost:5173

# Recommended for local dev (without Redis, runs process inline on each request)
NODE_ENV=development
PORT=3001

# Optional
ANTHROPIC_API_KEY=sk-ant-...          # Quality tier / Claude models
REDIS_URL=redis://localhost:6379      # If set, use worker: npm run worker
SUPABASE_ANON_KEY=eyJ...              # For JWT auth on protected routes
ADMIN_API_KEY=local-dev-admin-key     # Header: X-Admin-Key

# Payments (reruns) — leave empty to skip x402 locally
X402_PAY_TO=0xYourBaseWallet
X402_FACILITATOR_URL=https://x402.org/facilitator
RERUN_PRICE_USDC=10

# Misc
IP_HASH_SALT=any-random-string
STORAGE_BUCKET=share-graphics
```

| Variable | Required | Notes |
|----------|----------|-------|
| `SUPABASE_URL` | Yes | Project API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Bypasses RLS for server writes |
| `OPENAI_API_KEY` | Yes | All model tiers use OpenAI unless Anthropic key set |
| `CORS_ORIGIN` | Yes | Frontend origin (`http://localhost:5173` locally) |
| `REDIS_URL` | No | Omit → pipeline runs inline (fine for dev) |
| `WORKER_MODE` | No | `true` only on Render worker service |
| `X402_PAY_TO` | No | Omit → rerun endpoint still returns 402 but payment not enforced in dev |

### 3. Install and start

```bash
npm install
npm run dev          # API at http://localhost:3001
```

In a **second terminal** (only if `REDIS_URL` is set):

```bash
npm run worker
```

### 4. Verify

```bash
curl http://localhost:3001/health
# → {"status":"ok","version":"ne-v1.0.0"}

curl http://localhost:3001/v1/pricing-tiers
```

### Config sync (prompts, schemas, enums)

**Source of truth:** `config/narrative-engine/` (aligned with Architecture doc §3.4).

| Command | When |
|---------|------|
| `npm run config:generate` | After editing config JSON — writes `supabase/seed/generated/narrative-config.sql` |
| `npm run config:sync` | Push to Supabase (`prompt_templates`, `schema_registry`, `enum_definitions`) |
| `npm run config:all` | Both — run after any prompt/schema change |

`predev` auto-runs `config:generate`. Run `config:sync` when the remote DB should match.

### 5. Run the frontend

See [frontend/README.md](../frontend/README.md). With both running:

- UI: `http://localhost:5173/narrative-engine`
- API: `http://localhost:3001`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API server with hot reload (`tsx watch`) |
| `npm run config:generate` | Regenerate SQL + mirror schemas from `config/narrative-engine/` |
| `npm run config:sync` | Push config to Supabase |
| `npm run config:all` | Generate + sync |
| `npm run smoke` | Endpoint smoke test script |
| `npm run seed:patterns` | Load 30 patterns into Supabase |
| `npm run worker` | BullMQ worker — **requires `REDIS_URL`** |
| `npm test` | Unit tests |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled server (production) |

---

## Deploy (Render)

Full step-by-step: **[docs/narrative-engine/deployment.md](../docs/narrative-engine/deployment.md)** — Supabase, Upstash Redis (cheapest), Render web + worker, Vercel CORS.

Quick summary:

### 1. Supabase production

Complete [supabase/README.md § Deploy](../supabase/README.md) on your **production** Supabase project.

### 2. Redis (recommended)

Create a Render Redis instance (or Upstash). Copy the connection URL → `REDIS_URL`.

Without Redis, the web service processes runs inline (works for low traffic, not ideal for prod).

### 3. Render web service

| Setting | Value |
|---------|-------|
| Root Directory | `narrative-engine-api` |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |

Use **npm**, not yarn. Node **20** (see `.node-version`).

1. [Render Dashboard](https://dashboard.render.com) → **New → Blueprint** → connect this repo (or create Web Service manually with settings above).
2. Add environment variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | Production Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `OPENAI_API_KEY` | Production OpenAI key |
| `ANTHROPIC_API_KEY` | Optional |
| `REDIS_URL` | Redis connection string |
| `CORS_ORIGIN` | `https://memetic.adpr.work` (or your Vercel URL) |
| `X402_PAY_TO` | Base treasury wallet |
| `RERUN_PRICE_USDC` | `10` |
| `ADMIN_API_KEY` | Strong random secret |
| `IP_HASH_SALT` | Strong random secret |
| `STORAGE_BUCKET` | `share-graphics` |

4. Deploy → note the URL (e.g. `https://narrative-engine-api.onrender.com`).

### 4. Render worker service

Same env vars as web (at minimum `REDIS_URL`, `SUPABASE_*`, `OPENAI_API_KEY`).

- Start command: `npm run worker`

### 5. Frontend (Vercel)

Set `VITE_API_URL` to your Render API URL. See [frontend/README.md § Deploy](../frontend/README.md).

### 6. Smoke test

```bash
curl https://YOUR-API.onrender.com/health
curl https://YOUR-API.onrender.com/v1/pricing-tiers
```

Submit a test run from `/narrative-engine` on the deployed frontend.

---

## Documentation

- [PRD](../docs/narrative-engine/PRD.md)
- [TDD](../docs/narrative-engine/TDD.md)
- [Database spec](../docs/narrative-engine/database-spec.md)
- [OpenAPI](../docs/narrative-engine/openapi.yaml)
- [Runbook](../docs/narrative-engine/runbook.md)
- [Launch checklist](../docs/narrative-engine/launch-checklist.md)
