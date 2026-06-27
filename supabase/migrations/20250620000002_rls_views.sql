-- RLS policies and analytics views

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_self_update ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY runs_owner ON engine_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY inputs_owner ON run_inputs FOR SELECT
  USING (EXISTS (SELECT 1 FROM engine_runs r WHERE r.id = run_id AND r.user_id = auth.uid()));
CREATE POLICY outputs_owner ON run_outputs FOR SELECT
  USING (EXISTS (SELECT 1 FROM engine_runs r WHERE r.id = run_id AND r.user_id = auth.uid()));

CREATE POLICY share_public_read ON share_assets FOR SELECT USING (is_public = true AND revoked_at IS NULL);

-- Public share view (cards only, no inputs/scores)
CREATE VIEW v_public_share AS
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

-- Admin audit view
CREATE VIEW v_run_full_audit AS
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

CREATE VIEW v_user_journey AS
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

CREATE VIEW v_cogs_vs_revenue_daily AS
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

CREATE VIEW v_messaging_problem_distribution AS
SELECT
  lo.output->>'messaging_problem' AS messaging_problem,
  count(*) AS cnt
FROM layer_outputs lo
WHERE lo.layer_key = 'interpretation'
GROUP BY 1;

CREATE VIEW v_model_tier_performance AS
SELECT
  er.model_tier,
  count(*) AS runs,
  avg(er.total_duration_ms) AS avg_duration_ms,
  avg(rcs.total_llm_cost_usd) AS avg_cogs,
  sum(CASE WHEN er.status = 'completed' THEN 1 ELSE 0 END)::float / nullif(count(*), 0) AS completion_rate
FROM engine_runs er
LEFT JOIN run_cost_summaries rcs ON rcs.run_id = er.id
GROUP BY er.model_tier;
