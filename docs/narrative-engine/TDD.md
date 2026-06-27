# Narrative Engine — Technical Design Document

## Stack

- **API:** Node 20, Fastify, TypeScript (Render)
- **Queue:** BullMQ + Redis (inline fallback without Redis)
- **DB:** Supabase Postgres
- **LLM:** OpenAI + Anthropic via `LLMRouter`
- **Graphics:** sharp (SVG→PNG)

## Module map

```
src/
  index.ts              # HTTP server
  jobs/queue.ts         # BullMQ + inline processor
  orchestrator/         # PipelineOrchestrator, VariableResolver, SchemaValidator
  telemetry/            # TelemetryService, CostCalculator
  llm/LLMRouter.ts
  patterns/PatternRetriever.ts
  website/HomepageExtractor.ts
  share/ShareService.ts, GraphicRenderer.ts
  services/RunService.ts, OutputGuardrailService.ts
  routes/index.ts
```

## Error handling

- Pipeline failure → `engine_runs.status=failed`, `failure_code` set
- Telemetry fail-open (never blocks pipeline)
- Public errors: `{ error: { code, message, retryable } }`

## Job queue

- Queue: `narrative-pipeline`
- Without `REDIS_URL`: processes inline on POST (dev)
- With Redis: separate worker process

## Security

- RLS on user-owned tables
- Admin: `X-Admin-Key` or JWT role
- SSRF protection on website fetch
- No prompts in application logs

See [database-spec.md](./database-spec.md) for persistence design.
