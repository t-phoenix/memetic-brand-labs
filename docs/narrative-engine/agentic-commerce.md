# Agentic commerce & x402 — manual launch checklist

See the implementation plan for full context. Complete these steps before accepting mainnet payments.

## Database

1. Run migration on dev: `supabase db push` (or apply `20260725100000_access_commerce.sql`)
2. Verify seeds: `business_config`, `product_skus`
3. Apply to production after smoke tests pass

## x402 (Base mainnet)

1. Create [Coinbase Developer Platform](https://portal.cdp.coinbase.com) project; enable x402
2. Set `X402_FACILITATOR_URL=https://api.cdp.coinbase.com/platform/v2/x402` and network `eip155:8453` in admin **Configuration → Commerce**

## Privy (human OAuth)

1. Create app at [dashboard.privy.io](https://dashboard.privy.io)
2. Enable Google + Apple; configure Apple Services ID
3. Set `VITE_PRIVY_APP_ID` (frontend) and `PRIVY_APP_ID` + `PRIVY_APP_SECRET` (API)
4. Add allowed origins: production + localhost

## Resend (results + admin notification email)

Narrative Engine delivers email through **Resend** — not Supabase Auth. Magic-link verification still uses Supabase; results cards and internal “run completed” alerts use Resend.

**Full setup guide:** [resend-email-setup.md](./resend-email-setup.md)

Quick checklist:

1. Create a [Resend](https://resend.com) account and **verify domain** `memetic.adpr.work` (SPF, DKIM, DMARC in DNS)
2. Create an API key → set `RESEND_API_KEY` on Render **and** in local `narrative-engine-api/.env`
3. Set `RESULTS_EMAIL_FROM` (or admin **Configuration → From address**) to an address on the verified domain, e.g. `Memetic Brand Labs <results@memetic.adpr.work>`
4. Enable **Send results email** and **Send notification emails on run completion** in admin Configuration
5. Test with a **public** `/narrative-engine` run (Playground `admin_test` runs skip admin notifications)
6. Confirm delivery in Resend **Emails → Logs** and `admin_notification_deliveries` / `result_email_deliveries` tables

## Supabase (magic link verification)

1. Enable Email auth; brand magic link template
2. Redirect URLs: `https://memetic.adpr.work/narrative-engine/verify-email/**`

## Admin

1. Set strong `ADMIN_API_KEY`
2. Use **Configuration → Commerce** to tune SKU prices without redeploy
3. Use **Configuration → x402 product availability** to disable human or agent x402 independently (`product_skus.is_active`). OAuth and company-email flows keep working.

## Agent API

- `GET /v1/capabilities` — discovery (products, x402 payment metadata)
- `GET /llms.txt` — API-hosted agent documentation
- `GET /.well-known/x402` — discovery pointers
- `POST /v1/agent/analyze` — x402 gated (`output_scope`: `cards` | `full_pipeline`)
- `GET /v1/agent/runs/:id/outputs?scope=full` — full pipeline JSON

See [x402-agent-discovery.md](./x402-agent-discovery.md) for the full agent discoverability checklist.
