-- Agentic access, x402 commerce, and admin-configurable business rules (additive)

-- Domain G extension: business config catalog
CREATE TABLE IF NOT EXISTS business_config (
  config_key TEXT PRIMARY KEY,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Commerce SKUs (separate from LLM pricing_tiers)
CREATE TABLE IF NOT EXISTS product_skus (
  sku_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  price_usdc NUMERIC(12, 4) NOT NULL,
  output_scope TEXT NOT NULL CHECK (output_scope IN ('cards', 'full_pipeline')),
  audience TEXT NOT NULL CHECK (audience IN ('human', 'agent')),
  model_tier_key TEXT REFERENCES pricing_tiers(tier_key),
  is_active BOOLEAN NOT NULL DEFAULT true,
  x402_route_template TEXT,
  bazaar_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Access grants (replaces boolean email_verified_for_run over time)
CREATE TABLE IF NOT EXISTS run_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  grant_type TEXT NOT NULL CHECK (grant_type IN ('oauth', 'email_verified', 'x402_payment', 'admin_override')),
  output_scope TEXT NOT NULL DEFAULT 'cards' CHECK (output_scope IN ('cards', 'full_pipeline')),
  principal_type TEXT,
  principal_id TEXT,
  payment_tx_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_run_access_grants_run ON run_access_grants(run_id);
CREATE INDEX IF NOT EXISTS idx_run_access_grants_principal ON run_access_grants(principal_type, principal_id);

-- Unlock attempt audit (retry / failure tracking)
CREATE TABLE IF NOT EXISTS access_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  attempt_type TEXT NOT NULL CHECK (attempt_type IN ('email', 'oauth', 'x402')),
  status TEXT NOT NULL CHECK (status IN ('initiated', 'pending', 'succeeded', 'failed', 'expired', 'cancelled')),
  failure_code TEXT,
  failure_detail JSONB,
  recovery_hint TEXT,
  idempotency_key TEXT,
  recipient_email_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_access_attempts_run ON access_attempts(run_id, created_at DESC);

-- Results email delivery audit
CREATE TABLE IF NOT EXISTS result_email_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  grant_id UUID REFERENCES run_access_grants(id) ON DELETE SET NULL,
  recipient_email_hash TEXT NOT NULL,
  recipient_domain TEXT,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'bounced', 'failed')),
  failure_code TEXT,
  failure_detail JSONB,
  attempt_number SMALLINT NOT NULL DEFAULT 1,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_result_email_deliveries_run ON result_email_deliveries(run_id, created_at DESC);

-- engine_runs extensions
ALTER TABLE engine_runs ADD COLUMN IF NOT EXISTS output_scope_requested TEXT NOT NULL DEFAULT 'cards';
ALTER TABLE engine_runs ADD COLUMN IF NOT EXISTS access_status TEXT NOT NULL DEFAULT 'locked';
ALTER TABLE engine_runs ADD COLUMN IF NOT EXISTS access_failure_code TEXT;
ALTER TABLE engine_runs ADD COLUMN IF NOT EXISTS access_failure_at TIMESTAMPTZ;
ALTER TABLE engine_runs ADD COLUMN IF NOT EXISTS unlock_method TEXT;
ALTER TABLE engine_runs ADD COLUMN IF NOT EXISTS payer_wallet TEXT;
ALTER TABLE engine_runs ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE engine_runs ADD COLUMN IF NOT EXISTS pending_verification_email_hash TEXT;

ALTER TABLE engine_runs DROP CONSTRAINT IF EXISTS engine_runs_run_source_check;
ALTER TABLE engine_runs ADD CONSTRAINT engine_runs_run_source_check
  CHECK (run_source IN ('user', 'admin_test', 'admin_replay', 'agent', 'human_paid'));

ALTER TABLE engine_runs DROP CONSTRAINT IF EXISTS engine_runs_access_status_check;
ALTER TABLE engine_runs ADD CONSTRAINT engine_runs_access_status_check
  CHECK (access_status IN ('locked', 'email_pending', 'email_failed', 'payment_pending', 'payment_failed', 'unlocked'));

-- users extensions
ALTER TABLE users ADD COLUMN IF NOT EXISTS privy_user_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_domain TEXT;

