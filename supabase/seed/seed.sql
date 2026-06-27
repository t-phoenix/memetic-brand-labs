-- Seed: pricing, LLM rates, guardrails
-- Enums, schemas, prompts: see generated/narrative-config.sql (npm run config:generate)

INSERT INTO pricing_tiers (tier_key, label, price_usdc, model_routing) VALUES
('fast', 'Fast', 10, '{"interpretation":"gpt-4o-mini","diagnostics":"gpt-4o-mini","translation":"gpt-4o-mini","positioning":"gpt-4o-mini","memetic_analysis":"gpt-4o-mini","output_generation":"gpt-4o-mini","default":"gpt-4o-mini"}'),
('standard', 'Standard', 10, '{"interpretation":"gpt-4o-mini","diagnostics":"gpt-4o-mini","translation":"gpt-4o","positioning":"gpt-4o","memetic_analysis":"gpt-4o","output_generation":"gpt-4o-mini","default":"gpt-4o"}'),
('quality', 'Quality', 10, '{"interpretation":"gpt-4o","diagnostics":"gpt-4o","translation":"gpt-4o","positioning":"gpt-4o","memetic_analysis":"gpt-4o","output_generation":"gpt-4o","default":"gpt-4o"}')
ON CONFLICT (tier_key) DO UPDATE SET model_routing = EXCLUDED.model_routing;

INSERT INTO llm_model_pricing (provider, model, input_price_per_m, output_price_per_m, version) VALUES
('openai', 'gpt-4o-mini', 0.15, 0.60, 'v1'),
('openai', 'gpt-4o', 2.50, 10.00, 'v1'),
('anthropic', 'claude-3-5-haiku-20241022', 1.00, 5.00, 'v1'),
('anthropic', 'claude-3-5-sonnet-20241022', 3.00, 15.00, 'v1')
ON CONFLICT (provider, model, effective_from) DO NOTHING;

INSERT INTO guardrail_rules (version, rules, is_active) VALUES
('v1', '{"blocklist":["viral","guaranteed","lfg","wagmi"],"max_hook_sentences":1}'::jsonb, true);
