# x402 Payments — Narrative Engine Reruns

## Spec

| Field | Value |
|-------|-------|
| Network | Base `eip155:8453` |
| Asset | USDC |
| Price | $10 USDC fixed (`RERUN_PRICE_USDC`) |
| Route | `POST /v1/narrative-runs/rerun` |

## Flow

1. Client POSTs rerun → `402` with payment requirements
2. Wallet signs USDC on Base
3. Client retries with `Payment` header
4. Server records `payment_transactions`, starts new run

## Env vars

- `X402_PAY_TO` — treasury address
- `X402_FACILITATOR_URL` — default `https://x402.org/facilitator`

## Audit

All payments in `payment_transactions` linked to `engine_runs`.

## Testnet

Use Base Sepolia + test USDC before mainnet launch.
