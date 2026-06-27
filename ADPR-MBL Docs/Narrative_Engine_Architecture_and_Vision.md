# Narrative Engine — Vision, Team Thinking & Architecture

**Document purpose:** Single reference for what the Narrative Engine is, how the MBL team is thinking about it, and how to build a persistent, scalable backend that can grow into the broader Memetic Engine and Creative Intelligence OS (CI OS).

**Sources:** `Adpr MBL_Narrative Engine Backend Prompt Logic_v2.docx`, `Adpr Meme Brand Project Website Structure_Prompt_Logic_V12.docx`, `Adpr Memetic Brand Labs_Narrative engine.pdf`, MBL frontend design system, TCT website (separate brand, referenced for design discipline only).

**Status:** Planning / pre-implementation. No Narrative Engine backend exists in the repo today.

**Document version:** 1.1 — updated with team decisions (June 2025)

---

## 1. Executive Summary

The Narrative Engine (NE) is **not** a meme generator, copywriter, or generic “explain my startup” chatbot. The team’s foundational product decision is:

> **Do not build NE as a Narrative Generator. Build it as a Communication Intelligence Diagnostic Engine.**

Most AI tools generate answers. NE **diagnoses first, then generates**. That diagnostic-first posture is the seed of the full **Creative Intelligence OS** — and later the **Memetic Engine** — where deeper proprietary layers (Pattern Library, Meme Metrics) live.

NE Beta is a **public preview** of a small slice of CI OS: four output cards from four founder inputs, with a Vercel-style “analyzing…” interaction screen. It is the low-friction entry point before the paid **Memetic Brand Workshop**.

The product philosophy chain:

```
Narrative → Expression → Participation → Adoption
```

And the emotional through-line:

> **Clarity is where it starts. Not where it ends.**

---

## 2. Brand Context & Creative Direction

### 2.1 Memetic Brand Labs positioning

MBL exists for founders building strong AI/Web3 products whose **technology is clear but the story is not**. The V12 homepage copy frames the problem precisely:

- *“THE PRODUCT WAS CLEAR. THE STORY WASN’T.”*
- *“FOR MANY FOUNDERS… THE NEXT STEP IS NOT MORE TECHNOLOGY. IT IS BEING UNDERSTOOD.”*

MBL delivers three outcomes:

| Outcome | Meaning |
|--------|---------|
| **Shared Language** | A simpler way to explain what you’re building |
| **Recognisable Narratives** | Stories people immediately recognise |
| **Memetic Potential** | Ideas people choose to remember and repeat |

### 2.2 How “memetic” is used (carefully)

The team explicitly rejects meme engineering and virality guarantees:

> *“We do not engineer memes. We do not guarantee virality.”*

> *“When we say ‘memetic’, we simply mean: Ideas people choose to remember and repeat.”*

The “Good Meme Story” philosophy (V12) clarifies the intent: recognition → understanding → participation. **Not virality. Understanding.**

### 2.3 Website & UX design direction

**Landing page (V12 — target state):** Hero → problem sections → workshop → **Try NE Beta** → philosophy → dual CTA (Workshop + NE).

**Narrative Engine Beta UX (PDF wireframe):**

1. **Input form** — four fields:
   - What are you building?
   - Who is it for?
   - What challenge are you solving?
   - Why is your approach different?
   - Optional: website URL (mentioned in V12)

2. **Interaction screen** — staged progress copy:
   - “Analyzing communication…”
   - “Detecting positioning gaps…”
   - “Generating narrative directions…”

3. **Output cards** — four fixed card types, text format:

| Card | Role |
|------|------|
| 🟩 Clear Explanation | Simpler product description anyone can grasp in ~5 seconds |
| 🟨 Positioning Direction | How the company could be framed; category placement |
| 🟫 Messaging Hook | Strongest single-sentence attention line (not 3 options) |
| 🟥 Memetic Narrative Angle | Communication direction people may recognise and engage with — **not** a meme |

4. **Post-result copy:** *“Not perfect, but a useful start.”* Workshop CTA for depth.

**Visual system (MBL frontend):** Anton + Urbanist + Reyhans type; purple/red/yellow/pink palette; bold, editorial, culture-forward layout. NE should feel like a **diagnostic dashboard**, not a chat window — aligned with the PDF’s “Vercel style Dashboard feel.”

**Note:** Current `frontend/` is an earlier landing iteration; NE UI is specified but not built. `llms.txt` still uses outdated “viral meme marketing” language — V12/docs are the authoritative voice.

### 2.4 The Crow Theory (TCT) — design reference only

TCT is a separate brand in this monorepo. Its design philosophy — *“A balance between discipline and expression”* — is useful as a **craft bar** (grid precision, motion restraint, dark editorial tone) but TCT has no NE product connection.

---

## 3. What the Narrative Engine Is

### 3.1 One-line definition

**A Communication Intelligence Diagnostic** that interprets a founder’s product description, scores communication gaps internally, applies proprietary patterns, and produces four structured narrative outputs.

### 3.2 What NE is NOT (V1 guardrails)

