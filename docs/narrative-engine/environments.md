# Environments — Development vs Production

How to segregate **local development**, **staging** (optional), and **production** when using Supabase, Render, and Vercel.

---

## Recommended model: separate infrastructure per environment

| Layer | Local dev | Staging (optional) | Production |
|-------|-----------|-------------------|------------|
| **Supabase** | Dev project (`epn…` ref) | Staging project | Prod project |
| **API** | `localhost:3001` | Render preview service | Render web service |
| **Worker** | Inline (no Redis) or local Redis | Render worker | Render worker |
| **Redis** | Empty `REDIS_URL` | Upstash staging DB | Upstash prod DB |
| **Frontend** | `localhost:5173` | Vercel Preview | Vercel Production |
| **LLM keys** | Dev OpenAI key (budget limits) | Staging key | Prod key |
| **Admin key** | `local-dev-admin` in `.env` | Staging secret | Strong prod secret |

### Why not “flags” in the production database?

| Approach | Verdict |
|----------|---------|
| `is_test` / `environment` column on prod tables | **Avoid** — easy to leak test data into analytics, hard to clean up, risky migrations |
| `run_source = admin_test` on `engine_runs` | **OK** — marks sandbox runs **within** an environment; exclude from revenue KPIs |
| **Separate Supabase project per environment** | **Best** — schema migrations tested on dev before prod; no cross-contamination |

**Rule:** Feature flags in **application config** (env vars, Vite flags) are fine. **Data environment** is determined by which Supabase URL you connect to — not a column in prod.

---

## Local development (closest to production)

Goal: same code paths as prod with minimal infrastructure differences.

### What should match production

| Concern | Local setup |
|---------|-------------|
| Postgres schema | Same migrations via `supabase db push` on **dev** project |
| Pipeline code | Same `PipelineOrchestrator` — no mock LLM in normal dev |
| Config | Same `config/narrative-engine/` → `config:sync` to dev DB |
| Auth model | Same Supabase anon key on frontend (dev project) |
| CORS | `CORS_ORIGIN=http://localhost:5173` |

### Acceptable differences (documented)

| Concern | Local | Production | Impact |
|---------|-------|------------|--------|
| Redis / queue | **No `REDIS_URL`** → inline processing | Upstash + worker | Timing only; same pipeline logic |
| `NODE_ENV` | `development` | `production` | Redis localhost ignored on Render |
| `WORKER_MODE` | `false` | `false` web / `true` worker | N/A locally without Redis |
| NE discovery links | Shown (`import.meta.env.DEV`) | Hidden | UI only |
| x402 payments | Optional / skipped | Live on rerun | Test reruns on staging |
| Render cold starts | N/A | 30s+ on free tier | N/A locally |

### Local `.env` checklist (`narrative-engine-api/.env`)

```bash
NODE_ENV=development
APP_ENV=development          # optional — see env.ts
PORT=3001

# DEV Supabase only — never prod service role on your laptop
SUPABASE_URL=https://YOUR_DEV_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...

OPENAI_API_KEY=sk-...        # dev key with spend limit
CORS_ORIGIN=http://localhost:5173
ADMIN_API_KEY=local-dev-admin-key

# Leave empty for simplest local path (inline pipeline, no worker)
REDIS_URL=
WORKER_MODE=false

STORAGE_BUCKET=share-graphics
IP_HASH_SALT=local-dev-salt
```

**Do not** point local `.env` at production Supabase unless you are doing a one-off prod debug — and never run Playground or migrations against prod from a laptop.

### Local `.env` checklist (`frontend/.env`)

```bash
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://YOUR_DEV_REF.supabase.co
VITE_SUPABASE_ANON_KEY=...
# VITE_ADMIN_API_KEY=local-dev-admin-key   # optional; or enter at /admin gate
```

### Optional: local Redis (mirrors prod queue)

```bash
brew install redis && redis-server
# narrative-engine-api/.env
REDIS_URL=redis://localhost:6379
WORKER_MODE=false   # terminal 1: npm run dev
# terminal 2: npm run build && npm run worker
```

Use **Upstash dev database** only if you need to test TLS (`rediss://`) — use a **separate** Upstash instance from production.

---

## Staging (optional but recommended before big releases)

1. Create **staging Supabase** project → apply migrations → seed.
2. Render **staging** web + worker (or single web with inline for cost savings).
3. Vercel **Preview** env vars pointing to staging API.
4. Run smoke test + one full narrative run before promoting to prod.

| Variable | Staging example |
|----------|-----------------|
| `CORS_ORIGIN` | `https://memetic-brand-labs-git-staging-*.vercel.app` |
| `VITE_API_URL` | `https://memetic-api-staging.onrender.com` |

---

## Production

See [deployment.md](./deployment.md). Summary:

- **Supabase:** prod project, migrations via `supabase db push` in CI or manual from release branch
- **Render:** `WORKER_MODE=false` on web, `true` on worker; `REDIS_URL=rediss://...upstash.io:6379`
- **Vercel:** `VITE_API_URL` → prod Render URL; no admin key in frontend env

---

## Switching between environments safely

| Action | Safe? |
|--------|-------|
| Change `SUPABASE_URL` in `.env` and restart API | Yes — switches entire data plane |
| `supabase link --project-ref OTHER_REF` + `db push` | Yes — targets linked project only |
| Run Playground on prod with admin key | **Dangerous** — costs real LLM $; use dev/staging |
| `config:sync` while linked to prod | **Careful** — overwrites prod prompt tables |

**Tip:** Name projects clearly in Supabase dashboard: `mbl-ne-dev`, `mbl-ne-prod`.

---

## Vercel environment matrix

| Variable | Development | Preview | Production |
|----------|-------------|---------|------------|
| `VITE_API_URL` | `http://localhost:3001` | Staging API URL | Prod Render URL |
| `VITE_SUPABASE_*` | Dev project | Staging project | Prod project |
| `VITE_NE_DISCOVERY` | auto (dev) | `false` | `false` |
| `VITE_ADMIN_API_KEY` | optional local | **never** | **never** |

---

## Render environment matrix

| Variable | Local | Prod web | Prod worker |
|----------|-------|----------|-------------|
| `NODE_ENV` | development | production | production |
| `APP_ENV` | development | production | production |
| `WORKER_MODE` | false | false | true |
| `REDIS_URL` | (empty) | rediss Upstash | same as web |
| `CORS_ORIGIN` | localhost:5173 | Vercel prod URL | N/A |
| `ADMIN_API_KEY` | dev secret | prod secret | N/A |

---

## Testing pyramid (minimize prod bugs)

1. **Unit tests** — `cd narrative-engine-api && npm test` (no network)
2. **Local integration** — API + dev Supabase + one real OpenAI run (~$0.05)
3. **Smoke script** — `npm run smoke` against local or staging API
4. **Admin Playground** — layer-by-layer on dev DB before full pipeline changes ship
5. **Staging deploy** — full stack before prod
6. **Prod smoke** — `GET /health` + one monitored run after deploy

---

## Related

- [feature-development.md](./feature-development.md) — how to ship schema + code changes
- [deployment.md](./deployment.md) — production cutover
- [supabase/README.md](../../supabase/README.md) — migrations and seed
