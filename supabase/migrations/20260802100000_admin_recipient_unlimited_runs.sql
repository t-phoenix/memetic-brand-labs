-- Allow admin notification recipients unlimited free narrative runs (toggle in admin config)

INSERT INTO business_config (config_key, config_value, description) VALUES
  (
    'access.admin_recipient_unlimited_runs_enabled',
    'false'::jsonb,
    'When enabled, emails in email.admin_notify_recipients bypass the one-time free run limit'
  )
ON CONFLICT (config_key) DO NOTHING;
