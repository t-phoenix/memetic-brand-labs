# Admin Dashboard — Frontend Specification

**Status:** Implemented at `/admin` in `frontend/src/admin/`  
**Audience:** Operators and engineers monitoring the Narrative Engine

---

## Goals

Human-readable console for operators to:

1. Confirm all services are healthy (API, worker, Redis, Supabase, storage), show also previous logs to check the historical health.
2. Browse and inspect runs, layers, events, and costs
3. View aggregate spend, token usage, and model-tier performance
4. Inspect live config: prompts, schemas, enums, pricing tiers, patternss
5. Debug failed runs without raw SQL

---

## Non-goals (v1)

- End-user PII export
- Public access

---

## Access model

| Method | Header | Notes |
|--------|--------|-------|
| API key | `X-Admin-Key: <ADMIN_API_KEY>` | Matches Render env `ADMIN_API_KEY` |
| Future | Supabase JWT + `users.role = admin` | `requireAdmin` already checks role when JWT present |

**Dashboard env:**

```bash
VITE_API_URL=https://narrative-engine-api.onrender.com
VITE_ADMIN_API_KEY=           # dev only — prefer login flow in prod
```

Never commit production keys. Use Vercel preview env or password gate on `/admin`.

**Suggested route:** separate subdomain `admin.memetic.adpr.work` (not linked from marketing site).

---

## Existing API endpoints (use today)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | API liveness |
| `GET` | `/v1/admin/runs/:id/layers` | Layer outputs, diagnostic scores, events, cost summary for one run |
| `GET` | `/v1/admin/patterns` | Active pattern library |

### Example — run inspection

```bash
curl -H "X-Admin-Key: $ADMIN_API_KEY" \
  "$API/v1/admin/runs/<run-id>/layers"
```

Response shape:

```json
{
  "layers": [{ "layer_key": "interpretation", "output": {}, "created_at": "..." }],
  "diagnostic_scores": [{ "dimension": "clarity", "score": 42 }],
  "events": [{ "event_type": "stage_started", "payload": {}, "created_at": "..." }],
  "cost_summary": {
    "total_llm_cost_usd": 0.08,
    "total_cogs_usd": 0.08,
    "revenue_usdc": 0
  }
}
```

---

## API endpoints to implement (backend — build before or with dashboard)

The dashboard should call these; implement in `narrative-engine-api` under `/v1/admin/*` with `requireAdmin`.

### `GET /v1/admin/health`

Aggregated service status for the status page.

```json
{
  "api": { "status": "ok", "version": "ne-v1.0.0" },
  "supabase": { "status": "ok", "latency_ms": 45 },
  "redis": { "status": "ok", "mode": "queue" },
  "storage": { "status": "ok", "bucket": "share-graphics" },
  "worker": { "status": "unknown", "hint": "infer from recent job completions" },
  "checked_at": "2026-06-20T12:00:00Z"
}
```

Implementation notes:

- Supabase: `select 1` on `pricing_tiers` limit 1
- Redis: `PING` via BullMQ connection if `REDIS_URL` set; else `{ status: "disabled", mode: "inline" }`
- Worker: query `pipeline_jobs` where `status = completed` and `updated_at > now() - 10 minutes` OR `run_events` with recent `pipeline_completed`
- Storage: `list` bucket with limit 1

### `GET /v1/admin/stats?days=7`

Dashboard home metrics.

```json
{
  "period_days": 7,
  "runs": { "total": 120, "completed": 110, "failed": 5, "pending": 5 },
  "costs": {
    "total_llm_usd": 12.45,
    "avg_per_run_usd": 0.11,
    "revenue_usdc": 50
  },
  "tokens": { "prompt": 450000, "completion": 120000 },
  "by_tier": [
    { "model_tier": "fast", "runs": 80, "avg_cogs_usd": 0.06, "completion_rate": 0.95 }
  ],
  "by_day": [
    { "day": "2026-06-19", "runs": 18, "cogs_usd": 2.1, "revenue_usdc": 10 }
  ]
}
```

