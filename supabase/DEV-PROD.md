# Development & Production — Supabase Guide

**Canonical reference** for developers and AI agents working with Narrative Engine **dev** and **prod** databases.

Read this before running `supabase link`, `db push`, seeds, or `config:sync`.

**Also in this folder:** [README.md](./README.md) (CLI setup, seed, troubleshooting)  
**Broader context:** [docs/narrative-engine/environments.md](../docs/narrative-engine/environments.md) · [feature-development.md](../docs/narrative-engine/feature-development.md) · [deployment.md](../docs/narrative-engine/deployment.md)

---

## 0. How to get your project ref (for `supabase link`)

The **project ref** is a 20-character ID that identifies your Supabase project. You need it for:

```bash
supabase link --project-ref YOUR_DEV_REF    # development
supabase link --project-ref YOUR_PROD_REF   # production
```

### Method 1 — Dashboard (recommended)

1. Open [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select the project (e.g. `mbl-ne-dev` or `mbl-ne-prod`)
3. Go to **Project Settings** (gear icon in the left sidebar)
4. Open **General**
5. Copy **Reference ID** — a string like `epnjqufrhgdyxvnaqmlr`

```bash
supabase link --project-ref epnjqufrhgdyxvnaqmlr
```

The CLI will prompt for your database password (set when the project was created).

### Method 2 — From your API URL

If you already have `SUPABASE_URL` in `.env` or Render:

```text
https://epnjqufrhgdyxvnaqmlr.supabase.co
         └──────────────────┘
              project ref
```

The subdomain **before** `.supabase.co` is the ref.

### Method 3 — From the dashboard browser URL

When viewing a project:

```text
https://supabase.com/dashboard/project/epnjqufrhgdyxvnaqmlr/...
                                      └──────────────────┘
                                           project ref
```

### Dev vs prod — tell them apart

| Check | Dev | Prod |
|-------|-----|------|
| Dashboard project name | e.g. `mbl-ne-dev` | e.g. `mbl-ne-prod` |
| Reference ID | Different 20-char string | Different 20-char string |
| `SUPABASE_URL` subdomain | `https://DEV_REF.supabase.co` | `https://PROD_REF.supabase.co` |
| Where keys live | `narrative-engine-api/.env` (local) | Render + Vercel dashboards |

**Before every `supabase link` or `db push`:** confirm you have the correct ref. Linking prod by mistake and running migrations is recoverable only if migrations are additive — but `config:sync` against prod from a laptop is risky.

### Verify which project is linked

After linking, from **repo root**:

```bash
# Shows linked project ref (stored in supabase/.temp/)
cat supabase/.temp/project-ref 2>/dev/null || supabase projects list

# Confirm via API URL in your .env matches intended project
grep SUPABASE_URL narrative-engine-api/.env
```

---

## 1. Golden rules

| # | Rule |
|---|------|
| 1 | **Separate Supabase projects** for dev and prod |
| 2 | **Dev first** — test every migration on dev before prod |
| 3 | **Forward-only migrations** — never edit applied migration files; add `supabase/migrations/YYYYMMDDHHMMSS_*.sql` |
| 4 | **Additive SQL** — `ADD COLUMN … DEFAULT`, `IF NOT EXISTS`; avoid `DROP` / `TRUNCATE` on live data |
| 5 | **CLI from repo root** — run `supabase` from `memetic-brand-labs/`, not from inside `supabase/` |
| 6 | **Service role is server-only** — never put `SUPABASE_SERVICE_ROLE_KEY` in frontend or Vercel |

### Safe vs dangerous on production

| Safe (with backup) | Never |
|--------------------|-------|
| `supabase db push` (pending migrations only) | `supabase db reset` |
| `npm run config:sync` | Re-run `initial_schema.sql` on existing DB |
| `ADD COLUMN IF NOT EXISTS … DEFAULT` | `TRUNCATE engine_runs` |
| Playground on **dev** | Playground on **prod** |

---

## 2. First-time setup

### 2a. Create projects

1. Dashboard → **New project** → name it `mbl-ne-dev`
2. Keep existing live project as `mbl-ne-prod` (or create a dedicated prod project)
3. Each project: **Storage** → bucket `share-graphics` (public read)

### 2b. Bootstrap dev (fresh database)

From **repo root**:

```bash
brew install supabase/tap/supabase   # if needed
supabase login

# Use Reference ID from §0
supabase link --project-ref YOUR_DEV_REF
supabase db push
supabase db query --linked -f supabase/seed/seed.sql
```

Then config + patterns:

```bash
cd narrative-engine-api
cp .env.example .env
# SUPABASE_URL=https://YOUR_DEV_REF.supabase.co
# Keys from Dashboard → Project Settings → API
npm install
npm run config:all
npm run seed:patterns
```

### 2c. Local `.env` (dev keys only)

**`narrative-engine-api/.env`:**

```bash
SUPABASE_URL=https://YOUR_DEV_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from API settings>
SUPABASE_ANON_KEY=<from API settings>
REDIS_URL=                 # empty = inline pipeline locally
```

**`frontend/.env`:**

```bash
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://YOUR_DEV_REF.supabase.co
VITE_SUPABASE_ANON_KEY=<same anon key>
```

### 2d. Where to copy API keys (both dev and prod)

Dashboard → select project → **Project Settings** → **API**:

| Variable | Dashboard field | Used in |
|----------|-----------------|---------|
| `SUPABASE_URL` | **Project URL** (`https://xxx.supabase.co`) | API `.env`, Vercel |
| `SUPABASE_ANON_KEY` | **anon** `public` key | API `.env`, frontend, Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** `secret` key | API `.env`, Render only |

Use the **Project URL** — not the `postgresql://` connection string — for `SUPABASE_URL`.

---

## 3. Daily development workflow

```text
1. Confirm .env → DEV ref (§0)
2. git checkout -b feature/…
3. New migration? → supabase/migrations/… → link DEV → db push
4. Prompt change? → config/narrative-engine/ → npm run config:all
5. npm test
6. Test at localhost:5173 + /admin Playground
```

```bash
cd /path/to/memetic-brand-labs
supabase link --project-ref YOUR_DEV_REF
supabase db push
```

---

## 4. Promoting to production

```text
Dev verified → Backup prod → link PROD → db push → config:sync (if needed) → deploy API
```

### 4a. Apply pending migrations on prod

```bash
cd /path/to/memetic-brand-labs

# 1. Dev first
supabase link --project-ref YOUR_DEV_REF
supabase db push

# 2. Backup: Dashboard → Database → Backups

# 3. Prod — only runs migrations not yet applied
supabase link --project-ref YOUR_PROD_REF
supabase db push

# 4. Verify
supabase db query --linked "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;"
```

### 4b. Current migrations

| File | Purpose |
|------|---------|
| `migrations/20250620000001_initial_schema.sql` | All tables |
| `migrations/20250620000002_rls_views.sql` | RLS + views |
| `migrations/20250628000001_run_source.sql` | `run_source` for admin playground |

### 4c. Config sync to prod

```bash
cd narrative-engine-api
# Ensure .env SUPABASE_URL matches PROD before running
npm run config:sync
```

### 4d. Production checklist

- [ ] Correct `YOUR_PROD_REF` used in `supabase link`
- [ ] `db push` completed without errors
- [ ] `config:sync` if prompts changed
- [ ] Render web + worker deployed (same commit)
- [ ] `curl https://YOUR_API.onrender.com/health`

---

## 5. Command reference

Run from **repo root** unless noted.

| Task | Command |
|------|---------|
| Login | `supabase login` |
| Link dev | `supabase link --project-ref YOUR_DEV_REF` |
| Link prod | `supabase link --project-ref YOUR_PROD_REF` |
| Apply migrations | `supabase db push` |
| Run seed | `supabase db query --linked -f supabase/seed/seed.sql` |
| Config sync | `cd narrative-engine-api && npm run config:all` (dev) |
| Patterns | `cd narrative-engine-api && npm run seed:patterns` |

---

## 6. Data safety

| Operation | Touches user runs? |
|-----------|-------------------|
| `db push` (additive) | No — schema only |
| `config:sync` | No — config tables only |
| `seed.sql` (first time) | No |
| Admin Playground | Adds test runs (`run_source=admin_test`) |
| `db reset` | **Wipes everything** |

---

## 7. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Wrong project linked | `supabase link --project-ref CORRECT_REF` from repo root |
| `db push` up to date but tables missing | Re-link from repo root, not `supabase/` subfolder |
| `Invalid supabaseUrl` | Use `https://REF.supabase.co`, not `postgresql://` |
| Playground fails on prod | Run `db push` for `run_source` migration |
| Accidentally synced config to prod | Verify `SUPABASE_URL` before every `config:sync` |

More: [README.md § Troubleshooting](./README.md)

---

## 8. Instructions for AI agents

1. **Read this file** before any Supabase or migration work.
2. **Default to dev** unless the user explicitly requests prod.
3. **Never** commit `.env` or service role keys.
4. **Never** `db reset`, `DROP`, or `TRUNCATE` without explicit approval.
5. **Never** edit migration files already on prod — add new timestamped files.
6. **State the project ref** (dev vs prod) when running `supabase link`.
7. Get ref from Dashboard → Project Settings → General → **Reference ID**, or from `SUPABASE_URL` subdomain.

### Decision tree

```text
Schema change?
  → new migration → link DEV_REF → db push → test → link PROD_REF → db push

Prompt change only?
  → config/narrative-engine/ → config:all (dev) → config:sync (prod)

User asks "update prod db"?
  → confirm backup → verify PROD_REF → db push pending only
```

---

## 9. Related docs

| Topic | Location |
|-------|----------|
| CLI setup & seed | [supabase/README.md](./README.md) |
| Env var matrices | [docs/narrative-engine/environments.md](../docs/narrative-engine/environments.md) |
| Feature checklists | [docs/narrative-engine/feature-development.md](../docs/narrative-engine/feature-development.md) |
| Render + Vercel | [docs/narrative-engine/deployment.md](../docs/narrative-engine/deployment.md) |
| Table definitions | [docs/narrative-engine/database-spec.md](../docs/narrative-engine/database-spec.md) |
