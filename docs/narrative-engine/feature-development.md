# Feature Development Workflow

Step-by-step guide for adding features, pipeline changes, and new **engine versions** without breaking production.

> **Start with:** [supabase/DEV-PROD.md](../../supabase/DEV-PROD.md) for project ref, environment setup, and safe DB changes.

---

## Principles

1. **Dev database first** — never develop migrations against production Supabase.
2. **Migrations are forward-only** — never edit applied migration files; add new timestamped files.
3. **Config vs code** — prompt/schema changes use `config/narrative-engine/`; orchestrator changes need API deploy.
4. **Small PRs** — schema → API → frontend, or feature-flagged UI, in reviewable chunks.

---

## Branch workflow

```text
main          ← production deploys from here (or release/*)
  ↑
feature/xyz   ← your work
```

1. Branch from `main`: `git checkout -b feature/admin-insights`
2. Develop against **dev Supabase** (see [environments.md](./environments.md))
3. Open PR → CI runs `npm test` in `narrative-engine-api`
4. Merge → deploy staging (optional) → deploy prod

---

## Checklist: new API feature

- [ ] Types / Zod schemas in `narrative-engine-api/src/`
- [ ] Service method + route in `src/routes/`
- [ ] Admin routes behind `requireAdmin` if operator-only
- [ ] Unit test in `tests/unit/`
- [ ] Update [admin-dashboard.md](./admin-dashboard.md) or [architecture.md](./architecture.md) if public contract changes
- [ ] `npm test && npm run typecheck`

---

## Checklist: database change

1. **Create migration** (repo root):

   ```bash
   # Name: supabase/migrations/YYYYMMDDHHMMSS_short_description.sql
   ```

2. **Apply to dev:**

   ```bash
   supabase link --project-ref YOUR_DEV_REF
   supabase db push
   ```

3. **Update** [database-spec.md](./database-spec.md) if new tables/views.

4. **Update API** — queries, DTOs, admin views.

5. **Update frontend** — admin UI or user UI as needed.

6. **Before prod:**

   ```bash
   supabase link --project-ref YOUR_PROD_REF
   supabase db push   # only after dev verified
   ```

**Never** use `run_source` or similar flags instead of a proper migration.

---

## Checklist: prompt / schema change (no code deploy)

1. Edit files in `narrative-engine-api/config/narrative-engine/`:
   - `prompts.json`, `schemas/*.json`, `enums.json`, `meta.json`

2. Regenerate and sync to **dev** Supabase:

   ```bash
   cd narrative-engine-api
   npm run config:all
   ```

3. Test via **Admin Playground** — run affected layer(s) step-by-step.

4. For production:

   ```bash
   # Link prod OR use CI with prod credentials
   npm run config:sync
   ```

5. Redeploy Render **only if** orchestrator/validator code changed.

---

## Checklist: new pipeline layer behavior (orchestrator)

1. Change `PipelineOrchestrator.ts` and related services.
2. Add/adjust tests.
3. Test locally:
   - Without Redis: `REDIS_URL=` empty → `npm run dev` → submit run from UI
   - With Redis: `npm run worker` in second terminal
4. Test Admin Playground layer-by-layer on dev DB.
5. Deploy API + worker to staging/prod together (same git SHA).

---

## Checklist: new engine version (`ne-v1.1.0`)

When shipping a breaking or major pipeline revision:

| Step | Action |
|------|--------|
| 1 | Bump `meta.json` `version` and `engine_runs.engine_version` default if needed |
| 2 | Add new schema files `ne.layer.v2.json` — keep v1 for old run audit |
| 3 | Migration if new columns required |
| 4 | Document in architecture.md § extension points |
| 5 | Old runs remain immutable via `run_config_snapshots` |

Existing runs always use snapshotted prompt versions from `run_config_snapshots` at creation time.

---

## Checklist: admin UI feature

1. Add API endpoint first (or extend existing DTO).
2. Extend `frontend/src/admin/lib/adminApi.js`.
3. Add human-readable copy in `humanize.js` / `layerPresenters.js`.
4. Reuse brand components (`AdminCard`, `AdminPageHeader`, etc.).
5. `pnpm run build` in `frontend/`.
6. Manual test at `http://localhost:5173/admin`.

---

## Checklist: production release

- [ ] All migrations applied to prod Supabase
- [ ] `npm run config:sync` if config changed
- [ ] Render web + worker deployed (same commit)
- [ ] `REDIS_URL` uses `rediss://` for Upstash
- [ ] Vercel production env vars unchanged or updated
- [ ] `curl $API/health`
- [ ] Submit one test run OR verify admin stats
- [ ] Check Render logs for worker job completion

---

## Versioning reference

| Artifact | Version location |
|----------|------------------|
| API package | `narrative-engine-api/package.json` |
| Engine | `config/narrative-engine/meta.json` |
| Prompts | per-layer `version` in `prompts.json` + DB `prompt_templates` |
| Schemas | `ne.*.v1.json` filename + `schema_registry` |
| DB schema | `supabase/migrations/*.sql` (timestamp order) |

---

## Related

- [supabase/DEV-PROD.md](../../supabase/DEV-PROD.md)
- [environments.md](./environments.md)
- [deployment.md](./deployment.md)
- [test-plan.md](./test-plan.md)
