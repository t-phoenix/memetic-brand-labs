-- Pre-pipeline auth: store intake before run creation; gate pipeline enqueue

CREATE TABLE IF NOT EXISTS narrative_intake_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  intake JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_auth'
    CHECK (status IN ('pending_auth', 'consumed', 'expired')),
  auth_method TEXT CHECK (auth_method IN ('oauth', 'email', 'x402')),
  email_hash TEXT,
  run_id UUID REFERENCES engine_runs(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_sessions_status ON narrative_intake_sessions(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_intake_sessions_email ON narrative_intake_sessions(email_hash);

ALTER TABLE engine_runs ADD COLUMN IF NOT EXISTS pipeline_enqueued_at TIMESTAMPTZ;

-- intake email attempts (no run_id required yet)
ALTER TABLE access_attempts ALTER COLUMN run_id DROP NOT NULL;
ALTER TABLE access_attempts ADD COLUMN IF NOT EXISTS intake_session_id UUID REFERENCES narrative_intake_sessions(id) ON DELETE CASCADE;

ALTER TABLE engine_runs DROP CONSTRAINT IF EXISTS engine_runs_access_status_check;
ALTER TABLE engine_runs ADD CONSTRAINT engine_runs_access_status_check
  CHECK (access_status IN (
    'pending_auth', 'locked', 'email_pending', 'email_failed',
    'payment_pending', 'payment_failed', 'unlocked'
  ));
