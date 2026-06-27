# Narrative Engine — Test Plan

## Unit

- SchemaValidator, VariableResolver, OutputGuardrailService, CostCalculator
- Run: `cd narrative-engine-api && npm test`

## Integration

- Golden run fixture with mocked LLM → assert all telemetry tables populated
- x402 402 response shape
- Website extract SSRF block

## Contract

- Public endpoints never return `diagnostic_scores`, `memetic_lite`, layer prompts
- OpenAPI matches routes

## E2E (staging)

1. Submit form → poll → verify email → see 4 cards
2. Share URL loads
3. Rerun 402 → pay → new run

## Security

- RLS bypass attempts
- Admin routes without key

## Prompt regression

10 golden inputs; snapshot card `content_hash` on prompt changes.