-- payment_transactions extensions (sku_key added after product_skus exists)
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS sku_key TEXT REFERENCES product_skus(sku_key);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payment_signature TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS facilitator_settlement JSONB;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS failure_code TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS failure_detail JSONB;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- payment_attempts extensions
ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES engine_runs(id) ON DELETE SET NULL;
ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS sku_key TEXT;
ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS failure_code TEXT;
ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS facilitator_response JSONB;
ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- auth_events extensions
ALTER TABLE auth_events ADD COLUMN IF NOT EXISTS grant_type TEXT;
ALTER TABLE auth_events ADD COLUMN IF NOT EXISTS email_domain TEXT;
ALTER TABLE auth_events ADD COLUMN IF NOT EXISTS verification_provider TEXT;
ALTER TABLE auth_events ADD COLUMN IF NOT EXISTS verification_result JSONB;

-- FK for payment_tx on grants (after payment_transactions columns exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'run_access_grants_payment_tx_id_fkey'
  ) THEN
    ALTER TABLE run_access_grants
      ADD CONSTRAINT run_access_grants_payment_tx_id_fkey
      FOREIGN KEY (payment_tx_id) REFERENCES payment_transactions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- RLS
ALTER TABLE business_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_email_deliveries ENABLE ROW LEVEL SECURITY;

-- Seed business_config defaults
INSERT INTO business_config (config_key, config_value, description) VALUES
  ('access.consumer_domain_blocklist', '["gmail.com","googlemail.com","yahoo.com","hotmail.com","outlook.com","live.com","icloud.com","me.com","mac.com","aol.com","protonmail.com","proton.me","mail.com","gmx.com","yandex.com","zoho.com"]'::jsonb, 'Block typed personal email domains'),
  ('access.allow_oauth_personal_email', 'true'::jsonb, 'Allow Privy OAuth with personal email'),
  ('access.email_vendor_enabled', 'false'::jsonb, 'Third-party email verification'),
  ('access.email_vendor_threshold', '"suspicious_domain_only"'::jsonb, 'When to call email vendor'),
  ('pricing.human_unlock_usdc', '0.10'::jsonb, 'USDC to skip email gate'),
  ('pricing.agent_cards_usdc', '0.25'::jsonb, 'Agent cards-only price'),
  ('pricing.agent_full_usdc', '2.50'::jsonb, 'Agent full pipeline price'),
  ('x402.network', '"eip155:8453"'::jsonb, 'Base mainnet CAIP-2'),
  ('x402.facilitator_url', '"https://x402.org/facilitator"'::jsonb, 'x402 facilitator URL'),
  ('x402.pay_to', '""'::jsonb, 'Treasury wallet — set via admin or env'),
  ('discovery.bazaar_enabled', 'true'::jsonb, 'Include Bazaar extension on 402'),
  ('discovery.service_name', '"MBL Narrative Engine"'::jsonb, 'Bazaar service name'),
  ('discovery.tags', '["brand","positioning","messaging","narrative"]'::jsonb, 'Bazaar tags'),
  ('email.results_enabled', 'true'::jsonb, 'Send results email on unlock'),
  ('email.results_from', '"Memetic Brand Labs <results@memetic.adpr.work>"'::jsonb, 'Results email from'),
  ('email.results_reply_to', '"hello@adpr.work"'::jsonb, 'Results email reply-to'),
  ('email.results_include_share_link', 'true'::jsonb, 'Include share URL in results email')
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO product_skus (sku_key, label, price_usdc, output_scope, audience, model_tier_key, x402_route_template) VALUES
  ('human_unlock', 'Human unlock (skip email)', 0.10, 'cards', 'human', 'fast', 'POST /v1/runs/:id/unlock'),
  ('agent_cards', 'Agent — 4 cards', 0.25, 'cards', 'agent', 'fast', 'POST /v1/agent/analyze'),
  ('agent_full', 'Agent — full pipeline', 2.50, 'full_pipeline', 'agent', 'standard', 'POST /v1/agent/analyze')
ON CONFLICT (sku_key) DO UPDATE SET
  label = EXCLUDED.label,
  price_usdc = EXCLUDED.price_usdc,
  output_scope = EXCLUDED.output_scope,
  audience = EXCLUDED.audience,
  model_tier_key = EXCLUDED.model_tier_key,
  x402_route_template = EXCLUDED.x402_route_template;

-- Backfill access grants from legacy email_verified_for_run
INSERT INTO run_access_grants (run_id, grant_type, output_scope, principal_type, metadata)
SELECT id, 'email_verified', 'cards', 'email_hash', '{"migrated": true}'::jsonb
FROM engine_runs
WHERE email_verified_for_run = true
  AND NOT EXISTS (SELECT 1 FROM run_access_grants g WHERE g.run_id = engine_runs.id);

UPDATE engine_runs
SET access_status = 'unlocked', unlock_method = 'email_verified'
WHERE email_verified_for_run = true AND access_status = 'locked';