| Do NOT | Why |
|--------|-----|
| Generate memes or meme templates | Loses credibility instantly |
| Show virality / meme scores publicly | Reserved for CI OS premium (Meme Metrics) |
| Force “Uber for X” every time | Only when analogy genuinely clarifies |
| Use internet slang, random jokes, trend forcing | Undermines “diagnose, don’t gimmick” positioning |
| Behave like ChatGPT with a startup prompt | No differentiation |

### 3.3 MBL’s four differentiation axes

1. **Narrative structuring** — not just writing
2. **Context awareness** — Web3 / AI / startup communication patterns
3. **Multi-output system** — four angles, not one answer
4. **Cultural translation** — insider language → mainstream comprehension

### 3.4 The “secret prompt” (internal quality bar)

> *“Rewrite the startup description so a 12-year-old can understand it. If it passes that test, it spreads.”*

Master system role: *“You are a narrative compression engine for complex technology startups.”*

Principles: clarity over cleverness, simplicity over jargon, one core idea per sentence, memorable phrasing, analogies founders/investors recognise.

---

## 4. How the Team Is Thinking About It

### 4.1 Product ladder

```
Narrative Engine (Beta)     →  Memetic Brand Workshop  →  CI OS  →  Memetic Engine (future)
     public preview               human-led depth           full platform      broader activation
```

- **NE Beta:** Automated diagnostic + four cards. Free/low-friction. Proves the system works.
- **Workshop:** *“Walk in with a product. Walk out with a story.”* Outputs: Brand Direction, Brand Voice, Narrative & Content Playbook, Creative Directions.
- **CI OS:** Full Creative Intelligence OS in development. NE exposes *selected capabilities* only.
- **Memetic Engine (future, out of V1 scope):** Expansion into expression, participation, and adoption layers — creator activation, community engagement, communication reinforcement. Architecture must **not** hard-code NE-only assumptions.

### 4.2 Diagnose → Generate (core mental model)

The team treats **diagnosis as the moat**, generation as the deliverable:

```
User Input
    ↓
Interpretation (structured JSON, hidden)
    ↓
Communication Diagnostics (scores + findings, hidden)
    ↓
Pattern Library matching (proprietary, hidden)
    ↓
Translation + Positioning + Memetic Analysis (hidden layers)
    ↓
Four public cards
```

Internal diagnostic scores (0–100 on clarity, positioning, audience, differentiation, relevance) are **stored but never shown** in V1 — they fuel future learning and CI OS premium features.

### 4.3 Proprietary intelligence (the long-term asset)

Two hidden layers differentiate MBL from commodity LLM wrappers:

| Layer | V1 exposure | Future |
|-------|-------------|--------|
| **Pattern Library** | Lite subset for NE | Full culture graph, continuous ingestion |
| **Meme Metrics (MM)** | Lite subset in Layer 5 only | Full scoring in CI OS — **not revealed publicly now** |

Pattern Library V1 buckets:

- **Failure patterns** — too technical, no audience clarity, feature-first, insider language, category confusion
- **Success patterns** — Stripe, Notion, Figma, Linear, Vercel, Phantom, Coinbase, AWS (simplicity, framing, category ownership)
- **Human behaviour patterns** — share when it makes them look smart, signals identity, simplifies complexity, reinforces beliefs
- **Web3/AI cultural signals (light)** — builder culture, automation, ownership, speed, security, transparency

External sources for pattern updates (stored as **extracted patterns, not raw content**): X founder threads, Product Hunt, YC launches, Reddit (r/startups, r/web3), company homepages/taglines.

### 4.5 Pattern Library — how to build success & failure entries (recommended)

Three-phase approach: **seed → extract → learn**.

#### Phase A — Manual seed (launch, ~30–50 entries)

Team-authored entries in `pattern_entries` covering documented V1 buckets. Target split:

| Type | Count | Examples |
|------|-------|----------|
| `failure` | 15–20 | too_technical, feature-first, no audience, category confusion, insider language, abstraction overload |
| `success` | 10–15 | Stripe, Notion, Figma, Linear, Vercel, Phantom, Coinbase, AWS — each as positioning logic + simplicity pattern |
| `behaviour` | 5–8 | “look smart”, identity signal, simplify complexity, reinforce beliefs |
| `cultural_signal` | 5–8 | builder culture, automation, ownership, speed, security (Web3/AI light) |

**Entry JSON shape (store in `body` JSONB):**

```json
{
  "problem": "Too technical",
  "symptom": "Infra jargon, zk-rollup language in hero",
  "result": "Broader audience bounces; investors ask 'but what does it do?'",
  "fix": "Outcome-first messaging — lead with what changes for the user",
  "before_example": "Zero-knowledge liquidity abstraction layer",
  "after_example": "We help developers launch secure apps without managing infrastructure",
  "tags": ["web3", "infrastructure", "too_technical"],
  "markets": ["Web3"]
}
```

Owner: content/strategy (Prajesh) seeds; engineering loads via migration or admin API.

#### Phase B — Semi-automated extraction (post-launch)

Pipeline for **human-reviewed** ingestion — never auto-publish to prod:

```
Source URL (PH launch, YC page, homepage, Reddit thread)
    → Fetch public text only
    → LLM extraction prompt: "Distill into problem/symptom/fix pattern; no raw quotes >20 words"
    → Queue in pattern_review_queue (status: pending)
    → Human approves / edits / rejects
    → Published to pattern_entries with source metadata
```