**SQL sources** (Supabase views already exist):

- `v_cogs_vs_revenue_daily` — daily COGS vs revenue
- `v_model_tier_performance` — tier aggregates
- `run_cost_summaries`, `llm_token_usage`, `engine_runs` — rollups

### `GET /v1/admin/runs?limit=50&offset=0&status=&q=`

Paginated run list for table view.

Query params: `status` (`pending`|`processing`|`completed`|`failed`), `q` (search `building`/`audience` in `run_inputs`).

```json
{
  "runs": [
    {
      "id": "uuid",
      "status": "completed",
      "model_tier": "fast",
      "created_at": "...",
      "completed_at": "...",
      "progress_pct": 100,
      "building": "SaaS tool",
      "total_llm_cost_usd": 0.09,
      "duration_ms": 58000
    }
  ],
  "total": 120
}
```

Use `v_run_full_audit` or join `engine_runs` + `run_inputs` + `run_cost_summaries`.

### `GET /v1/admin/runs/:id`

Single run header + links to layers tab. Include `run_inputs`, `run_config_snapshots`, `share_id` if any.

### `GET /v1/admin/config`

Read-only config snapshot.

```json
{
  "meta": { "version": "1.1.0" },
  "pricing_tiers": [],
  "prompt_templates": [{ "layer_key": "interpretation", "version": "1.1.0", "is_active": true }],
  "schema_registry": [{ "schema_key": "ne.translation.v1", "version": "1.0.0" }],
  "enum_definitions": [],
  "model_routing": {
    "fast": { "default": "gpt-4o-mini", "interpretation": "gpt-4o-mini" },
    "standard": { "default": "gpt-4o" },
    "quality": { "default": "gpt-4o", "memetic_analysis": "claude-sonnet-4-20250514" }
  }
}
```

Sources: `pricing_tiers`, `prompt_templates`, `schema_registry`, `enum_definitions`, `config/narrative-engine/` via `narrativeConfig.ts` for model routing fallbacks.

### `GET /v1/admin/llm-requests?run_id=`

Per-run LLM call log from `llm_requests` + `llm_token_usage` + `llm_cost_events`.

```json
{
  "requests": [
    {
      "id": "uuid",
      "layer_key": "translation",
      "provider": "openai",
      "model": "gpt-4o-mini",
      "prompt_tokens": 1200,
      "completion_tokens": 80,
      "cost_usd": 0.002,
      "latency_ms": 2100,
      "status": "success",
      "created_at": "..."
    }
  ]
}
```

---

## Page structure (UI)

### 1. Status (`/admin` or `/admin/status`)

**Layout:** Card grid — green/yellow/red per service.

| Card | Data source |
|------|-------------|
| API | `GET /v1/admin/health` |
| Supabase DB | same |
| Redis / Queue | same |
| Worker | same + recent jobs count |
| Storage | same |

Show last checked timestamp + manual refresh button.

### 2. Overview (`/admin/overview`)

- KPI row: runs (7d), failed (7d), total COGS (7d), revenue (7d), avg cost/run
- Line chart: `by_day` from `/v1/admin/stats`
- Bar chart: `by_tier` completion rate + avg COGS
- Table: recent failures (last 10 `status=failed`)

### 3. Runs (`/admin/runs`)

**Table columns:** ID (truncated), status badge, tier, building (truncated), created, duration, COGS, actions.

**Filters:** status, date range, tier, search.

**Row click** → Run detail.

### 4. Run detail (`/admin/runs/:id`)

**Tabs:**

| Tab | Content |
|-----|---------|
| Summary | Inputs, tier, timestamps, cost summary, share link |
| Layers | Accordion per `layer_key` — pretty-printed JSON output |
| Diagnostics | Radar or bar chart from `diagnostic_scores` |
| Events | Timeline from `run_events` (stage_started, layer_completed, …) |
| LLM calls | Table from `/v1/admin/llm-requests?run_id=` |
| Raw | Download full JSON from `/v1/admin/runs/:id/layers` |

