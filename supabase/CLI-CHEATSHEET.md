# Supabase CLI — Crash Course & Cheatsheet

Quick mental model + commands for Narrative Engine. Pair with [DEV-PROD.md](./DEV-PROD.md) for dev/prod safety rules.

---

## How Supabase fits in this project

```text
┌─────────────────────────────────────────────────────────┐
│  Supabase project (one per environment: dev, prod)      │
│  ┌─────────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Postgres   │  │  Auth    │  │  Storage         │  │
│  │  (runs,     │  │  (email  │  │  (share-graphics │  │
│  │   layers,   │  │   magic  │  │   bucket)        │  │
│  │   costs…)   │  │   link)  │  │                  │  │
│  └─────────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────┘
         ▲                              ▲
         │ service_role (server)        │ anon key (browser)
         │                              │
   narrative-engine-api            frontend (Vite)
   (Render in prod)                (Vercel in prod)
```

| Concept | What it is |
|---------|------------|
| **Project** | One isolated Supabase instance (dev OR prod — use two projects) |
| **Project ref** | 20-char ID, e.g. `lnntfxyzhvjdktrvpckf` — subdomain of `SUPABASE_URL` |
| **Link** | CLI remembers which project you're talking to (`supabase/.temp/`) |
| **Migration** | SQL file in `supabase/migrations/` — applied once, tracked in DB |
| **Seed** | Reference data in `supabase/seed/` — pricing, patterns, config SQL |
| **Config sync** | `npm run config:sync` — pushes prompts/schemas from repo to DB |

**You do not run Postgres locally** in our normal workflow — you link the CLI to a **hosted** Supabase project and push migrations there.

---

## Mental model: three ways to change the database

| Method | When | Safe on prod? |
|--------|------|---------------|
| **`supabase db push`** | Schema changes (new column, table, index) | Yes — additive migrations only |
| **`supabase db query -f file.sql`** | One-off SQL or seed files | Careful — read the file first |
| **`npm run config:sync`** | Prompts, schemas, enums | Yes — upserts config tables only |

Schema lives in **`supabase/migrations/`**.  
Prompts live in **`narrative-engine-api/config/narrative-engine/`** → synced to DB.

---

## What happened in your terminal (decoded)

### 1. First `db push` — migration applied ✓

```text
Applying migration 20250628000001_run_source.sql...
NOTICE: constraint "engine_runs_run_source_check" ... does not exist, skipping
Warning: failed to cache migrations catalog: ... pgdelta-target-ca.crt ... ENOENT
Finished supabase db push.
```

| Line | Meaning |
|------|---------|
| `Applying migration 20250628000001_run_source.sql` | Migration **ran** on the linked project |
| `NOTICE ... constraint ... does not exist, skipping` | **Normal** — migration uses `DROP CONSTRAINT IF NOT EXISTS` before re-adding |
| `Warning: failed to cache migrations catalog` | **CLI bug/noise** (pg-delta cache) — migration still finished |
| `Finished supabase db push` | **Success** — `run_source` column should exist |

The pg-delta warning is a known Supabase CLI issue (v2.107). Fix: upgrade CLI (`brew upgrade supabase`). The migration itself succeeded if you saw "Finished supabase db push".

### 2. Second `link` + `db push` — already applied ✓

```bash
supabase link --project-ref lnntfxyzhvjdktrvpckf
supabase db push
# Remote database is up to date.
```

All migrations in `supabase/migrations/` are **already recorded** on that project. Nothing left to apply — this is expected.

### 3. Verify command failed — wrong flag ✗

```bash
# WRONG — there is no --sql flag
supabase db query --linked --sql "SELECT ..."

# CORRECT — SQL is a positional argument (or use -f for a file)
supabase db query --linked "SELECT column_name FROM information_schema.columns WHERE table_name='engine_runs' AND column_name='run_source';"
```

---

## Verify migration worked

### Option A — CLI (correct syntax)

```bash
cd /path/to/memetic-brand-labs

# Which project is linked?
cat supabase/.temp/project-ref

# Check run_source column exists
supabase db query --linked "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'engine_runs' AND column_name = 'run_source';"

# List applied migrations
supabase db query --linked "SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;"

# Sample data
supabase db query --linked "SELECT run_source, count(*) FROM engine_runs GROUP BY run_source;"
```

### Option B — Supabase Dashboard (easiest)

1. Dashboard → your project → **SQL Editor**
2. Run:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'engine_runs' AND column_name = 'run_source';

