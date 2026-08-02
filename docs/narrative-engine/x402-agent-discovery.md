# x402 agent discovery checklist

Use this checklist before and after launching agent-facing x402 endpoints. See also [agentic-commerce.md](./agentic-commerce.md) for ops setup.

## Infrastructure (manual / ops)

- [ ] CDP x402 facilitator configured (`X402_FACILITATOR_URL`, `x402.facilitator_url` in admin)
- [ ] Treasury wallet set (`X402_PAY_TO` / `x402.pay_to`)
- [ ] `API_PUBLIC_URL` points to production API host
- [ ] Base mainnet USDC (`eip155:8453`) funded for test payments
- [ ] Migration `20260725100000_access_commerce.sql` applied; `product_skus` active

## Discovery surfaces (agent must find these)

- [ ] `GET https://api.memetic.adpr.work/v1/capabilities` returns products, routes, prices, payment metadata
- [ ] `GET https://api.memetic.adpr.work/openapi.json` returns valid JSON OpenAPI
- [ ] `GET https://api.memetic.adpr.work/llms.txt` — API-hosted agent docs
- [ ] `GET https://api.memetic.adpr.work/.well-known/x402` — discovery pointers
- [ ] `https://memetic.adpr.work/llms.txt` — marketing site agent section
- [ ] `robots.txt` / `sitemap.xml` reference `/llms.txt`
- [ ] `GET /health` returns `Link` headers and `discovery` object

## x402 protocol contract

- [ ] Unpaid `POST /v1/agent/analyze` → `402` with `x402Version: 2`, `accepts[]`, `resource`
- [ ] When `discovery.bazaar_enabled=true`, 402 includes `extensions.bazaar`
- [ ] Capabilities documents network, USDC asset, facilitator, pay_to, payment header names
- [ ] Capabilities `products[].model_tiers` lists fast / standard / quality prices per SKU
- [ ] `model_tier` in analyze body changes 402 amount (default `fast`)
- [ ] Paid retry with `payment-signature` (or `x-payment` / `payment`) → `201` + `run_id`

## Verification (smoke tests)

```bash
# Discovery
curl -s https://api.memetic.adpr.work/v1/capabilities | jq .
curl -sI https://api.memetic.adpr.work/health | grep -i link

# Unpaid analyze → 402
curl -s -X POST https://api.memetic.adpr.work/v1/agent/analyze \
  -H 'Content-Type: application/json' \
  -d '{"building":"Test","audience":"Devs","challenge":"Clarity","differentiation":"Speed","output_scope":"cards","model_tier":"quality"}'

# Poll + outputs (after paid run)
curl -s https://api.memetic.adpr.work/v1/agent/runs/{run_id}
curl -s "https://api.memetic.adpr.work/v1/agent/runs/{run_id}/outputs?scope=cards"
```

- [ ] Optional: register in external x402 Bazaar or AgentCash catalog

## Human commerce (related)

- [ ] `POST /v1/runs/:id/unlock` — human x402 skip-email unlock (~$0.10 USDC)
- [ ] `GET /v1/commerce/human-unlock-quote` — price quote without payment

## SKUs (default tier prices — editable in admin Configuration → Commerce)

| SKU | Tier | USDC |
|-----|------|------|
| `agent_cards` | fast / standard / quality | $0.25 / $0.50 / $1.00 |
| `agent_full` | fast / standard / quality | $2.50 / $5.00 / $10.00 |
| `human_unlock` | fast / standard / quality | $0.10 / $0.20 / $0.40 |

Complimentary company-email runs use admin-configured `access.free_email_model_tier` (default quality). OAuth free runs use quality.
