#!/usr/bin/env bash
# Narrative Engine API — endpoint smoke test with verbose logging.
#
# Usage:
#   cd narrative-engine-api
#   set -a && source .env && set +a
#   export REDIS_URL=                    # unset Redis for inline pipeline (no worker)
#   export ADMIN_API_KEY=local-dev-admin # optional, for admin endpoints
#   npm run dev                          # separate terminal
#   ./scripts/smoke-test.sh
#
# Env overrides:
#   BASE_URL=http://localhost:3001
#   ADMIN_API_KEY=...
#   SKIP_PIPELINE=1   # skip POST /v1/narrative-runs (slow, calls OpenAI)
#   RUN_ID=uuid       # reuse existing run for read-only checks

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001}"
ADMIN_API_KEY="${ADMIN_API_KEY:-}"
SESSION_ID="smoke-$(date +%s)"
EMAIL="smoke-test@example.com"
LOG_DIR="${LOG_DIR:-/tmp/ne-smoke-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$LOG_DIR"

log() { printf '\n[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }
save() {
  local name="$1"
  shift
  "$@" > "$LOG_DIR/${name}.json" 2>"$LOG_DIR/${name}.stderr"
  local code=$?
  echo "  → saved $LOG_DIR/${name}.json (exit $code)"
  return $code
}
curl_json() {
  local method="$1" path="$2" name="$3"
  shift 3
  log "$method $path"
  curl -s -w "\n__HTTP__:%{http_code}\n" -X "$method" \
    -H "Content-Type: application/json" \
    "$@" \
    "${BASE_URL}${path}" | tee "$LOG_DIR/${name}.raw" | sed '/^__HTTP__:/d'
  local http
  http=$(grep '__HTTP__:' "$LOG_DIR/${name}.raw" | cut -d: -f2)
  echo "  HTTP $http"
  echo "$http"
}

# ─── 1. Health & config ───────────────────────────────────────────────────────

log "=== 1. GET /health ==="
curl_json GET /health health | head -5

log "=== 2. GET /v1/pricing-tiers ==="
curl_json GET /v1/pricing-tiers pricing-tiers | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('  tiers:', [t['tier_key'] for t in d.get('tiers',[])])
" 2>/dev/null || true

# ─── 2. Create run (optional — ~60s inline pipeline) ─────────────────────────

RUN_ID="${RUN_ID:-}"

if [[ "${SKIP_PIPELINE:-}" != "1" && -z "$RUN_ID" ]]; then
  log "=== 3. POST /v1/narrative-runs (inline pipeline — expect ~60s) ==="
  CREATE_BODY=$(curl -s -w "\n__HTTP__:%{http_code}" -X POST "${BASE_URL}/v1/narrative-runs" \
    -H "Content-Type: application/json" \
    -H "x-session-id: ${SESSION_ID}" \
    -d '{
      "building": "API testing tool for backend teams",
      "audience": "Backend engineers at startups",
      "challenge": "Messaging is too technical",
      "differentiation": "One-click mock servers from OpenAPI specs",
      "website": "https://stripe.com",
      "model_tier": "fast"
    }')
  echo "$CREATE_BODY" | sed '/^__HTTP__:/d' | tee "$LOG_DIR/create-run.json"
  HTTP=$(echo "$CREATE_BODY" | grep '__HTTP__:' | cut -d: -f2)
  echo "  HTTP $HTTP"
  RUN_ID=$(echo "$CREATE_BODY" | sed '/^__HTTP__:/d' | python3 -c "import sys,json; print(json.load(sys.stdin).get('run_id',''))" 2>/dev/null || true)
  if [[ -z "$RUN_ID" ]]; then
    log "ERROR: create run failed — check server logs and OPENAI_API_KEY"
    exit 1
  fi
  log "  run_id=$RUN_ID"
else
  log "=== 3. Skipping create (SKIP_PIPELINE=1 or RUN_ID set) ==="
  [[ -z "$RUN_ID" ]] && { log "Set RUN_ID=... for read-only tests"; exit 1; }
fi

# ─── 3. Run lifecycle ─────────────────────────────────────────────────────────

log "=== 4. GET /v1/narrative-runs/:id (before email) ==="
curl_json GET "/v1/narrative-runs/${RUN_ID}" run-before-email | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('  status:', d.get('status'), 'stage:', d.get('current_stage'), 'pct:', d.get('progress_pct'))
print('  has outputs:', 'outputs' in d)
" 2>/dev/null || true

log "=== 5. GET /v1/narrative-runs/:id/outputs (expect 403 before verify) ==="
HTTP=$(curl -s -o "$LOG_DIR/outputs-403.json" -w "%{http_code}" "${BASE_URL}/v1/narrative-runs/${RUN_ID}/outputs")
echo "  HTTP $HTTP"
cat "$LOG_DIR/outputs-403.json" | head -3

log "=== 6. POST /v1/narrative-runs/:id/verify-email ==="
curl_json POST "/v1/narrative-runs/${RUN_ID}/verify-email" verify-email \
  -d "{\"email\":\"${EMAIL}\"}" | head -5

if [[ "${SKIP_PIPELINE:-}" != "1" ]]; then
  log "=== 7. Poll run until completed/failed ==="
  for i in $(seq 1 30); do
    curl -s "${BASE_URL}/v1/narrative-runs/${RUN_ID}" > "$LOG_DIR/poll-${i}.json"
    STATUS=$(python3 -c "import json; print(json.load(open('$LOG_DIR/poll-${i}.json')).get('status',''))")
    STAGE=$(python3 -c "import json; print(json.load(open('$LOG_DIR/poll-${i}.json')).get('current_stage',''))")
    echo "  poll $i: status=$STATUS stage=$STAGE"
    [[ "$STATUS" == "completed" || "$STATUS" == "failed" ]] && break
    sleep 3
  done
fi

log "=== 8. GET /v1/narrative-runs/:id (after verify) ==="
curl -s "${BASE_URL}/v1/narrative-runs/${RUN_ID}" | tee "$LOG_DIR/run-final.json" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('  status:', d.get('status'))
print('  share_id:', d.get('share_id'))
cards=d.get('outputs') or []
for c in cards:
    print('  card:', c.get('key'), '→', (c.get('content') or '')[:60]+'...')
" 2>/dev/null || true

SHARE_ID=$(python3 -c "import json; print(json.load(open('$LOG_DIR/run-final.json')).get('share_id') or '')" 2>/dev/null || true)

log "=== 9. GET /v1/narrative-runs/:id/outputs ==="
curl -s -w "\nHTTP:%{http_code}\n" "${BASE_URL}/v1/narrative-runs/${RUN_ID}/outputs" | tee "$LOG_DIR/outputs.json" | head -20

# ─── 4. Share endpoints ───────────────────────────────────────────────────────

if [[ -n "$SHARE_ID" ]]; then
  log "=== 10. GET /v1/results/:shareId ==="
  curl -s "${BASE_URL}/v1/results/${SHARE_ID}" | tee "$LOG_DIR/share.json" | head -15

  log "=== 11. GET /v1/results/:shareId/graphic.png ==="
  HTTP=$(curl -s -o "$LOG_DIR/share.png" -w "%{http_code}" "${BASE_URL}/v1/results/${SHARE_ID}/graphic.png")
  echo "  HTTP $HTTP  size=$(wc -c < "$LOG_DIR/share.png" | tr -d ' ') bytes"
else
  log "=== 10–11. Skipping share (no share_id) ==="
fi

# ─── 5. Auth-gated endpoints ──────────────────────────────────────────────────

log "=== 12. POST /v1/narrative-runs/rerun (no auth → 401) ==="
HTTP=$(curl -s -o "$LOG_DIR/rerun-401.json" -w "%{http_code}" -X POST "${BASE_URL}/v1/narrative-runs/rerun" \
  -H "Content-Type: application/json" -d '{}')
echo "  HTTP $HTTP"

log "=== 13. DELETE /v1/me/runs/:id (no auth → 401) ==="
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${BASE_URL}/v1/me/runs/${RUN_ID}")
echo "  HTTP $HTTP"

log "=== 14. GET /v1/admin/* ==="
if [[ -n "$ADMIN_API_KEY" ]]; then
  curl -s -H "X-Admin-Key: ${ADMIN_API_KEY}" "${BASE_URL}/v1/admin/patterns" \
    | tee "$LOG_DIR/admin-patterns.json" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('  active patterns:', len(d.get('patterns',[])))" 2>/dev/null || true

  curl -s -H "X-Admin-Key: ${ADMIN_API_KEY}" "${BASE_URL}/v1/admin/runs/${RUN_ID}/layers" \
    | tee "$LOG_DIR/admin-layers.json" \
    | python3 -c "
import sys,json
d=json.load(sys.stdin)
layers=d.get('layers') or []
events=d.get('events') or []
cost=d.get('cost_summary')
print('  layer_outputs:', len(layers))
print('  run_events:', len(events))
if cost: print('  total_cost_usd:', cost.get('total_cost_usd'))
for e in events[:8]:
    print('   event:', e.get('event_type'), e.get('stage_key',''))
" 2>/dev/null || true
else
  echo "  Set ADMIN_API_KEY to test admin endpoints"
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/v1/admin/patterns")
  echo "  admin/patterns without key → HTTP $HTTP"
fi

log "=== 15. GET missing run ==="
curl -s "${BASE_URL}/v1/narrative-runs/00000000-0000-0000-0000-000000000000" | tee "$LOG_DIR/not-found.json"

# ─── 6. Under-the-hood hints ──────────────────────────────────────────────────

log "=== Done ==="
echo "  Logs saved to: $LOG_DIR"
echo ""
echo "Under-the-hood (Supabase SQL after a run):"
echo "  SELECT event_type, stage_key, created_at FROM run_events WHERE run_id = '${RUN_ID}' ORDER BY created_at;"
echo "  SELECT layer_key, validation_passed FROM layer_outputs WHERE run_id = '${RUN_ID}';"
echo "  SELECT system_prompt FROM layer_prompt_snapshots lps"
echo "    JOIN layer_executions le ON le.id = lps.layer_execution_id"
echo "    WHERE le.run_id = '${RUN_ID}' LIMIT 1;"
echo ""
echo "Server logs: watch the terminal running 'npm run dev' (pino JSON)."
