# Supabase — Narrative Engine

Postgres schema, seeds, and storage for the Narrative Engine data platform.

**Also read:** [narrative-engine-api/README.md](../narrative-engine-api/README.md) (API env + deploy)

---

## Prerequisites

Choose one path:


| Path                 | When to use                                   |
| -------------------- | --------------------------------------------- |
| **Supabase CLI**     | Local Supabase stack or linked remote project |
| **psql + Dashboard** | Quick setup against a hosted Supabase project |


You need a Supabase project at [supabase.com](https://supabase.com). From **Project Settings → Database**, copy the **connection string** (URI mode) as `DATABASE_URL`.

From **Project Settings → API**, copy:

- `SUPABASE_URL`
- `anon` key → `SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Run locally

### Option A — Supabase CLI (linked remote project)

**Important:** Run every `supabase` command from the **repo root** (`memetic-brand-labs/`), not from inside `supabase/`.

If you `cd supabase` first, the CLI stores link state in the wrong place, `db push` may falsely report “up to date” without applying migrations, and seed paths break (see Troubleshooting).

```bash
# From repo root — NOT from inside supabase/
cd /path/to/memetic-brand-labs

# Install CLI: https://supabase.com/docs/guides/cli
brew install supabase/tap/supabase

# One-time setup (creates supabase/config.toml)
supabase init

# Link to your hosted project (Project Settings → General → Reference ID)
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations to the linked project (should list both migration files)
supabase db push

# Seed reference data (CLI v2.79+)
supabase db query --linked -f supabase/seed/seed.sql
supabase db query --linked -f supabase/seed/generated/narrative-config.sql

# Sync prompts/schemas/enums (from config/narrative-engine/)
cd narrative-engine-api
cp .env.example .env   # first time only; fill Supabase keys
npm install
npm run config:all     # generate SQL + push to Supabase
npm run seed:patterns
```

Copy `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from **Project Settings → API** into `narrative-engine-api/.env`. Use the `https://...supabase.co` URL, not the `postgresql://` connection string.

**Do not** run `npx tsx supabase/seed/load-patterns.ts` from `narrative-engine-api/` — the file lives at `../supabase/seed/load-patterns.ts`. Use `npm run seed:patterns` instead.

**CLI notes:**


| Command                                | Purpose                                                       |
| -------------------------------------- | ------------------------------------------------------------- |
| `supabase db push`                     | Applies files in `supabase/migrations/` to the linked project |
| `supabase db query --linked -f <file>` | Runs a SQL file against the linked project                    |
| `supabase db query --local -f <file>`  | Runs against local Supabase (`supabase start` first)          |


`supabase db execute` does **not** exist — use `db query` instead.

If `db query` is unavailable (CLI older than v2.79), upgrade with `brew upgrade supabase` or use **Option B** below.

**If you already linked from inside `supabase/`:** go back to repo root, run `supabase link --project-ref YOUR_REF` again, then `supabase db push` (you should see both migrations apply). Then seed with the command above.

### Option B — psql (always works)

```bash
# From Supabase Dashboard → Project Settings → Database → Connection string (URI)
export DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

psql "$DATABASE_URL" -f supabase/migrations/20250620000001_initial_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/20250620000002_rls_views.sql
psql "$DATABASE_URL" -f supabase/seed/seed.sql

cd narrative-engine-api && npm install && npm run seed:patterns
```

Use this path if the CLI seed command fails or you prefer direct SQL access.

### Storage bucket (required for share graphics)

In **Supabase Dashboard → Storage**:

1. **New bucket** → name: `share-graphics`
2. **Public bucket**: enabled (for OG images / PNG download)
3. Policies: allow public `SELECT` on objects (or use signed URLs later)

Alternatively via SQL (Dashboard → SQL editor):

```sql
insert into storage.buckets (id, name, public)
values ('share-graphics', 'share-graphics', true)
on conflict (id) do nothing;
```

### Verify local setup

```sql
-- Should return rows
SELECT tier_key, label, price_usdc FROM pricing_tiers;
SELECT count(*) FROM pattern_entries;   -- expect ~30 after load-patterns
SELECT schema_key FROM schema_registry;
```

```bash
# API health (after narrative-engine-api is running)
curl http://localhost:3001/health
```

---

## Environment variables (used by API)

These are **not** stored in Supabase — set them on the API service:


| Variable                    | Source                                  |
| --------------------------- | --------------------------------------- |
| `SUPABASE_URL`              | Dashboard → API → Project URL           |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → API → service_role          |
| `SUPABASE_ANON_KEY`         | Dashboard → API → anon (frontend + JWT) |
| `STORAGE_BUCKET`            | `share-graphics`                        |


---

## Deploy (production)

### 1. Create production project

Use a **separate** Supabase project for production (do not share keys with staging).

### 2. Apply schema

```bash
supabase link --project-ref PROD_PROJECT_REF
supabase db push
```

Or run the two migration files via `psql` against the production `DATABASE_URL`.

### 3. Seed production

```bash
# CLI (from repo root)
supabase link --project-ref PROD_PROJECT_REF
supabase db query --linked -f supabase/seed/seed.sql

# Or psql
psql "$PROD_DATABASE_URL" -f supabase/seed/seed.sql

cd narrative-engine-api && npm run seed:patterns
```

### 4. Storage + Auth

- Create `share-graphics` bucket (public read)
- Enable **Email** auth provider (magic link / OTP) under **Authentication → Providers**
- Configure **Site URL** and redirect URLs for your Vercel domain

### 5. Wire to Render + Vercel


| Service             | Variables                                                     |
| ------------------- | ------------------------------------------------------------- |
| Render API + worker | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`                   |
| Vercel frontend     | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` |


See [narrative-engine-api/README.md § Deploy](../narrative-engine-api/README.md).

### 6. Post-deploy checks

```sql
SELECT * FROM v_run_full_audit LIMIT 1;  -- empty until first run
SELECT count(*) FROM pattern_entries WHERE is_active = true;
```

---

## Migrations


| File                                           | Contents                       |
| ---------------------------------------------- | ------------------------------ |
| `migrations/20250620000001_initial_schema.sql` | All tables (Domains A–H)       |
| `migrations/20250620000002_rls_views.sql`      | RLS policies + analytics views |


**Rule:** Never edit applied migrations. Add new timestamped files for changes.

## Seed files


| File                                      | Contents                                             |
| ----------------------------------------- | ---------------------------------------------------- |
| `seed/seed.sql`                           | Pricing tiers, LLM rates, guardrails                 |
| `seed/generated/narrative-config.sql`     | **Auto-generated** enums, schemas, prompts           |
| `narrative-engine-api/config/narrative-engine/` | **Source of truth** for prompts/schemas/enums |
| `seed/patterns/patterns.json`             | 30 pattern library entries                           |
| `seed/load-patterns.ts`                   | Loader script for patterns                           |
| `seed/schemas/`                           | Mirrored JSON schemas (from `config:generate`)       |


## Troubleshooting


| Error | Fix |
| ----- | --- |
| `open supabase/seed/seed.sql: no such file or directory` | You are inside `supabase/`. Either `cd ..` to repo root and use `-f supabase/seed/seed.sql`, or stay in `supabase/` and use `-f seed/seed.sql` |
| `db push` says “up to date” but tables missing | You linked from inside `supabase/`. From repo root: `supabase link --project-ref YOUR_REF` then `supabase db push` again |
| `relation "enum_definitions" does not exist` | Migrations were not applied — run `supabase db push` from repo root first |
| `Cannot find project ref. Have you run supabase link?` | Run `supabase link` from repo root (same directory as `supabase/config.toml`’s parent) |
| `Unknown subcommand "execute" for "supabase db"` | Use `supabase db query --linked -f supabase/seed/seed.sql` |
| `db query` not found | Upgrade CLI: `brew upgrade supabase` (needs v2.79+) |
| Seed fails on duplicate rows | Re-running `seed.sql` may conflict — use a fresh DB or truncate seed tables first |
| `Cannot find module .../narrative-engine-api/supabase/seed/load-patterns.ts` | Wrong path. From `narrative-engine-api/`, use `npm run seed:patterns` (not `npx tsx supabase/seed/...`) |
| `Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY` | Create `narrative-engine-api/.env` with API URL + service role key, then `npm run seed:patterns` |
| `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL` | `SUPABASE_URL` in `.env` is `postgresql://...` — change to `https://xxx.supabase.co` |


## Schema reference

Full data model: [docs/narrative-engine/database-spec.md](../docs/narrative-engine/database-spec.md)