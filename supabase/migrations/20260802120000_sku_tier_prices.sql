-- Per-tier x402 pricing matrix (SKU × model tier) + configurable free-email tier

CREATE TABLE IF NOT EXISTS product_sku_tier_prices (
  sku_key TEXT NOT NULL REFERENCES product_skus(sku_key) ON DELETE CASCADE,
  tier_key TEXT NOT NULL REFERENCES pricing_tiers(tier_key) ON DELETE CASCADE,
  price_usdc NUMERIC(12, 6) NOT NULL CHECK (price_usdc >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (sku_key, tier_key)
);

ALTER TABLE product_sku_tier_prices ENABLE ROW LEVEL SECURITY;

-- Seed: Fast = current SKU price; Standard 2×; Quality 4×
INSERT INTO product_sku_tier_prices (sku_key, tier_key, price_usdc) VALUES
  ('human_unlock', 'fast', 0.10),
  ('human_unlock', 'standard', 0.20),
  ('human_unlock', 'quality', 0.40),
  ('agent_cards', 'fast', 0.25),
  ('agent_cards', 'standard', 0.50),
  ('agent_cards', 'quality', 1.00),
  ('agent_full', 'fast', 2.50),
  ('agent_full', 'standard', 5.00),
  ('agent_full', 'quality', 10.00)
ON CONFLICT (sku_key, tier_key) DO NOTHING;

INSERT INTO business_config (config_key, config_value, description) VALUES
  (
    'access.free_email_model_tier',
    '"quality"'::jsonb,
    'Model tier for complimentary company-email verification runs (fast | standard | quality)'
  )
ON CONFLICT (config_key) DO NOTHING;