**Success pattern extraction prompt logic:** Given company X, identify (1) category framing, (2) simplicity move, (3) emotional hook, (4) what they removed from messaging.

**Failure pattern extraction:** From confused PH listings, jargon-heavy homepages, or anonymized NE runs where `messaging_problem` repeats — cluster into new failure slugs.

#### Phase C — Learn from NE runs (continuous)

After email-gated runs accumulate:

- Aggregate anonymous `messaging_problem` + `market` + `category` frequencies
- Flag runs where diagnostics scores are extreme (very low clarity + high complexity)
- Monthly review: promote recurring founder mistakes into new `failure` patterns
- **Never** store identifiable company text in patterns without consent

#### Retrieval in pipeline

- **V1:** Tag match — filter `pattern_entries` by `market`, `category`, `messaging_problem` from L1
- **Phase 2:** pgvector semantic search on `body` embeddings; top-k patterns injected into L2 and L5 prompts

---

### 4.6 Output contract (stable API surface)

NE V1 should always return the same four card types. Internal schema can evolve; the **card contract** should not.

Example internal structured output (Layer 1):

```json
{
  "core_function": "zk-rollup scaling for Ethereum",
  "target_user": "developers",
  "primary_outcome": "faster and cheaper applications",
  "category": "infrastructure",
  "complexity_level": "high",
  "market": "Web3",
  "messaging_problem": "too_technical"
}
```

Example generation output (Layers 3–6):

```json
{
  "simple_explanation": "We help developers build faster and cheaper apps on Ethereum",
  "positioning": "Scaling infrastructure for Ethereum developers",
  "analogy": "AWS for Ethereum scalability",
  "messaging_hook": "Build more, pay less on Ethereum",
  "memetic_narrative_angle": "Shipping faster, with fewer blockers"
}
```

Controlled enums (extendable via config, not migrations):

- `messaging_problem`: `too_technical`, `too_vague`, `no_differentiation`, `unclear_audience`
- `category`: `infrastructure`, `platform`, `tool`, `application`, `service`
- `complexity_level`: `high`, `medium`, `low`
- `market`: `Web3`, `AI`, `SaaS`, `Fintech`, `Other`

---

## 5. The Six-Layer Processing Architecture

These are **logical pipeline stages**, not necessarily six separate microservices in V1.

| Layer | Name | Purpose | User visibility |
|-------|------|---------|-----------------|
| **L1** | Interpretation Engine | Extract core function, audience, outcome, category, complexity, differentiation, communication risk | Hidden JSON |
| **L2** | Communication Diagnostics | Score clarity/positioning/audience/differentiation/relevance; detect jargon, weak differentiation, insider language; match Pattern Library | Hidden scores + findings |
| **L3** | Narrative Translation Engine | Technical → human; outcome-first; everyday language | → Card 1: Clear Explanation |
| **L4** | Positioning Engine | Category placement; optional analogy when useful | → Card 2: Positioning Direction |
| **L5** | Memetic Analysis Engine | Familiarity, identity, contrast, shared truth, participation potential via Meme Metrics Lite | → Card 4: Memetic Narrative Angle |
| **L6** | Output Generation | Assemble final cards; pick single strongest hook | Cards 1–4 |

Layer 5 metrics (internal, lite): clarity, relatability, identity signal, analogy potential, simplicity, repeatability. **No meme scores. No virality scores in V1.**

Layer 6 also produces Card 3 (Messaging Hook) — max **one sentence**, strongest option only.

### 5.1 Meme Metrics — full framework vs NE Lite (derived from MM doc)

The backend doc defines two scoring layers. **NE exposes neither publicly** — scores are internal only.

#### Full Meme Metrics (CI OS / Memetic Engine — not in NE V1)

Reserved for premium CI OS V2. Do not expose in API responses or UI.

| Dimension group | Signals | Purpose |
|-----------------|---------|---------|
| **Communication diagnostics (L2)** | clarity, positioning, audience, differentiation, relevance | 0–100 each; founder messaging health |
| **Engagement potential** | familiarity, contrast, relatability, analogy potential, simplicity | Pre-memetic spread readiness |
| **Human relevance** | emotional relevance, practical outcome, identity connection | Outcome vs abstraction |
| **CI OS V2 (hidden)** | deep meme metrics, trend engine, culture graphs, meme scores, virality scores | Premium moat |

#### Meme Metrics Lite (NE Layer 5 only)

Derived subset from the full MM doc — six dimensions, 0–100 internal, weighted composite:

| Dimension | Weight | What it measures (from MM doc) |
|-----------|--------|--------------------------------|
| `clarity` | 20% | Understandable in ~5 seconds; low jargon |
| `relatability` | 20% | Audience already grasps the concept |
| `identity_signal` | 15% | Who would naturally relate (builder, founder, dev, etc.) |
| `analogy_potential` | 15% | Familiar comparison available without forcing “Uber for X” |
| `simplicity` | 15% | One core idea; passes “12-year-old” test |
| `repeatability` | 15% | Can community discuss or repeat the phrase |

**Layer 5 also evaluates (qualitative, feeds Card 4):**
- **Familiarity** — does the audience already understand the category?
- **Contrast** — is there productive tension vs status quo?
- **Shared truth** — does it express something people already believe?
- **Participation potential** — can people engage without insider knowledge?

