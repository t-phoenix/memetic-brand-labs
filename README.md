# Memetic Brand Labs

Monorepo for **Memetic Brand Labs** marketing site and the **Narrative Engine** — a six-layer LLM pipeline that diagnoses founder messaging and produces four structured narrative cards.

## What's in this repo

| Path | Purpose | Deploy target |
|------|---------|---------------|
| [`frontend/`](frontend/) | React + Vite site, NE UI, admin dashboard | **Vercel** |
| [`narrative-engine-api/`](narrative-engine-api/) | Fastify API, pipeline orchestrator, admin API | **Render** (web + worker) |
| [`supabase/`](supabase/) | Postgres migrations, seeds, patterns | **Supabase** |
| [`docs/narrative-engine/`](docs/narrative-engine/) | Specs, runbooks, deployment |

## Documentation map

| Doc | When to read |
|-----|----------------|
| **[Supabase CLI cheatsheet](supabase/CLI-CHEATSHEET.md)** | Crash course + command reference |
| **[Dev & prod guide](supabase/DEV-PROD.md)** | Project ref, safe DB workflow (developers & AI) |
| **[Environments & dev/prod](docs/narrative-engine/environments.md)** | Env var matrices, staging, Redis modes |
| **[Feature development workflow](docs/narrative-engine/feature-development.md)** | Adding features, schema changes, new engine versions |
| **[Architecture](docs/narrative-engine/architecture.md)** | System design, pipeline layers, API surface |
| **[Deployment](docs/narrative-engine/deployment.md)** | Production setup on Supabase + Render + Vercel |
| **[Admin dashboard](docs/narrative-engine/admin-dashboard.md)** | `/admin` ops UI |
| **[Database spec](docs/narrative-engine/database-spec.md)** | Tables, views, write path |
| **[Runbook](docs/narrative-engine/runbook.md)** | Incidents and operations |

## Quick start (local)

**Prerequisite:** Node 20+, a **dedicated dev Supabase project** (do not use production keys locally — see [environments.md](docs/narrative-engine/environments.md)).

```bash
# 1. Database — from repo root
supabase link --project-ref YOUR_DEV_REF
supabase db push
supabase db query --linked -f supabase/seed/seed.sql

# 2. API
cd narrative-engine-api
cp .env.example .env    # fill Supabase + OpenAI; leave REDIS_URL empty for local
npm install
npm run config:all
npm run seed:patterns
npm run dev             # http://localhost:3001

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env
pnpm install
pnpm dev                # http://localhost:5173
```

| URL | Purpose |
|-----|---------|
| http://localhost:5173/narrative-engine | User flow |
| http://localhost:5173/admin | Admin dashboard |
| http://localhost:3001/health | API health |

Verify: `curl http://localhost:3001/health` → `{"status":"ok",...}`

## Environment strategy (summary)

| | Development | Production |
|---|-------------|------------|
| **Supabase** | Separate **dev** project | **Prod** project |
| **Render** | Not used — API runs locally | Web + worker services |
| **Vercel** | `pnpm dev` locally | Production deploy |
| **Redis** | Omit `REDIS_URL` (inline pipeline) or local Redis + worker | Upstash `rediss://` |
| **Secrets** | `narrative-engine-api/.env`, `frontend/.env` | Render / Vercel dashboards only |

Use **separate databases**, not row-level “dev flags” in production. See [environments.md](docs/narrative-engine/environments.md) for rationale.

## Common commands

```bash
# API
cd narrative-engine-api && npm test && npm run smoke

# After editing prompts/schemas in config/narrative-engine/
npm run config:all

# New migration
# Add supabase/migrations/YYYYMMDDHHMMSS_description.sql then supabase db push
```

## Production stack

```
Vercel (frontend) → Render (API) → Upstash Redis → Render (worker)
                              ↘ Supabase (Postgres + Storage)
```

Full guide: [docs/narrative-engine/deployment.md](docs/narrative-engine/deployment.md)

## Security

- Never commit `.env` files — use `.env.example` as templates
- Run `./scripts/verify-no-secrets.sh` before pushing
- `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_API_KEY` are **server-only**
