# Memetic Brand Labs — Frontend

React + Vite site for Memetic Brand Labs, including the **Narrative Engine (Beta)** UI.

**Backend:** [narrative-engine-api/README.md](../narrative-engine-api/README.md)  
**Database:** [supabase/README.md](../supabase/README.md)

---

## Prerequisites

- Node.js 20+
- Narrative Engine API running locally (or deployed URL)
- Supabase project (for email auth — optional in early dev)

---

## Run locally

### 1. Configure environment

Create `frontend/.env.local` (Vite loads this automatically):

```bash
# Required — Narrative Engine API
VITE_API_URL=http://localhost:3001

# Required when email auth / wallet rerun is enabled
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Optional — x402 wallet rerun on Base mainnet
VITE_WALLET_CONNECT_PROJECT_ID=
VITE_BASE_CHAIN_ID=8453
```

| Variable | Required | Notes |
|----------|----------|-------|
| `VITE_API_URL` | Yes | No trailing slash. Local: `http://localhost:3001` |
| `VITE_SUPABASE_URL` | For auth | Same as API `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | For auth | Supabase **anon** key (safe for browser) |

### 2. Start API and database first

```bash
# Terminal 1 — database (once): see supabase/README.md
# Terminal 2 — API
cd narrative-engine-api && npm run dev

# Terminal 3 — frontend
cd frontend
npm install   # or pnpm install
npm run dev
```

Open:

| URL | Page |
|-----|------|
| `http://localhost:5173/` | Landing |
| `http://localhost:5173/narrative-engine` | NE form |
| `http://localhost:5173/narrative-engine/run/:id` | Progress + results |
| `http://localhost:5173/results/:shareId` | Public share |

### 3. CORS

The API `CORS_ORIGIN` must include `http://localhost:5173` (set in `narrative-engine-api/.env`).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |

---

## Deploy (Vercel)

### 1. Connect repository

1. [Vercel Dashboard](https://vercel.com) → **Add New Project** → import this repo.
2. **Root Directory:** `frontend`
3. **Framework Preset:** Vite
4. Build command: `npm run build` (default)
5. Output directory: `dist` (default)

### 2. Environment variables

In **Project Settings → Environment Variables** (Production + Preview):

| Key | Example |
|-----|---------|
| `VITE_API_URL` | `https://narrative-engine-api.onrender.com` |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (anon key only) |
| `VITE_BASE_CHAIN_ID` | `8453` |
| `VITE_WALLET_CONNECT_PROJECT_ID` | WalletConnect cloud project ID |
| `VITE_NE_DISCOVERY` | omit or `false` in production — hides NE from homepage/nav |

**Hidden in production:** Narrative Engine stays at `/narrative-engine` (direct URL). Navbar link and landing CTA only appear in local dev unless `VITE_NE_DISCOVERY=true`.

Redeploy after adding variables.

### 3. Supabase auth redirects

In Supabase **Authentication → URL Configuration**:

- **Site URL:** `https://your-vercel-domain.vercel.app`
- **Redirect URLs:** add `https://your-vercel-domain.vercel.app/**`

### 4. API CORS

Set Render API `CORS_ORIGIN` to your Vercel URL (comma-separate if multiple):

```
CORS_ORIGIN=https://memetic.adpr.work,https://your-project.vercel.app
```

### 5. Verify deployment

1. Open `https://your-domain/narrative-engine`
2. Submit a test run → progress → email gate → four cards
3. Test share URL `/results/:shareId`

---

## Narrative Engine routes

| Route | Component |
|-------|-----------|
| `/narrative-engine` | Form + model tier |
| `/narrative-engine/run/:id` | Progress, email gate, cards |
| `/results/:shareId` | Public share page |

**Discovery on the site:** Hidden in production builds. Locally, navbar → “narrative engine” and the landing CTA band are shown. Production: direct URL `/narrative-engine` only (set `VITE_NE_DISCOVERY=true` to re-enable links).

**Deploy:** [docs/narrative-engine/deployment.md](../docs/narrative-engine/deployment.md)

API client: `src/lib/narrativeApi.js`

**Full guide:** [docs/narrative-engine/frontend-integration.md](../docs/narrative-engine/frontend-integration.md)
