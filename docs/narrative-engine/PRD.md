# Narrative Engine — Product Requirements Document

**Version:** 1.0 | **Status:** V1 Beta

## Summary

Communication Intelligence Diagnostic for Web3/AI founders. Six-layer pipeline → four cards. Email-gated first run; $10 USDC x402 reruns on Base.

## User stories

| ID | As a… | I want to… | So that… |
|----|-------|------------|----------|
| US-1 | Founder | Submit my product story | I get clearer narrative angles |
| US-2 | Founder | Verify email before results | MBL can follow up; I unlock cards |
| US-3 | Founder | Pay to rerun | I can iterate after editing inputs |
| US-4 | Founder | Share results | My community sees the narrative direction |
| US-5 | Admin | View full run audit | I can tune prompts and patterns |

## Acceptance criteria (V1)

- [ ] Four cards returned on successful run
- [ ] No diagnostic scores in public API
- [ ] Full telemetry in database per `database-spec.md`
- [ ] Email required before outputs
- [ ] Rerun returns 402 without payment header
- [ ] Share URL + PNG download work

## Out of scope

Meme generator, virality scores, Memetic Engine, pgvector retrieval (V2).

## Reference

[Architecture & Vision](../../ADPR-MBL%20Docs/Narrative_Engine_Architecture_and_Vision.md)
