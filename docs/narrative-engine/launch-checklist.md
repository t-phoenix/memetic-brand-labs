# Narrative Engine — Launch Checklist

## Infrastructure

- [ ] Supabase prod project + migrations applied
- [ ] Seed data loaded (enums, prompts, 30 patterns, pricing)
- [ ] Storage bucket `share-graphics`
- [ ] Render API + worker deployed
- [ ] Redis provisioned

## Security

- [ ] RLS policies verified
- [ ] Admin key set (Render only — not in frontend env)
- [ ] CORS locked to production domain
- [ ] No score leakage in API contract tests
- [ ] `./scripts/verify-no-secrets.sh` passes before git push
- [ ] `.env` files gitignored; only `.env.example` in repo

## Product

- [ ] Email verification flow works
- [ ] First run free (Fast tier)
- [ ] Rerun $10 USDC on Base mainnet
- [ ] Share + PNG download
- [ ] Delete-on-request

## Observability

- [ ] `v_run_full_audit` returns data for test run
- [ ] Sentry DSN (optional)
- [ ] COGS tracked per run

## Docs

- [ ] All files in `docs/narrative-engine/` committed
- [ ] `frontend-integration.md` shared with frontend team