**Status colors:** `pending` gray, `processing` blue, `completed` green, `failed` red.

### 5. Costs (`/admin/costs`)

- Daily COGS vs revenue (`v_cogs_vs_revenue_daily`)
- Model breakdown pie chart (`llm_cost_events` grouped by `model`)
- Export CSV (7d / 30d)

### 6. Config (`/admin/config`)

Read-only panels:

- **Pricing tiers** — tier_key, label, price_usdc, model_routing JSON
- **Prompts** — layer_key, version, active flag, expandable system/user preview
- **Schemas** — schema_key, version, JSON schema viewer
- **Enums** — enum_key, values list
- **Patterns** — `GET /v1/admin/patterns` table with tags

### 7. Patterns (`/admin/patterns`) — optional v1

Reuse patterns endpoint; search by tag/category.

---

## Database views (query directly via admin API — do not expose Supabase to browser)

| View | Use |
|------|-----|
| `v_run_full_audit` | Run detail + layer outputs JSON |
| `v_user_journey` | User funnel (v2) |
| `v_cogs_vs_revenue_daily` | Costs page |
| `v_model_tier_performance` | Overview tier chart |
| `v_messaging_problem_distribution` | Product analytics |

Example server-side query:

```sql
SELECT * FROM v_run_full_audit
WHERE run_id = $1;
```

---

## Human-readable formatting rules

| Field | Display |
|-------|---------|
| `total_llm_cost_usd` | `$0.09` (4 dp under $1, 2 dp above) |
| `duration_ms` | `58s` or `1m 12s` |
| `created_at` | Relative + absolute tooltip |
| `status` | Colored badge |
| Layer JSON | Syntax-highlighted, collapsible |
| UUID | First 8 chars + copy full |
| `model_tier` | fast / standard / quality labels from `pricing_tiers` |

---

## Component checklist

```
admin/
  AdminLayout.jsx          # sidebar nav, admin key gate
  AdminGate.jsx            # prompt for X-Admin-Key, store in sessionStorage
  lib/adminApi.js          # fetch wrapper with X-Admin-Key
  pages/
    StatusPage.jsx
    OverviewPage.jsx
    RunsPage.jsx
    RunDetailPage.jsx
    CostsPage.jsx
    ConfigPage.jsx
  components/
    ServiceCard.jsx
    KpiStat.jsx
    RunStatusBadge.jsx
    LayerOutputPanel.jsx
    EventTimeline.jsx
    JsonBlock.jsx
    CostChart.jsx
```

### `adminApi.js` pattern

```javascript
const API = import.meta.env.VITE_API_URL;
const key = () => sessionStorage.getItem('admin_key');

export async function adminFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': key() ?? '',
      ...opts.headers,
    },
  });
  if (res.status === 401) throw new Error('Invalid admin key');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? res.statusText);
  }
  return res.json();
}
```

---

## Security

- Do not ship `VITE_ADMIN_API_KEY` in production builds; use gate UI + sessionStorage
- Rate-limit admin routes on API (future)
- Audit log admin API access to `auth_events` (future)
- RLS: admin API uses service role — never expose service key to dashboard client
- CORS: if admin is separate origin, add to `CORS_ORIGIN` comma list

---

## Implementation order

1. `AdminGate` + `adminApi.js` + `GET /health` status card
2. Backend: `GET /v1/admin/stats`, `GET /v1/admin/runs`, `GET /v1/admin/health`
3. Runs list + run detail (existing `/layers` endpoint)
4. Overview charts
5. Config read-only page
6. Backend: `GET /v1/admin/llm-requests`, `GET /v1/admin/config`
7. Costs page + CSV export

---

## Related

- [deployment.md](./deployment.md) — Render + Supabase + Redis setup
- [database-spec.md](./database-spec.md) — tables and views
- [openapi.yaml](./openapi.yaml) — extend with `/v1/admin/*`
- [runbook.md](./runbook.md) — incident response