**Composite score (internal):**  
`memetic_lite_score = Σ(dimension × weight)` — stored in `layer_outputs` for L5; never returned to client.

**Card 4 selection rule:** Highest-weighted qualitative signals + top `narrative_hooks` candidate; must not read as meme/slang (guardrails from MM doc).

---

## 6. Recommended System Architecture

### 6.1 High-level topology (decided)

```
┌─────────────────────────────────────────────────────────────────┐
│  MBL Frontend — Vercel (React/Vite)                               │
│  Landing + NE Beta UI · wallet connect for x402 reruns            │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│  Narrative Engine API — Render (Node or Python service)         │
│  - Email gate before first result                                 │
│  - x402 middleware on paid rerun endpoints (USDC on Base)         │
│  - Multi-model routing (user selects tier at run time)            │
│  - L1→L6 orchestrator · share asset generation                    │
└──────┬──────────────────┬──────────────────┬────────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐
│  Supabase    │  │  Blob store  │  │  LLM providers           │
│  Postgres    │  │  (share PNGs)│  │  OpenAI + Anthropic      │
│  + Auth      │  │              │  │  (configurable per run)  │
└──────────────┘  └──────────────┘  └──────────────────────────┘
       │
       ▼
┌──────────────┐
│  pgvector    │  ← Phase 2+: semantic Pattern Library retrieval
└──────────────┘
```

**Stack (V1):**
- **Frontend:** Vercel — MBL site + NE Beta UI (designs final; implementation coming soon)
- **Backend API:** Render — orchestrator, x402 verification, LLM calls, graphic export
- **Database:** Supabase Postgres — runs, patterns, prompts, users, payments audit
- **Payments:** x402 protocol — USDC on Base (`eip155:8453`), Coinbase facilitator

**Single source of truth:** All copy, prompts, enums, and layer logic from V8/V12/PDF/backend docs are merged into one backend config surface (`prompt_templates`, `schema_registry`, `enum_definitions`) — not scattered across frontend strings and multiple doc versions.

### 6.2 Design principles

1. **Pipeline-as-data** — every layer output is persisted as JSON with a schema version; reruns and A/B prompts are possible without code deploys.
2. **Config over code** — prompts, enums, pattern tags, and card definitions live in the database (or versioned config store), not hard-coded strings.
3. **Stable output contract** — four cards for NE; internal fields can grow via JSONB.
4. **Engine abstraction** — `EngineRun` is generic; `engine_type = 'narrative' | 'memetic' | ...` for future Memetic Engine without new infrastructure.
5. **No raw scraping storage in V1** — store distilled patterns and metadata only; respect source ToS and reduce legal/storage risk.
6. **Observability by default** — log prompt version, model, latency, token cost, and diagnostic scores per run for internal review.

### 6.3 Sync vs async

**V1 recommendation:** Async job with SSE or polling for the “Analyzing…” screen.

- POST `/api/narrative-runs` → returns `run_id`
- GET `/api/narrative-runs/:id/status` → `{ stage: "diagnostics", progress: 38 }`
- GET `/api/narrative-runs/:id/result` → four cards when complete (requires verified email)

This avoids HTTP timeouts on multi-layer LLM chains and maps cleanly to the staged UX copy.

### 6.4 Access, email gate & x402 payments (decided)

| Action | Requirement | Cost |
|--------|-------------|------|
| **First run** | Email verified before results are shown | Free (lead capture) |
| **Rerun** (same or edited inputs) | x402 USDC payment on Base + email on file | Per-run price (see §6.5) |
| **Rate limiting** | No arbitrary daily cap — pay-per-use unlocks reruns | — |

**Flow:**

1. User submits form (+ optional website URL, model tier).
2. Pipeline runs async; progress UI shows staged copy.
3. Before cards render, user verifies email (magic link or OTP via Supabase Auth).
4. Results displayed with share/download options.
5. “Run again” → frontend receives HTTP `402 Payment Required` with USDC amount → wallet signs → retry with `Payment` header → new run starts.

**x402 implementation (Render backend):**

- Use `@coinbase/x402-express` or `@x402/express` middleware on `POST /v1/narrative-runs/rerun`
- Network: Base mainnet (`eip155:8453`)
- Asset: USDC
- Facilitator: `https://x402.org/facilitator` (Coinbase CDP; 1,000 free settlements/month)
- Persist `payment_tx_hash`, `amount_usdc`, `payer_address` on `engine_runs` for audit

**Frontend (Vercel):** Wallet connect (e.g. Coinbase Wallet, Rainbow) + `fetchWithPayment` pattern to auto-settle 402 and retry.

### 6.5 Pricing model — cost analysis & 5× markup (decided)

Policy: **charge users 5× fully-loaded effective cost** per paid rerun. Revisit quarterly as model prices change.

#### Estimated cost per run (6 LLM calls)

Token budget (all layers, incl. pattern context):

| | Input tokens | Output tokens |
|---|-------------|---------------|
| Per run (typical) | ~17,000 | ~2,700 |
| + website extract (optional) | +1,500 | +200 |

Fixed overhead per run: ~$0.002 (Render compute, Supabase writes, x402 facilitator after free tier).

#### Model tiers (user selects at run time)

