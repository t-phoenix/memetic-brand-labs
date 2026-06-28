# Narrative Engine — Production Deployment

End-to-end guide: **Supabase** (database) · **Render** (API + worker) · **Upstash Redis** (queue) · **Vercel** (frontend).

---

## Architecture

```
┌─────────────────┐     HTTPS      ┌──────────────────────┐
│ Vercel          │ ──────────────▶│ Render Web Service   │
│ memetic.adpr.work│   VITE_API_URL │ narrative-engine-api │
│ /narrative-engine (hidden)      └──────────┬───────────┘
└─────────────────┘                          │
                                    enqueue   │  read/write
                                    jobs      ▼
┌─────────────────┐              ┌──────────────────────┐
│ Upstash Redis   │◀─────────────│ Render Worker        │
│ (BullMQ queue)  │   consume    │ narrative-engine-worker
└─────────────────┘              └──────────┬───────────┘
                                            │
                                            ▼
                                 ┌──────────────────────┐
                                 │ Supabase             │
                                 │ Postgres + Storage   │
                                 └──────────────────────┘
```

| Component | Host | Purpose |
|-----------|------|---------|
| Frontend | Vercel (`frontend/`) | Marketing site + hidden NE at `/narrative-engine` |
| API | Render web service | HTTP routes, enqueue pipeline jobs |
| Worker | Render worker service | Process pipeline jobs from Redis |
| Database | Supabase (existing project) | Runs, layers, costs, config |
| Queue | Upstash Redis (recommended) | BullMQ job queue |
| LLM | OpenAI (+ optional Anthropic) | Pipeline inference |

---

## 1. Supabase (production)

Your Supabase project is already configured. Before first production deploy:

```bash
# From repo root
supabase link --project-ref <your-project-ref>
supabase db push
supabase db query --linked -f supabase/seed/seed.sql
cd narrative-engine-api && npm run config:sync
npm run seed:patterns
```

### Storage bucket

In Supabase **Storage**, ensure bucket `share-graphics` exists (public read for OG images).

### Values for Render

From **Project Settings → API**:

