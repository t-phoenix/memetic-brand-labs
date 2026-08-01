-- Contact email on runs + admin completion notifications

ALTER TABLE engine_runs ADD COLUMN IF NOT EXISTS contact_email TEXT;
CREATE INDEX IF NOT EXISTS idx_engine_runs_contact_email ON engine_runs(contact_email);

CREATE TABLE IF NOT EXISTS admin_notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES engine_runs(id) ON DELETE CASCADE,
  recipients TEXT[] NOT NULL,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  failure_code TEXT,
  failure_detail JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_notification_deliveries_run
  ON admin_notification_deliveries(run_id);

ALTER TABLE admin_notification_deliveries ENABLE ROW LEVEL SECURITY;

INSERT INTO business_config (config_key, config_value, description) VALUES
  ('email.admin_notify_enabled', 'true'::jsonb, 'Send internal email when a user run completes'),
  ('email.admin_notify_recipients', '["abhinil.agarwal@adpr.work","anand.peter@adpr.work"]'::jsonb, 'Internal notification recipients'),
  ('email.workshop_cta_enabled', 'true'::jsonb, 'Include workshop CTA in results email'),
  ('email.workshop_cta_url', '"https://memetic.adpr.work/application-form"'::jsonb, 'Workshop application URL'),
  ('email.workshop_cta_label', '"Apply for the Memetic Brand Workshop"'::jsonb, 'Workshop CTA button label')
ON CONFLICT (config_key) DO NOTHING;

-- Backfill contact_email only where plaintext was stored (OAuth grants). Magic-link runs
-- only have SHA256 hashes and cannot be recovered into contact_email.
UPDATE engine_runs er
SET contact_email = lower(g.metadata->>'email')
FROM (
  SELECT DISTINCT ON (run_id) run_id, metadata
  FROM run_access_grants
  WHERE grant_type = 'oauth' AND metadata->>'email' IS NOT NULL
  ORDER BY run_id, granted_at DESC
) g
WHERE er.id = g.run_id AND er.contact_email IS NULL;