| Tier | Models used | Est. COGS/run | **User price (5×)** |
|------|-------------|---------------|---------------------|
| **Fast** | GPT-4o-mini all layers | ~$0.006 | **$0.05 USDC** |
| **Standard** | Mini for L1/L2/L6; GPT-4o for L3–L5 | ~$0.04 | **$0.20 USDC** |
| **Quality** | GPT-4o or Claude Sonnet all layers | ~$0.08 | **$0.40 USDC** |

COGS math (Standard example):  
`(10K × $0.15 + 7K × $2.50) / 1M` input + `(1.5K × $0.60 + 1.2K × $10) / 1M` output ≈ $0.035 + overhead ≈ **$0.04**.

Prices stored in `pricing_tiers` table (not hard-coded) so markup multiplier and model mappings can be adjusted without deploy.

**Note:** First run is free after email — COGS absorbed as acquisition cost (~$0.004–$0.08 depending on tier; default first run uses **Fast** tier unless user upgrades before submit).

### 6.6 Multi-model selection (decided)

User picks a tier on the run form. Backend resolves to concrete models via `model_routing` config:

```json
{
  "tier": "standard",
  "layers": {
    "interpretation": "gpt-4o-mini",
    "diagnostics": "gpt-4o-mini",
    "translation": "gpt-4o",
    "positioning": "gpt-4o",
    "memetic_analysis": "gpt-4o",
    "output_generation": "gpt-4o-mini"
  }
}
```

Store `model` per `layer_outputs` row for cost attribution and quality analysis. Admin can add tiers (e.g. Claude-only) without schema changes.

### 6.7 Website URL field — what “crawling” means

Optional input: **Your Website** (from V12).

**What it is:** The backend fetches the company’s **public homepage** (single page in V1), extracts structured signals, and feeds them into L1/L2 alongside the form.

**What we extract (not a full site crawl):**
- `<title>`, meta description, Open Graph tags
- Visible H1/H2 headlines and hero tagline
- Primary CTA text
- Obvious jargon density vs form answers

**What it enables:**
- Compare *how founders describe themselves in the form* vs *how their site currently reads*
- Flag mismatches (e.g. form says “for developers” but homepage says “for everyone”)
- Enrich interpretation with real positioning language

**What it is NOT:**
- Full-site spider across dozens of pages
- Storing raw HTML long-term (extract → structured JSON → discard page)
- Scraping login-gated or app-only content

**V1 scope:** Single-page fetch via HTTP GET or lightweight scrape API; timeout 10s; fail open (run proceeds without website context if URL unreachable).

### 6.8 Share & export (decided)

Results are shareable in two ways:

1. **Social share** — public read-only URL (`/results/:share_id`) with OG meta tags (title, description, preview image) for X/LinkedIn
2. **Downloadable graphic** — server-rendered PNG (1080×1080 or 1200×630) of the four cards in MBL brand layout; generated on completion, stored in blob storage, linked from result page

`run_outputs` gains `share_id` (uuid, unguessable) and `graphic_url`. User can revoke public share from account settings (future).

---

## 7. Database Design — Scalable & Dynamic

### 7.1 Why Postgres + JSONB (not a rigid relational-only schema)

NE outputs are **semi-structured and evolving**:

- New diagnostic dimensions will be added (Meme Metrics expansion)
- Pattern Library fields will grow (tags, embeddings, source provenance)
- Memetic Engine will add new layer types and card types
- Prompt templates reference dynamic variables (`{{product_description}}`, future vars)

**JSONB columns** give schema flexibility; **typed core columns** give query performance and integrity where it matters.

For very high-volume pattern ingestion later, consider **dual storage**: Postgres as source of truth + vector index (pgvector) for retrieval. Avoid jumping to a separate document DB in V1 unless pattern volume exceeds Postgres comfort (~millions of pattern documents).

### 7.2 Core entity model

```
┌─────────────────┐       ┌──────────────────┐
│  engine_runs    │──────<│  layer_outputs   │
│  (all engines)  │       │  (L1–L6 JSONB)   │
└────────┬────────┘       └──────────────────┘
         │
         │              ┌──────────────────┐
         ├─────────────<│  run_outputs     │
         │              │  (public cards)  │
         │              └──────────────────┘
         │
┌────────▼────────┐       ┌──────────────────┐
│  run_inputs     │       │  prompt_templates│
│  (JSONB)        │       │  (versioned)     │
└─────────────────┘       └──────────────────┘

┌─────────────────┐       ┌──────────────────┐
│  pattern_entries│──────<│  pattern_tags    │
│  (JSONB body)   │       │  (many-to-many)  │
└─────────────────┘       └──────────────────┘

┌─────────────────┐       ┌──────────────────┐
│  schema_registry│       │  enum_definitions│
│  (JSON Schema)  │       │  (dynamic enums) │
└─────────────────┘       └──────────────────┘
```

### 7.3 Table sketches

#### `engine_runs`

