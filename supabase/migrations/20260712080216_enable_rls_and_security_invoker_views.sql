-- Enable RLS on remaining public tables (deny anon/authenticated by default).
-- Already protected (skip): users, engine_runs, run_inputs, run_outputs, share_assets
-- Service role continues to bypass RLS for the API.

ALTER TABLE public.enum_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_model_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardrail_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_config_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layer_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layer_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layer_prompt_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memetic_lite_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_cost_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_cost_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.output_guardrail_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_runs_tombstones ENABLE ROW LEVEL SECURITY;

-- Recreate analytics views with security_invoker so caller RLS applies.
-- SELECT bodies match 20250620000002_rls_views.sql.

DROP VIEW IF EXISTS public.v_public_share;
DROP VIEW IF EXISTS public.v_run_full_audit;
DROP VIEW IF EXISTS public.v_user_journey;
DROP VIEW IF EXISTS public.v_cogs_vs_revenue_daily;
DROP VIEW IF EXISTS public.v_messaging_problem_distribution;
DROP VIEW IF EXISTS public.v_model_tier_performance;

CREATE VIEW public.v_public_share
WITH (security_invoker = true) AS
SELECT
  sa.share_id,
  sa.og_title,
  sa.og_description,
  sa.og_image_path,
  sa.graphic_path_square,
  json_agg(json_build_object(
    'key', ro.card_key,
    'label', ro.card_label,
    'content', ro.content,
    'meta', ro.card_meta
  ) ORDER BY (ro.card_meta->>'order')::int) AS cards
FROM share_assets sa
JOIN run_outputs ro ON ro.run_id = sa.run_id
WHERE sa.is_public = true AND sa.revoked_at IS NULL
GROUP BY sa.share_id, sa.og_title, sa.og_description, sa.og_image_path, sa.graphic_path_square;

CREATE VIEW public.v_run_full_audit
WITH (security_invoker = true) AS
SELECT
  er.id AS run_id,
  er.status,
  er.model_tier,
  er.created_at,
  er.completed_at,
  ri.building,
  ri.audience,
  ri.challenge,
  ri.differentiation,
  rcs.total_llm_cost_usd,
  rcs.total_cogs_usd,
  rcs.revenue_usdc,
  (SELECT json_agg(lo ORDER BY lo.created_at) FROM layer_outputs lo WHERE lo.run_id = er.id) AS layer_outputs,
  (SELECT json_agg(ds) FROM diagnostic_scores ds WHERE ds.run_id = er.id) AS diagnostic_scores,
  (SELECT count(*) FROM run_events re WHERE re.run_id = er.id) AS event_count
FROM engine_runs er
LEFT JOIN run_inputs ri ON ri.run_id = er.id
LEFT JOIN run_cost_summaries rcs ON rcs.run_id = er.id;

CREATE VIEW public.v_user_journey
WITH (security_invoker = true) AS
SELECT
  u.id AS user_id,
  u.email,
  u.first_free_run_used_at,
  count(DISTINCT er.id) AS run_count,
  count(DISTINCT pt.id) AS payment_count,
  sum(rcs.total_llm_cost_usd) AS total_cogs
FROM users u
LEFT JOIN engine_runs er ON er.user_id = u.id
LEFT JOIN payment_transactions pt ON pt.user_id = u.id
LEFT JOIN run_cost_summaries rcs ON rcs.run_id = er.id
GROUP BY u.id, u.email, u.first_free_run_used_at;

CREATE VIEW public.v_cogs_vs_revenue_daily
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', er.created_at) AS day,
  sum(rcs.total_llm_cost_usd) AS cogs_usd,
  sum(pt.amount_usdc) AS revenue_usdc,
  count(er.id) AS runs
FROM engine_runs er
LEFT JOIN run_cost_summaries rcs ON rcs.run_id = er.id
LEFT JOIN payment_transactions pt ON pt.run_id = er.id
GROUP BY 1
ORDER BY 1 DESC;

CREATE VIEW public.v_messaging_problem_distribution
WITH (security_invoker = true) AS
SELECT
  lo.output->>'messaging_problem' AS messaging_problem,
  count(*) AS cnt
FROM layer_outputs lo
WHERE lo.layer_key = 'interpretation'
GROUP BY 1;

CREATE VIEW public.v_model_tier_performance
WITH (security_invoker = true) AS
SELECT
  er.model_tier,
  count(*) AS runs,
  avg(er.total_duration_ms) AS avg_duration_ms,
  avg(rcs.total_llm_cost_usd) AS avg_cogs,
  sum(CASE WHEN er.status = 'completed' THEN 1 ELSE 0 END)::float / nullif(count(*), 0) AS completion_rate
FROM engine_runs er
LEFT JOIN run_cost_summaries rcs ON rcs.run_id = er.id
GROUP BY er.model_tier;

-- Harden admin views: no direct PostgREST access for anon/authenticated.
-- API continues to use service_role, which is unaffected.
REVOKE ALL ON public.v_run_full_audit FROM anon, authenticated;
REVOKE ALL ON public.v_user_journey FROM anon, authenticated;
REVOKE ALL ON public.v_cogs_vs_revenue_daily FROM anon, authenticated;
REVOKE ALL ON public.v_messaging_problem_distribution FROM anon, authenticated;
REVOKE ALL ON public.v_model_tier_performance FROM anon, authenticated;
