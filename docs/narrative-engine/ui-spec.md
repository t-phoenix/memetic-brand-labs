# Narrative Engine — UI Specification

Design tokens: `frontend/src/index.css` (Anton, Urbanist, purple/peach palette).

**Integration guide:** [frontend-integration.md](./frontend-integration.md)

## Routes (implemented)

| Route | Component | States |
|-------|-----------|--------|
| `/narrative-engine` | NarrativeEnginePage | form, tier selector |
| `/narrative-engine/run/:id` | NarrativeRunPage | progress → email → cards |
| `/results/:shareId` | SharedResultPage | public cards + OG |

## NE form fields

- building, audience, challenge, differentiation
- website (optional)
- model_tier: fast | standard | quality

## Progress copy

1. Analyzing communication…
2. Detecting positioning gaps…
3. Generating narrative directions…

## Cards (fixed)

| Key | Color | Label |
|-----|-------|-------|
| clear_explanation | green | Clear Explanation |
| positioning | yellow | Positioning Direction |
| messaging_hook | brown | Messaging Hook |
| memetic_angle | red | Memetic Narrative Angle |

## API client

See [frontend-integration.md](./frontend-integration.md).

## Design tokens

Use `frontend/src/index.css` — Anton, Urbanist, purple/red/yellow/pink palette.