Generic run container — **shared by NE and future Memetic Engine**.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `engine_type` | text | `'narrative'`, later `'memetic'`, `'expression'`, etc. |
| `engine_version` | text | e.g. `'ne-v1.0.0'` |
| `status` | enum | `pending`, `running`, `completed`, `failed` |
| `current_stage` | text | For UX progress mapping |
| `progress_pct` | int | 0–100 |
| `user_id` | uuid FK | Supabase Auth — required after email verification |
| `email` | text | Captured at gate; links runs to user |
| `is_first_run` | bool | Free run flag |
| `payment_status` | text | `free`, `paid`, `pending` |
| `payment_tx_hash` | text nullable | Base USDC tx for paid reruns |
| `amount_usdc` | numeric nullable | Charged amount |
| `model_tier` | text | `fast`, `standard`, `quality` |
| `session_id` | text | Browser session before auth |
| `metadata` | jsonb | `{ "source": "beta", "referrer": "..." }` |
| `created_at` | timestamptz | |
| `completed_at` | timestamptz | |

Index: `(engine_type, created_at)`, `(session_id, created_at)`.

#### `run_inputs`

| Column | Type | Notes |
|--------|------|-------|
| `run_id` | uuid FK | |
| `inputs` | jsonb | NE V1: `{ building, audience, challenge, differentiation, website? }` |
| `input_schema_version` | text | e.g. `'ne-input-v1'` |

**Dynamic variables:** New form fields = new keys in `inputs` + new `input_schema_version`. Old runs remain valid. Validation uses `schema_registry`.

#### `layer_outputs`

One row per pipeline stage execution.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `run_id` | uuid FK | |
| `layer_key` | text | `'interpretation'`, `'diagnostics'`, `'translation'`, etc. |
| `layer_version` | text | Prompt/schema version used |
| `output` | jsonb | Full layer JSON |
| `model` | text | e.g. `gpt-4.1` |
| `prompt_template_id` | uuid FK | Traceability |
| `latency_ms` | int | |
| `token_usage` | jsonb | `{ prompt, completion }` |
| `created_at` | timestamptz | |

Index: `(run_id, layer_key)`.

**Scalability:** Partition by `created_at` monthly when volume grows. JSONB GIN index on hot keys only (e.g. `output->>'messaging_problem'`) — avoid indexing entire JSONB.

#### `run_outputs`

Public-facing results (denormalised for fast reads).

| Column | Type | Notes |
|--------|------|-------|
| `run_id` | uuid FK | |
| `card_key` | text | `'clear_explanation'`, `'positioning'`, `'messaging_hook'`, `'memetic_angle'` |
| `card_label` | text | Display name |
| `content` | text | Card body |
| `card_meta` | jsonb | Color, order, optional analogy flag |
| `output_schema_version` | text | |

Unique: `(run_id, card_key)`.

#### `prompt_templates`

Versioned, editable without deploy.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `engine_type` | text | |
| `layer_key` | text | |
| `version` | text | Semver |
| `system_prompt` | text | |
| `user_prompt_template` | text | With `{{variable}}` placeholders |
| `variables` | jsonb | `[{ "name": "product_description", "source": "inputs.building" }]` |
| `output_schema_ref` | text | Points to `schema_registry` |
| `is_active` | bool | One active per engine+layer |
| `created_at` | timestamptz | |

**Dynamic variables pattern:** The orchestrator resolves `variables` at runtime from `run_inputs`, prior `layer_outputs`, and matched `pattern_entries`. Adding a variable = DB row change + schema_registry update, not a code change.

#### `pattern_entries`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `pattern_type` | text | `failure`, `success`, `behaviour`, `cultural_signal` |
| `slug` | text unique | e.g. `failure-too-technical` |
| `title` | text | |
| `body` | jsonb | `{ "problem", "symptom", "result", "fix", "examples": [] }` |
| `markets` | text[] | `{Web3, AI}` |
| `categories` | text[] | |
| `tags` | text[] | Denormalised for fast filter |
| `embedding` | vector(1536) nullable | Phase 2 retrieval |
| `source` | jsonb | `{ "type": "manual", "refs": [] }` — not raw scraped text |
| `version` | int | |
| `is_active` | bool | |
| `created_at` | timestamptz | |

Index: GIN on `tags`, `markets`; IVFFlat/HNSW on `embedding` when enabled.

#### `schema_registry`

Central place for JSON Schema definitions — validates layer outputs and enables dynamic field addition.

| Column | Type | Notes |
|--------|------|-------|
| `schema_key` | text PK | e.g. `ne.interpretation.v1` |
| `json_schema` | jsonb | Full JSON Schema |
| `compatible_engines` | text[] | |
| `created_at` | timestamptz | |

#### `enum_definitions`

Avoid Postgres ENUM migrations for product enums.

| Column | Type | Notes |
|--------|------|-------|
| `enum_key` | text | e.g. `messaging_problem` |
| `values` | jsonb | `[{ "key": "too_technical", "label": "...", "active": true }]` |
| `engine_scope` | text[] | Which engines use this enum |

Orchestrator and admin UI read enums at runtime. New value = insert row, no DDL.

#### `brand_profiles` (V1 stub — decided)

Prepares for Memetic Engine without building it yet.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK | Owner |
| `company_name` | text | |
| `website` | text nullable | |
| `default_inputs` | jsonb | Last-used form values |
| `voice_notes` | jsonb | `{}` — workshop/ME fields later |
| `created_at` | timestamptz | |

`engine_runs.brand_profile_id` nullable FK — links reruns to a persistent brand context.

#### `users` / auth

