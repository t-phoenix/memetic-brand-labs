-- Tag runs by origin (user vs admin playground)
ALTER TABLE engine_runs
  ADD COLUMN IF NOT EXISTS run_source TEXT NOT NULL DEFAULT 'user';

ALTER TABLE engine_runs
  DROP CONSTRAINT IF EXISTS engine_runs_run_source_check;

ALTER TABLE engine_runs
  ADD CONSTRAINT engine_runs_run_source_check
  CHECK (run_source IN ('user', 'admin_test', 'admin_replay'));

CREATE INDEX IF NOT EXISTS idx_engine_runs_run_source ON engine_runs(run_source, created_at DESC);
