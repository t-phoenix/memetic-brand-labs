# Frontend Integration Guide — Narrative Engine

**Stack:** React + Vite (`frontend/`) · Fastify API (`narrative-engine-api/`)  
**UI spec:** [ui-spec.md](./ui-spec.md) · **OpenAPI:** [openapi.yaml](./openapi.yaml)

---

## Quick start (local)

```bash
# Terminal 1 — API
cd narrative-engine-api
unset OPENAI_API_KEY
set -a && source .env && set +a
export REDIS_URL=
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

| URL | Page |
|-----|------|
| http://localhost:5173/ | Landing (CTA band links to NE) |
| http://localhost:5173/narrative-engine | Analysis form |
| http://localhost:5173/narrative-engine/run/:id | Progress → email → cards |
| http://localhost:5173/results/:shareId | Public share |

**Env:** `frontend/.env` or `.env.local`

```
VITE_API_URL=http://localhost:3001
```

API `CORS_ORIGIN` must include `http://localhost:5173`.

---

## Site integration (how users reach NE)

Routes are registered in `frontend/src/App.jsx`.

| Environment | Discovery |
|-------------|-------------|
| Local dev (`npm run dev`) | Navbar link + landing CTA band |
| Production (Vercel) | **Hidden** — only direct URL `/narrative-engine` |
| Force show in prod | `VITE_NE_DISCOVERY=true` |

Controlled by `frontend/src/lib/featureFlags.js` (`neDiscoveryEnabled`).

All NE pages use `NeLayout` (navbar + peach background) and `NarrativeEngine.css` design tokens from `index.css`.

---

## API client

**File:** `frontend/src/lib/narrativeApi.js`

| Function | Endpoint |
|----------|----------|
| `createNarrativeRun(payload)` | `POST /v1/narrative-runs` |
| `getRunStatus(runId)` | `GET /v1/narrative-runs/:id` |
| `verifyEmail(runId, email)` | `POST /v1/narrative-runs/:id/verify-email` |
| `getRunOutputs(runId)` | `GET /v1/narrative-runs/:id/outputs` |
| `getPricingTiers()` | `GET /v1/pricing-tiers` |
| `getPublicShare(shareId)` | `GET /v1/results/:shareId` |

Session: `X-Session-Id` header (UUID in `localStorage` key `ne_session_id`).

---

## User flow

```
Landing CTA or /narrative-engine
    → Form submit (building, audience, challenge, differentiation, website?, model_tier)
    → POST /v1/narrative-runs → navigate to /narrative-engine/run/:id
    → Poll GET /v1/narrative-runs/:id every 2.5s (progress bar)
    → On completed: email gate
    → POST verify-email
    → GET outputs → four cards + share link
    → Optional: /results/:shareId public page
```

### Form fields

| Field | Required | Maps to API |
|-------|----------|-------------|
| building | yes | `building` |
| audience | yes | `audience` |
| challenge | yes | `challenge` |
| differentiation | yes | `differentiation` |
| website | no | `website` |
| model_tier | yes | `fast` \| `standard` \| `quality` |

### Output cards (fixed contract)

| key | Color | Label |
|-----|-------|-------|
| clear_explanation | green | Clear Explanation |
| positioning | yellow | Positioning Direction |
| messaging_hook | brown | Messaging Hook |
| memetic_angle | red | Memetic Narrative Angle |

---

## Headers

| Header | When |
|--------|------|
| `X-Session-Id` | Every run create (auto via `getSessionId()`) |
| `Authorization: Bearer <jwt>` | After Supabase auth (reruns, optional) |
| `Payment` | x402 proof on paid rerun |

---

## Rerun (x402) — not in UI yet

1. `POST /v1/narrative-runs/rerun` with Bearer token → expect `402`
2. Wallet pays USDC on Base per `payment` object in response
3. Retry with `Payment` header

Env for future wallet UI:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_WALLET_CONNECT_PROJECT_ID=
VITE_BASE_CHAIN_ID=8453
```

---

## Share

- Public page: `/results/:shareId` → `GET /v1/results/:shareId`
- PNG download: `GET /v1/results/:shareId/graphic.png`

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `/narrative-engine` blank or network error | Set `VITE_API_URL` in `frontend/.env`; start API on :3001 |
| CORS error in browser console | `CORS_ORIGIN=http://localhost:5173` in API `.env` |
| Stuck on progress forever | API needs `OPENAI_API_KEY`; unset `REDIS_URL` if Redis not running |
| Email gate but no cards | Check API logs; verify email then `GET /outputs` |
| Can’t find NE on homepage | Scroll to CTA band or use navbar “narrative engine” |

---

## Deploy (Vercel)

```
VITE_API_URL=https://your-api.onrender.com
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Set API `CORS_ORIGIN` to your Vercel domain. Root directory: `frontend`.

---

## Files reference

| File | Role |
|------|------|
| `src/App.jsx` | Route definitions |
| `src/pages/NarrativeEnginePage.jsx` | Form |
| `src/pages/NarrativeRunPage.jsx` | Progress + email + cards |
| `src/pages/SharedResultPage.jsx` | Public share |
| `src/components/NeLayout.jsx` | Brand shell |
| `src/components/NarrativeEngineCTA.jsx` | Landing CTA |
| `src/lib/narrativeApi.js` | API client |