Handled by **Supabase Auth** — email magic link or OTP. `users` table extended with `first_run_used_at`, `wallet_address` (optional, for x402 payer matching).

#### `pricing_tiers`

| Column | Type | Notes |
|--------|------|-------|
| `tier_key` | text PK | `fast`, `standard`, `quality` |
| `label` | text | Display name |
| `price_usdc` | numeric | User-facing price |
| `markup_multiplier` | numeric | Default `5.0` |
| `model_routing` | jsonb | Per-layer model map |
| `is_active` | bool | |

#### `diagnostic_scores` (optional normalised table)

If analytics queries on scores become heavy, extract from Layer 2 JSONB:

| Column | Type |
|--------|------|
| `run_id` | uuid FK |
| `dimension` | text (`clarity`, `positioning`, …) |
| `score` | smallint 0–100 |
| `findings` | jsonb |

### 7.4 Dynamic variable resolution flow

```
1. Load active prompt_template for (engine_type, layer_key)
2. Read `variables` array from template
3. For each variable:
   - source: inputs.*        → run_inputs.inputs
   - source: layer.*         → prior layer_outputs.output
   - source: patterns.*      → retrieved pattern_entries (tag/market match or vector search)
   - source: config.*        → enum_definitions / static config
4. Validate assembled prompt inputs against schema_registry
5. Call LLM with structured output schema
6. Validate response JSON against output schema
7. Persist to layer_outputs
```

This is how you add fields like `competitor_context` or `website_extract` later without rewriting the orchestrator — only new variable definitions and schemas.

### 7.6 Data retention & privacy (decided)

- Store runs, inputs, and layer outputs indefinitely for product learning unless user requests deletion
- **Delete on request:** GDPR-style endpoint `DELETE /v1/me/runs` or per-run delete; cascades inputs/outputs, revokes share links
- Encrypt Supabase at rest (default); do not log full prompts in application logs
- PII in founder inputs treated as confidential — admin access role-gated

### 7.7 Scalability notes

| Concern | Approach |
|---------|----------|
| **Data volume (runs)** | Time-based partitioning on `engine_runs`; archive runs older than N months to cold storage |
| **Data volume (patterns)** | pgvector + tag filtering; batch embedding jobs; dedupe by `slug` |
| **Variable/schema evolution** | `*_schema_version` on every record; orchestrator supports N versions concurrently |
| **Read load** | Cache active prompt_templates + enum_definitions in Redis/edge cache (TTL 60s) |
| **Write load** | Async pipeline workers; single run = ~6 LLM calls — queue depth limits concurrent cost |
| **Multi-tenant future** | Add `org_id` to `engine_runs` and `pattern_entries`; RLS in Supabase |
| **Memetic Engine reuse** | Same tables, different `engine_type`, `layer_key` set, and `run_outputs.card_key` catalog |

### 7.8 What NOT to store

- Raw X/Reddit/PH page content at scale (legal + noise)
- Full LLM prompts in public APIs (internal only)
- Meme Metrics full scores in client responses (V1)

---

## 8. Future Path: Narrative Engine → Memetic Engine → CI OS

Design today so tomorrow’s expansion is **configuration + new layers**, not a rewrite.

### 8.1 Engine layering model (future)

