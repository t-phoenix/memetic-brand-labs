# Pattern Library — Roadmap (TODO)

**Status:** Disabled in production (`PATTERN_LIBRARY_ENABLED=false`). Layer outputs are **not** overridden by pattern retrieval.

## Current state (v1)

- Pattern DB injection removed from L2–L5 user prompts.
- Messaging heuristics (failure/success patterns) are embedded in layer **system prompts** so the LLM reasons without DB lookups.
- `pattern_matches` table and `GET /v1/admin/patterns` remain for future use only.

## Planned (do not implement until design review)

1. **Compare-only field** — Add optional `pattern_comparison` metadata per run (admin-only), showing which curated patterns *would* match, without changing LLM layer outputs.
2. **Semantic retrieval** — pgvector on `pattern_entries.body` for L2/L5 suggestion (still compare-only at first).
3. **Extract pipeline** — Curate patterns from public sources (founder threads, PH, YC, homepages) into `pattern_entries`; never store raw scrapes.
4. **Review queue** — User-submitted excellent brands go to `pattern_review_queue`; human approval before seeding.
5. **Re-enable injection** — Only after compare-only mode is validated; injection must never override validated `layer_outputs`.

## Non-goals

- Auto-promoting user runs into the pattern library without review.
- Replacing LLM-generated cards or layer JSON with pattern text.