| Variable | Where |
|----------|-------|
| `SUPABASE_URL` | Project URL (`https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key — **server only** |
| `SUPABASE_ANON_KEY` | anon key — optional on API for JWT validation |

### Auth redirects (when email gate is live)

**Authentication → URL Configuration:**

- **Site URL:** `https://memetic.adpr.work` (or your Vercel domain)
- **Redirect URLs:** `https://memetic.adpr.work/**`

---

## 2. Redis — cheapest option (Upstash)

Render Key Value starts around **$10/mo**. For low traffic, **Upstash free tier** is the cheapest path (~250K commands/day).

### Setup

1. [console.upstash.com](https://console.upstash.com) → **Create database**
2. Region: pick closest to Render (`us-west-1` / Oregon aligns with `render.yaml`)
3. Copy **Redis URL** (`rediss://default:...@...upstash.io:6379`)
4. Use the **same** `REDIS_URL` on **both** Render services (web + worker)

### Without Redis (not recommended for prod)

Omit `REDIS_URL` → API processes runs **inline** on the web dyno. Works for smoke tests; blocks HTTP during ~60s pipeline runs.

---

## 3. Render — API + worker

Repo includes [`render.yaml`](../../render.yaml).

### Apply Blueprint

```bash
git remote -v   # must be GitHub/GitLab/Bitbucket
git push origin main
```

Open (replace with your repo):

```
https://dashboard.render.com/blueprint/new?repo=https://github.com/YOUR_ORG/memetic-brand-labs
```

Click **Apply**, then fill secrets marked `sync: false`.

### Manual Dashboard settings (if not using Blueprint)

| Setting | Value |
|---------|-------|
| Root Directory | `narrative-engine-api` |
| Node version | **20** (`.node-version` in repo) |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Package manager | **npm** — not yarn |

`NODE_ENV=production` skips devDependencies on `npm ci`, so `--include=dev` is required for `tsc` during build. Runtime only needs `dist/` + production `node_modules`.

### Environment variables (web service)

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Set in blueprint |
| `WORKER_MODE` | `false` | Web dyno does **not** consume queue |
| `SUPABASE_URL` | `https://xxx.supabase.co` | |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Secret |
| `SUPABASE_ANON_KEY` | `eyJ...` | Optional |
| `OPENAI_API_KEY` | `sk-...` | Required |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Optional (quality tier) |
| `REDIS_URL` | `rediss://...upstash.io:6379` | Upstash URL |
| `CORS_ORIGIN` | `https://memetic.adpr.work` | **Production frontend origin** — comma-separate multiple |
| `ADMIN_API_KEY` | strong random | `X-Admin-Key` header for admin routes |
| `IP_HASH_SALT` | strong random | Session IP hashing |
| `STORAGE_BUCKET` | `share-graphics` | |
| `X402_PAY_TO` | `0x...` | Base treasury (optional until payments live) |
| `RERUN_PRICE_USDC` | `10` | |

### Environment variables (worker service)

Same as web for: `SUPABASE_*`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `REDIS_URL`, `IP_HASH_SALT`, `STORAGE_BUCKET`.

| Key | Value |
|-----|-------|
| `WORKER_MODE` | `true` |

Worker does **not** need `CORS_ORIGIN` or `ADMIN_API_KEY`.

### Worker split (important)

- **Web** (`npm start`): enqueues jobs when `REDIS_URL` is set; `WORKER_MODE=false`
- **Worker** (`node dist/jobs/worker.js`): consumes jobs; `WORKER_MODE=true`

Never run both with `WORKER_MODE=true` on the same dyno type twice — one worker service is enough.

### Verify API

```bash
export API=https://narrative-engine-api.onrender.com   # your Render URL

curl "$API/health"
# → {"status":"ok","version":"ne-v1.0.0"}

curl "$API/v1/pricing-tiers"
```

Submit a test run:

```bash
curl -X POST "$API/v1/narrative-runs" \
  -H "Content-Type: application/json" \
  -H "x-session-id: deploy-smoke-$(date +%s)" \
  -d '{"building":"SaaS tool","audience":"Founders","challenge":"Unclear pitch","differentiation":"AI narrative","model_tier":"fast"}'
```

Poll until `status: completed` (~60s with worker running).

---

## 4. Vercel — frontend

### Project settings

| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| Framework | Vite |
| Build | `npm run build` |
| Output | `dist` |

### Environment variables (Production)

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://narrative-engine-api.onrender.com` (no trailing slash) |
| `VITE_SUPABASE_URL` | Same as API |
| `VITE_SUPABASE_ANON_KEY` | Anon key |
| `VITE_BASE_CHAIN_ID` | `8453` |
| `VITE_NE_DISCOVERY` | **omit** or `false` — hides navbar link + landing CTA |

NE remains reachable at **`https://memetic.adpr.work/narrative-engine`** (direct URL only).

Local dev still shows discovery links automatically (`import.meta.env.DEV`).

### Custom domain

Point `memetic.adpr.work` (or subdomain) to Vercel. Update Render `CORS_ORIGIN` to match exactly:

```
CORS_ORIGIN=https://memetic.adpr.work
```

Redeploy **both** Vercel and Render after env changes.

---

## 5. Post-deploy checklist

- [ ] `GET /health` → 200
- [ ] `GET /v1/pricing-tiers` → tiers array
- [ ] POST narrative run → 201, completes within ~2 min
- [ ] Frontend `/narrative-engine` loads form (no link on homepage)
- [ ] Share URL `/results/:shareId` works
- [ ] Render worker logs show job processing
- [ ] Supabase `engine_runs` has new row with `status = completed`
- [ ] `share-graphics` bucket has OG image after run

---

## 6. Config updates in production

After editing `narrative-engine-api/config/narrative-engine/`:

```bash
cd narrative-engine-api
npm run config:sync    # pushes prompts/schemas/enums to Supabase
```

Redeploy Render only if **code** changed (orchestrator, routes). Config-only changes need sync only.

---

## 7. Cost estimate (low traffic)

| Service | Tier | ~Monthly |
|---------|------|----------|
| Render web | Starter ($7) | $7 |
| Render worker | Starter ($7) | $7 |
| Upstash Redis | Free | $0 |
| Supabase | Free / Pro | $0–25 |
| Vercel | Hobby | $0 |
| OpenAI | Pay per run | ~$0.05–0.15/run |

**Cheapest queue:** Upstash free. **Cheapest Render:** single web service without worker if you accept inline processing (not recommended).

---

## 8. Troubleshooting

| Symptom | Fix |
|---------|-----|
| CORS error in browser | `CORS_ORIGIN` must exactly match frontend origin (scheme + host, no path) |
| Run stuck `pending` | Worker not running or wrong `REDIS_URL`; check worker logs |
| 500 on create run | Missing `OPENAI_API_KEY`; check web service logs |
| Duplicate job processing | Ensure only worker has `WORKER_MODE=true` |
| Render cold start 30s+ | Free/starter spin-down; first request slow |
| `Cannot find module dist/index.js` | Build did not run — set Root Dir `narrative-engine-api`, Build `npm ci && npm run build`, Start `npm start` |
| Build fails `tsx: command not found` | Use current `package.json` (`build` is `tsc` only); redeploy |
| Supabase RLS errors | API uses service role key — verify key is service_role not anon |

---

## Pre-push checklist (GitHub)

Before `git push`, confirm secrets stay local:

```bash
chmod +x scripts/verify-no-secrets.sh
./scripts/verify-no-secrets.sh
```

### Never commit

| Path | Why |
|------|-----|
| `narrative-engine-api/.env` | OpenAI, Supabase service role, admin key |
| `frontend/.env` | API URL is fine; never put admin/service keys here |
| `supabase/.temp/` | Linked project ref, pooler URLs |
| `node_modules/`, `dist/` | Build artifacts |
| `.vercel/`, `.cursor/` | Local tooling state |

### Safe to commit

| Path | Notes |
|------|-------|
| `**/.env.example` | Placeholders only — no real keys |
| `render.yaml` | Uses `sync: false` for secrets |
| `supabase/migrations/`, `seed/` | Schema + config SQL |
| `narrative-engine-api/config/` | Prompts/schemas (no API keys) |

### After cloning (any machine)

```bash
cp narrative-engine-api/.env.example narrative-engine-api/.env
cp frontend/.env.example frontend/.env
# Fill in real values locally — never commit .env
```

### Production env (set in Render / Vercel dashboards)

- `ADMIN_API_KEY` — strong random; never `VITE_ADMIN_API_KEY` on Vercel
- `CORS_ORIGIN` — exact production frontend URL
- `WORKER_MODE=false` on web, `true` on worker only
- Rotate keys if `.env` was ever committed to git history

---

## Related docs

- [API README](../../narrative-engine-api/README.md)
- [Frontend README](../../frontend/README.md)
- [Supabase README](../../supabase/README.md)
- [Admin dashboard spec](./admin-dashboard.md)
- [Runbook](./runbook.md)
- [Launch checklist](./launch-checklist.md)
