# x402 Payments — Narrative Engine

## Overview

Narrative Engine uses [x402](https://www.x402.org/) for USDC micropayments on Base (`eip155:8453`). Agent discovery: [x402-agent-discovery.md](./x402-agent-discovery.md).

## SKUs

| SKU | Route | Price (default) | Audience |
|-----|-------|-----------------|----------|
| `agent_cards` | `POST /v1/agent/analyze` | $0.25 USDC | AI agents |
| `agent_full` | `POST /v1/agent/analyze` | $2.50 USDC | AI agents |
| `human_unlock` | `POST /v1/runs/:id/unlock` | $0.10 USDC | Humans (skip email) |
| `human_unlock` | `POST /v1/narrative-runs/rerun` | $0.10 USDC | Humans (rerun) |

Prices are configurable via admin **Configuration → Commerce** (`pricing.*_usdc` keys).

## Agent flow

1. `GET /v1/capabilities` — discovery (products, payment metadata)
2. `POST /v1/agent/analyze` without payment header → `402` with `accepts[]`
3. Wallet pays USDC on Base; client retries with `payment-signature` header
4. `201` + `run_id` → poll `GET /v1/agent/runs/:id` until `completed`
5. `GET /v1/agent/runs/:id/outputs?scope=cards|full`

## Human unlock flow

1. `GET /v1/commerce/human-unlock-quote` — optional price preview
2. `POST /v1/runs/:id/unlock` → `402` then paid retry
3. Or verify company email / OAuth instead of payment

## Env vars

- `X402_PAY_TO` — treasury address (required for mainnet; unset = dev bypass)
- `X402_FACILITATOR_URL` — default `https://facilitator.xpay.sh` for Base mainnet; use `https://x402.org/facilitator` only with Base Sepolia (`eip155:84532`)
- `API_PUBLIC_URL` — public API base for 402 `resource` URLs

## Payment headers

Clients may send payment proof via any of:

- `payment-signature`
- `x-payment`
- `payment`

## Audit

All payments recorded in `payment_transactions` linked to `engine_runs`.

## Testnet

Use Base Sepolia + test USDC before mainnet launch. Set facilitator and pay_to accordingly in admin config.