SELECT version FROM supabase_migrations.schema_migrations
ORDER BY version;
```

### Option C — psql

Dashboard → **Project Settings → Database → Connection string** (URI):

```bash
psql "postgresql://postgres.[ref]:[password]@...pooler.supabase.com:6543/postgres" \
  -c "SELECT column_name FROM information_schema.columns WHERE table_name='engine_runs' AND column_name='run_source';"
```

---

## CLI cheatsheet

**Always run from repo root:** `memetic-brand-labs/` (not `supabase/`).

### Setup (once per machine)

```bash
brew install supabase/tap/supabase
brew upgrade supabase                    # keep current (you're on v2.107 → v2.109 available)
supabase login                           # browser auth
supabase link --project-ref YOUR_REF     # pick dev or prod
```

### Project ref

```bash
# Dashboard → Project Settings → General → Reference ID
# Or from SUPABASE_URL: https://lnntfxyzhvjdktrvpckf.supabase.co → ref is lnntfxyzhvjdktrvpckf
```

### Switch dev ↔ prod

```bash
supabase link --project-ref DEV_REF    # local dev work
supabase link --project-ref PROD_REF   # prod promotion (after dev tested)
cat supabase/.temp/project-ref         # confirm which is linked
```

### Migrations (schema)

```bash
# Apply all pending migrations to linked project
supabase db push

# See migration status (if available in your CLI version)
supabase migration list --linked

# Create new migration file (manual edit after)
supabase migration new add_my_column
# → creates supabase/migrations/TIMESTAMP_add_my_column.sql
```

### Run SQL

```bash
# Inline query — NO --sql flag; quote the SQL string
supabase db query --linked "SELECT count(*) FROM engine_runs;"

# SQL file (seeds)
supabase db query --linked -f supabase/seed/seed.sql
supabase db query --linked -f supabase/seed/generated/narrative-config.sql

# JSON output
supabase db query --linked -o json "SELECT tier_key FROM pricing_tiers;"
```

### Config & patterns (from narrative-engine-api/)

```bash
cd narrative-engine-api
npm run config:all        # generate SQL + sync to linked project (via .env SUPABASE_URL)
npm run config:sync       # sync only (uses .env — double-check dev vs prod!)
npm run seed:patterns     # load pattern library
```

### Local Supabase stack (optional — we usually skip this)

```bash
supabase start            # Docker local Postgres + Studio
supabase stop
supabase db query --local "SELECT 1;"
```

---

## Dev workflow (typical day)

```text
1. .env → DEV Supabase URL + keys
2. supabase link --project-ref DEV_REF
3. Edit code / add migration file
4. supabase db push                    (if schema changed)
5. npm run config:all                  (if prompts changed)
6. npm run dev + pnpm dev              (API + frontend)
7. Test at localhost:5173
```

**Before prod:**

```text
1. Backup prod (Dashboard → Database → Backups)
2. supabase link --project-ref PROD_REF
3. supabase db push
4. npm run config:sync (if config changed, .env → prod temporarily)
5. Deploy Render web + worker
```

---

## Common outputs explained

| Output | Meaning |
|--------|---------|
| `Do you want to push these migrations? • 20250628...` | Pending migration — type `y` |
| `Finished supabase db push` | Success |
| `Remote database is up to date` | All repo migrations already applied — nothing to do |
| `NOTICE ... does not exist, skipping` | Harmless — `IF NOT EXISTS` / `DROP IF EXISTS` |
| `pgdelta-target-ca.crt ... ENOENT` | CLI cache warning — migration usually still OK; upgrade CLI |
| `Unrecognized flag: --sql` | Use positional SQL: `db query --linked "SELECT ..."` |
| `relation "enum_definitions" does not exist` | Migrations never applied — run `db push` from repo root |

---

## Rules of thumb

1. **One project ref = one database.** Link dev for daily work; link prod only when promoting.
2. **Never edit old migration files** that ran on prod — add a new timestamped file.
3. **`db push` is incremental** — only applies migrations not in `supabase_migrations.schema_migrations`.
4. **`config:sync` follows `.env`** — wrong `SUPABASE_URL` = wrong database updated.
5. **Repo root for CLI** — `cd memetic-brand-labs` before every `supabase` command.
6. **Verify in Dashboard SQL Editor** when CLI quirks block you.

---

## Related

- [DEV-PROD.md](./DEV-PROD.md) — dev vs prod safety, project ref, promotion checklist
- [README.md](./README.md) — full setup, seed, troubleshooting
