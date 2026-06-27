# Meme Metrics Lite (Layer 5)

Internal only — never exposed via public API.

## Dimensions & weights

| Dimension | Weight |
|-----------|--------|
| clarity | 0.20 |
| relatability | 0.20 |
| identity_signal | 0.15 |
| analogy_potential | 0.15 |
| simplicity | 0.15 |
| repeatability | 0.15 |

**Composite:** `memetic_lite_score = Σ(score × weight)`

## Storage

- JSON in `layer_outputs.output.memetic_lite`
- Normalized rows in `memetic_lite_scores`

## Qualitative signals (feeds Card 4)

- familiarity, contrast, shared_truth, participation_potential

## Guardrails

No meme slang, no virality claims in generated Card 4 text.