```
┌─────────────────────────────────────────────────────────────┐
│  CI OS Platform                                             │
├─────────────────────────────────────────────────────────────┤
│  Memetic Engine (future)                                    │
│  - Expression formats (posts, campaigns, visual briefs)     │
│  - Participation mechanics                                  │
│  - Community / creator activation                         │
│  - Full Meme Metrics                                        │
├─────────────────────────────────────────────────────────────┤
│  Narrative Engine (V1 — current scope)                      │
│  - Interpretation + Diagnostics + 4 cards                   │
│  - Pattern Library Lite + Meme Metrics Lite                 │
├─────────────────────────────────────────────────────────────┤
│  Shared Infrastructure                                      │
│  - engine_runs, layer_outputs, pattern_entries            │
│  - prompt_templates, schema_registry, enum_definitions      │
│  - orchestrator, auth, observability                        │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Shared vs engine-specific

| Shared | Engine-specific |
|--------|-----------------|
| Run lifecycle, auth, rate limits | Layer pipeline definition |
| Pattern Library storage & retrieval | Card/output catalog |
| Prompt template system | Default prompts |
| Schema registry | JSON schemas per engine |
| Diagnostic scoring framework | Which dimensions are scored |
| Observability | UX (NE = 4 cards; Memetic = TBD) |

### 8.3 CI OS premium boundary (protect the moat)

Keep in CI OS / Memetic Engine, not NE Beta public surface:

- Full Meme Metrics scores
- Deep culture graphs
- Virality/participation forecasting
- Campaign generation at scale
- Creator activation workflows

NE Beta **teases** the memetic angle (Card 4) without exposing the scoring machinery — aligned with footer copy: *“CI OS is currently in development. NE Beta provides an early preview of selected capabilities.”*

---

## 9. Implementation Phases

### Phase 0 — Foundation (now)

- [ ] Supabase schema (tables in §7 + `brand_profiles`, `pricing_tiers`)
- [ ] Render API service scaffold + Vercel frontend env wiring
- [ ] Unified config seed from merged docs → `prompt_templates`, `schema_registry`, `enum_definitions`
- [ ] Seed Pattern Library V1 (~30–50 entries per §4.5)
- [ ] Orchestrator: L1→L6 with Meme Metrics Lite scoring (§5.1)
- [ ] Email gate (Supabase Auth) before result release
- [ ] x402 middleware on rerun endpoint (USDC Base)
- [ ] Multi-model tier routing
- [ ] Share URL + PNG graphic generation
- [ ] NE Beta UI (designs ready — implementation coming soon)

### Phase 1 — NE Beta launch

- [ ] `pricing_tiers` admin + COGS tracking per run
- [ ] Internal admin: runs, diagnostic scores, prompt version
- [ ] Analytics: completion rate, `messaging_problem` distribution, tier usage
- [ ] Workshop funnel (NE → application form)
- [ ] Delete-on-request endpoint

### Phase 2 — Intelligence layer

- [ ] pgvector on `pattern_entries`; semantic retrieval in L2/L5
- [ ] Pattern ingestion pipeline (human-reviewed, not auto-scrape-to-prod)
- [ ] A/B prompt versions with run attribution
- [ ] Website URL fetch + extract (optional 5th input) for richer L1

### Phase 3 — Memetic Engine (future)

- [ ] New `engine_type`, layers, output types
- [ ] Full Meme Metrics integration
- [ ] Org accounts, saved runs, brand profiles
- [ ] CI OS dashboard

---

## 10. Team Decisions Log (resolved)

| # | Question | Decision |
|---|----------|----------|
| 1 | Authentication | **Email required before results** (Supabase Auth magic link/OTP) |
| 2 | Rate limits | **Pay-per-use** — reruns require x402 USDC on Base; no arbitrary daily cap if paid |
| 3 | Pricing | **5× fully-loaded COGS** — see §6.5 ($0.05 / $0.20 / $0.40 USDC by tier) |
| 4 | Website URL | **Optional single-page extract** in V1 — see §6.7 |
| 5 | Share flow | **Social OG share URL + downloadable PNG graphic** |
| 6 | Pattern Library | **Seed → extract → learn** — see §4.5 |
| 7 | Meme Metrics Lite | **Derived from full MM doc** — see §5.1 |
| 8 | LLM provider | **Multi-model; user selects tier at run time** — see §6.6 |
| 9 | Hosting | **Render (API) + Vercel (frontend) + Supabase (DB)** |
| 10 | Data retention | **Retain for learning; delete on user request** |
| 11 | Brand profiles | **`brand_profiles` stub table in V1** |
| 12 | Design / homepage | **Designs final (coming soon); V8/V12/PDF/backend docs merged into single backend config source** — not separate products |

### Remaining open items

- Default model tier for free first run (recommend **Fast**)
- Wallet connect library choice (Coinbase Wallet SDK vs RainbowKit)
- Share graphic template dimensions (1080×1080 vs 1200×630 OG)
- Human review queue for flagged beta runs (optional Phase 1)

---

## 11. Appendix — NE V1 API Sketch

```
POST   /v1/narrative-runs
       Body: { building, audience, challenge, differentiation, website?, model_tier }
       → 201 { run_id, status: "pending" }
       Note: first run per email is free; subsequent calls return 402 unless payment header present

POST   /v1/narrative-runs/rerun          [x402 protected]
       Body: { prior_run_id?, ...inputs, model_tier }
       → 402 { payment requirements } OR 201 { run_id }

POST   /v1/narrative-runs/:id/verify-email
       Body: { email } → sends magic link / OTP

GET    /v1/narrative-runs/:id
       → { status, current_stage, progress_pct }
       Requires: verified email to include outputs

GET    /v1/narrative-runs/:id/outputs
       → { cards: [...], share_url, graphic_url }

GET    /v1/results/:share_id             [public]
       → OG-friendly result page payload

GET    /v1/results/:share_id/graphic.png [public]
       → downloadable PNG

DELETE /v1/me/runs/:id                   [authenticated]
       → delete run + revoke share
```

Internal/admin only:

```
GET    /v1/admin/runs/:id/layers
       → full layer_outputs including diagnostics + memetic_lite_score

GET    /v1/admin/patterns
POST   /v1/admin/patterns
PATCH  /v1/admin/prompt-templates/:id/activate
GET    /v1/admin/pattern-review-queue
POST   /v1/admin/pattern-review-queue/:id/approve
```

---

## 12. Summary

The Narrative Engine is MBL’s **diagnostic-first** entry into Creative Intelligence — a system that understands a startup before it writes, scores communication gaps invisibly, applies a proprietary Pattern Library, and returns four clear, repeatable narrative outputs. The team’s thinking prioritises **understanding over virality**, **structure over single-shot generation**, and **proprietary intelligence over prompt wrapping**.

Architecturally, build a **generic engine run pipeline** on Postgres with JSONB for evolving layer data, versioned prompts with dynamic variable resolution, and a curated Pattern Library — not a brittle schema tied to four form fields. Keep Meme Metrics and full culture intelligence behind CI OS, but design tables, enums, and orchestration so the **Memetic Engine** extends the same foundation rather than replacing it.

---

*Document version: 1.1 — June 2025*
*Authors: Architecture synthesis from MBL planning docs + team decisions*
