# Narrative Engine — Operations Runbook

## Deploy

1. Apply Supabase migrations + seed
2. Create Storage bucket `share-graphics` (public read)
3. Deploy Render web + worker from `render.yaml`
4. Set env vars per `.env.example`

## Env vars (required)

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `CORS_ORIGIN`

## Optional

`REDIS_URL`, `ANTHROPIC_API_KEY`, `X402_PAY_TO`, `ADMIN_API_KEY`, `RESEND_API_KEY`, `RESULTS_EMAIL_FROM`

Email setup: [resend-email-setup.md](./resend-email-setup.md)

## Health

`GET /health` → `{ status: "ok" }`

## Rollback

- Render: redeploy previous commit
- DB: never rollback migrations; forward-fix only

## Incidents

| Symptom | Check |
|---------|-------|
| Runs stuck pending | Redis worker running? Inline mode logs |
| High COGS | `v_cogs_vs_revenue_daily`, tier usage |
| 402 failures | Facilitator status, treasury address |
| No results / admin email | Resend domain verified? `RESEND_API_KEY` on Render? `admin_notification_deliveries` / `result_email_deliveries` status; Resend **Emails → Logs** |
| `resend_not_configured` in DB | API key missing on the process that ran the pipeline |

## Logs

Structured pino logs; no prompt content in production.
