# Narrative Engine — Database Specification

Primary reference for migrations in `supabase/migrations/`.

## Design principles

1. Full lineage: user → session → run → layer → LLM → output
2. Immutable `run_config_snapshots` per run
3. Append-only `run_events`
4. One `llm_requests` row per API call
5. Normalized scores in `diagnostic_scores`, `memetic_lite_scores`

## Domains

| Domain | Tables |
|--------|--------|
| A Identity | `users`, `user_sessions`, `brand_profiles` |
| B Runs | `engine_runs`, `run_lineage`, `run_config_snapshots`, `run_inputs` |
| C Pipeline | `pipeline_jobs`, `pipeline_stages`, `layer_executions`, `layer_outputs`, `layer_prompt_snapshots`, `diagnostic_scores`, `memetic_lite_scores`, `pattern_matches`, `website_extractions`, `run_events` |
| D LLM | `llm_requests`, `llm_token_usage`, `llm_cost_events`, `llm_model_pricing`, `run_cost_summaries` |
| E Outputs | `run_outputs`, `output_guardrail_events`, `share_assets`, `share_analytics_events` |
| F Payments | `payment_transactions`, `payment_attempts`, `auth_events` |
| G Config | `prompt_templates`, `schema_registry`, `enum_definitions`, `pattern_entries`, `pricing_tiers`, `guardrail_rules` |
| H Privacy | `data_deletion_requests`, `deleted_runs_tombstones` |

## Write path (pipeline)

| Step | Tables |
|------|--------|
| Create run | `engine_runs`, `run_inputs`, `run_config_snapshots`, `run_lineage`, `run_cost_summaries`, `run_events` |
| Enqueue | `pipeline_jobs` |
| Each stage | `pipeline_stages`, `run_events` |
| Each layer | `layer_executions`, `layer_prompt_snapshots`, `pattern_matches`, `llm_requests`, `llm_token_usage`, `llm_cost_events`, `layer_outputs`, scores |
| Complete | `run_outputs`, `share_assets`, `output_guardrail_events` |

## Analytics views

- `v_run_full_audit` — admin run inspection
- `v_user_journey` — user → runs → payments
- `v_cogs_vs_revenue_daily`
- `v_messaging_problem_distribution`
- `v_model_tier_performance`
- `v_public_share` — share-safe card content only

## Example query

```sql
SELECT * FROM v_run_full_audit WHERE run_id = '...';
```

## Indexes

See `20250620000001_initial_schema.sql` — FK indexes on `engine_runs`, `run_events`, GIN on `pattern_entries.tags`.

## Seeding

```bash
psql $DATABASE_URL -f supabase/migrations/*.sql
psql $DATABASE_URL -f supabase/seed/seed.sql
npx tsx supabase/seed/load-patterns.ts
```
