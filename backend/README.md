# @techtide/backend

Fastify API server and orchestration gateway for TechTideAI.

## Architecture

The backend follows Domain-Driven Design (DDD) with clear layer separation:

```
src/
├── config/         Environment validation (Zod)
├── domain/         Pure types, entities, exceptions, policies
│   ├── entities/   Run, Knowledge
│   ├── exceptions/ AppError hierarchy (→ HTTP status mapping)
│   └── policies/   Status transition state machine
├── repositories/   Supabase persistence (snake_case ↔ camelCase mapping)
├── services/       Business logic and orchestration
├── routes/         HTTP route handlers (Fastify)
├── plugins/        Fastify plugins (auth, etc.)
└── utils/          Shared utilities
```

## Key Patterns

- **Factory functions, not classes** — Services and repositories are created via factory functions (`createRunService`, `createRunRepository`) that take dependencies as args and return an interface.
- **Domain error hierarchy** — Custom errors extend `AppError`. Route handlers map them to HTTP codes (`AgentNotFoundError` → 404, `InvalidStatusTransitionError` → 409, `InfrastructureError` → 503).
- **Status transitions** — `RunStatusTransitionPolicy` defines the state machine (`pending → running → completed|failed|cancelled`). Use `defaultPolicy` singleton.
- **Async agent execution** — `POST /api/agents/:id/run` returns 202 immediately. Execution happens asynchronously. Frontend polls `GET /api/runs/:id` until terminal status.

## Commands

```bash
pnpm dev            # Start dev server on :4050 (tsx watch)
pnpm build          # Compile TypeScript
pnpm lint           # ESLint
pnpm test           # Run Vitest suite
```

## Environment

Copy `backend/.env.example` to `backend/.env`. Configuration is validated at startup via Zod in `src/config/env.ts`.

Key variables: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DEFAULT_LLM_PROVIDER`, `API_KEY`, `DEFAULT_ORG_ID`.

## Testing

Integration tests use Fastify's `app.inject()` for HTTP-level testing without starting a real server:

```ts
const app = buildServer();
const res = await app.inject({ method: "GET", url: "/api/health" });
expect(res.statusCode).toBe(200);
await app.close();
```

See `src/routes/health.test.ts` for the canonical test pattern.
