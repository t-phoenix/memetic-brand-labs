-- Narrative Engine — full observability schema (Domains A–H)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Domain G: config catalog (no FK deps)
CREATE TABLE enum_definitions (
  enum_key TEXT PRIMARY KEY,
  values JSONB NOT NULL DEFAULT '[]',
  engine_scope TEXT[] NOT NULL DEFAULT '{narrative}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE schema_registry (
  schema_key TEXT PRIMARY KEY,
  json_schema JSONB NOT NULL,
  compatible_engines TEXT[] NOT NULL DEFAULT '{narrative}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_type TEXT NOT NULL DEFAULT 'narrative',
  layer_key TEXT NOT NULL,
  version TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  output_schema_ref TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (engine_type, layer_key, version)
);

CREATE TABLE pricing_tiers (
  tier_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  price_usdc NUMERIC(12, 4) NOT NULL,
  markup_multiplier NUMERIC(6, 2) NOT NULL DEFAULT 5.0,
  model_routing JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE llm_model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_price_per_m NUMERIC(12, 6) NOT NULL,
  output_price_per_m NUMERIC(12, 6) NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  version TEXT NOT NULL DEFAULT 'v1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (provider, model, effective_from)
);

CREATE TABLE guardrail_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  rules JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pattern_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('failure', 'success', 'behaviour', 'cultural_signal')),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body JSONB NOT NULL,
  markets TEXT[] NOT NULL DEFAULT '{}',
  categories TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  source JSONB NOT NULL DEFAULT '{"type":"manual","refs":[]}',
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pattern_entries_tags ON pattern_entries USING GIN (tags);
CREATE INDEX idx_pattern_entries_markets ON pattern_entries USING GIN (markets);

CREATE TABLE pattern_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT,
  extracted JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Domain A: identity
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT,
  email_verified_at TIMESTAMPTZ,
  first_free_run_used_at TIMESTAMPTZ,
  wallet_address TEXT,
  wallet_connected_at TIMESTAMPTZ,
  signup_source TEXT NOT NULL DEFAULT 'ne_beta',
  utm JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_hash TEXT,
  user_agent TEXT,
  referrer TEXT,
  landing_path TEXT,
  device_class TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT,
  website TEXT,
  default_inputs JSONB NOT NULL DEFAULT '{}',
  voice_notes JSONB NOT NULL DEFAULT '{}',
  run_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Domain B: runs
CREATE TABLE engine_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_type TEXT NOT NULL DEFAULT 'narrative',
  engine_version TEXT NOT NULL DEFAULT 'ne-v1.0.0',
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL REFERENCES user_sessions(session_id),
  brand_profile_id UUID REFERENCES brand_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  failure_code TEXT,
  failure_detail JSONB,
  current_stage TEXT,
  progress_pct SMALLINT NOT NULL DEFAULT 0,
  model_tier TEXT NOT NULL DEFAULT 'fast',
  is_first_run BOOLEAN NOT NULL DEFAULT false,
  payment_status TEXT NOT NULL DEFAULT 'free',
  pricing_tier_key TEXT REFERENCES pricing_tiers(tier_key),
  api_version TEXT NOT NULL DEFAULT 'v1',
  client_version TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_duration_ms INT,
  email_verified_for_run BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_engine_runs_user ON engine_runs(user_id, created_at DESC);
CREATE INDEX idx_engine_runs_session ON engine_runs(session_id);
CREATE INDEX idx_engine_runs_status ON engine_runs(status, created_at);

CREATE TABLE run_lineage (
  run_id UUID PRIMARY KEY REFERENCES engine_runs(id) ON DELETE CASCADE,
  parent_run_id UUID REFERENCES engine_runs(id) ON DELETE SET NULL,
  lineage_root_id UUID NOT NULL,
  depth SMALLINT NOT NULL DEFAULT 0,
  change_summary JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE run_config_snapshots (
  run_id UUID PRIMARY KEY REFERENCES engine_runs(id) ON DELETE CASCADE,
  prompt_template_ids JSONB NOT NULL,
  prompt_versions JSONB NOT NULL,
  schema_versions JSONB NOT NULL,
  enum_snapshot JSONB NOT NULL,
  pricing_snapshot JSONB NOT NULL,
  pattern_library_version TEXT NOT NULL DEFAULT 'seed-v1',
  guardrail_config_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE run_inputs (
  run_id UUID PRIMARY KEY REFERENCES engine_runs(id) ON DELETE CASCADE,
  input_schema_version TEXT NOT NULL DEFAULT 'ne-input-v1',
  building TEXT NOT NULL,
  audience TEXT NOT NULL,
  challenge TEXT NOT NULL,
  differentiation TEXT NOT NULL,
  website_url TEXT,
  inputs_raw JSONB NOT NULL,
  inputs_normalized JSONB NOT NULL,
  char_counts JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Domain C: pipeline
CREATE TABLE pipeline_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  bull_job_id TEXT,
  queue_name TEXT NOT NULL DEFAULT 'narrative-pipeline',
  status TEXT NOT NULL DEFAULT 'queued',
  attempt SMALLINT NOT NULL DEFAULT 1,
  worker_id TEXT,
  enqueued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  status TEXT NOT NULL,
  progress_pct SMALLINT,
  duration_ms INT,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exited_at TIMESTAMPTZ
);

CREATE TABLE layer_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  layer_key TEXT NOT NULL,
  attempt_number SMALLINT NOT NULL DEFAULT 1,
  attempt_reason TEXT NOT NULL DEFAULT 'initial',
  status TEXT NOT NULL DEFAULT 'running',
  prompt_template_id UUID REFERENCES prompt_templates(id),
  output_schema_key TEXT,
  model TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  UNIQUE (run_id, layer_key, attempt_number)
);

CREATE TABLE layer_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_execution_id UUID NOT NULL UNIQUE REFERENCES layer_executions(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  layer_key TEXT NOT NULL,
  output_schema_version TEXT NOT NULL,
  output JSONB NOT NULL,
  output_hash TEXT NOT NULL,
  validation_passed BOOLEAN NOT NULL DEFAULT true,
  validation_errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE layer_prompt_snapshots (
  layer_execution_id UUID PRIMARY KEY REFERENCES layer_executions(id) ON DELETE CASCADE,
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  variables_resolved JSONB NOT NULL DEFAULT '{}',
  pattern_ids_injected UUID[] NOT NULL DEFAULT '{}',
  token_estimate_input INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE diagnostic_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  layer_execution_id UUID NOT NULL REFERENCES layer_executions(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL,
  score SMALLINT NOT NULL CHECK (score >= 0 AND score <= 100),
  findings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE memetic_lite_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  layer_execution_id UUID NOT NULL REFERENCES layer_executions(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL,
  score SMALLINT NOT NULL CHECK (score >= 0 AND score <= 100),
  weight NUMERIC(5, 4) NOT NULL,
  weighted_contribution NUMERIC(8, 4) NOT NULL,
  composite_score NUMERIC(8, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pattern_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  layer_execution_id UUID NOT NULL REFERENCES layer_executions(id) ON DELETE CASCADE,
  pattern_id UUID NOT NULL REFERENCES pattern_entries(id),
  match_score NUMERIC,
  match_method TEXT NOT NULL DEFAULT 'tag_filter',
  rank SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE website_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL UNIQUE REFERENCES engine_runs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  fetch_status TEXT NOT NULL,
  http_status SMALLINT,
  duration_ms INT,
  extracted JSONB NOT NULL DEFAULT '{}',
  mismatch_flags JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE run_events (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  actor TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_run_events_run ON run_events(run_id, created_at);

-- Domain D: LLM telemetry
CREATE TABLE llm_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  layer_execution_id UUID NOT NULL REFERENCES layer_executions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'chat.completions',
  status TEXT NOT NULL,
  http_status SMALLINT,
  error_code TEXT,
  latency_ms INT NOT NULL,
  time_to_first_token_ms INT,
  retry_of_request_id UUID REFERENCES llm_requests(id),
  request_id_provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE llm_token_usage (
  llm_request_id UUID PRIMARY KEY REFERENCES llm_requests(id) ON DELETE CASCADE,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  cached_prompt_tokens INT NOT NULL DEFAULT 0,
  reasoning_tokens INT NOT NULL DEFAULT 0
);

CREATE TABLE llm_cost_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  llm_request_id UUID NOT NULL UNIQUE REFERENCES llm_requests(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_price_per_m NUMERIC(12, 6) NOT NULL,
  output_price_per_m NUMERIC(12, 6) NOT NULL,
  input_cost_usd NUMERIC(12, 8) NOT NULL,
  output_cost_usd NUMERIC(12, 8) NOT NULL,
  total_cost_usd NUMERIC(12, 8) NOT NULL,
  pricing_table_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE run_cost_summaries (
  run_id UUID PRIMARY KEY REFERENCES engine_runs(id) ON DELETE CASCADE,
  llm_request_count INT NOT NULL DEFAULT 0,
  total_prompt_tokens INT NOT NULL DEFAULT 0,
  total_completion_tokens INT NOT NULL DEFAULT 0,
  total_llm_cost_usd NUMERIC(12, 8) NOT NULL DEFAULT 0,
  infra_cost_usd_estimate NUMERIC(12, 8) NOT NULL DEFAULT 0,
  total_cogs_usd NUMERIC(12, 8) NOT NULL DEFAULT 0,
  revenue_usdc NUMERIC(12, 4),
  margin_usd NUMERIC(12, 8),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Domain E: outputs & share
CREATE TABLE run_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  card_key TEXT NOT NULL,
  card_label TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  source_layer_keys TEXT[] NOT NULL DEFAULT '{}',
  card_meta JSONB NOT NULL DEFAULT '{}',
  output_schema_version TEXT NOT NULL DEFAULT 'ne-output-v1',
  guardrail_passed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, card_key)
);

CREATE TABLE output_guardrail_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  layer_execution_id UUID REFERENCES layer_executions(id) ON DELETE SET NULL,
  check_key TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  action_taken TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE share_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL UNIQUE REFERENCES engine_runs(id) ON DELETE CASCADE,
  share_id TEXT NOT NULL UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT true,
  og_title TEXT,
  og_description TEXT,
  og_image_path TEXT,
  graphic_path_square TEXT,
  graphic_generated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE share_analytics_events (
  id BIGSERIAL PRIMARY KEY,
  share_id TEXT NOT NULL REFERENCES share_assets(share_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Domain F: payments & auth
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount_usdc NUMERIC(12, 4) NOT NULL,
  network TEXT NOT NULL DEFAULT 'eip155:8453',
  asset TEXT NOT NULL DEFAULT 'USDC',
  payer_address TEXT NOT NULL,
  payee_address TEXT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  facilitator TEXT,
  facilitator_response JSONB,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  amount_usdc NUMERIC(12, 4) NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  run_id UUID REFERENCES engine_runs(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  email_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Domain H: privacy
CREATE TABLE data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  run_id UUID REFERENCES engine_runs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE deleted_runs_tombstones (
  run_id UUID PRIMARY KEY,
  user_id UUID,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deletion_request_id UUID REFERENCES data_deletion_requests(id)
);
