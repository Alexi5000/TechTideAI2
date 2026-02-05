# Copilot Instructions — TechTideAI

## Architecture

pnpm monorepo with four TS workspaces (`frontend`, `backend`, `apis`, `agents`) and one Python sub-package (`agents/python`). Node ≥ 20, TypeScript strict mode, ESM everywhere (use `.js` extensions in TS imports).

- **`agents/`** — Agent catalog, Mastra runtime, Claude SDK loader, tool implementations. Published as `@techtide/agents`. The 15-agent hierarchy (CEO → 9 orchestrators → 5 workers) is defined statically in `agents/src/core/registry.ts`, not in the database. Agent IDs follow `{tier}-{name}` convention (`ceo-chief`, `orch-strategy`, `worker-research`).
- **`apis/`** — Provider-agnostic LLM adapters (`@techtide/apis`). OpenAI uses the **Responses API** (`client.responses.create`), not Chat Completions. Anthropic uses Messages API.
- **`backend/`** — Fastify API with DDD layers: `domain/` (pure types, exceptions, policies) → `repositories/` (Supabase persistence) → `services/` (orchestration) → `routes/` (HTTP). The domain layer must never import infrastructure code.
- **`frontend/`** — React 18 + Vite + Tailwind v4 + React Router v6. Uses CSS variables for theming (`--bg`, `--ink`, `--accent`, etc.) and `class-variance-authority` (cva) for component variants. Path alias `@/` → `src/`.
- **`database/`** — Supabase config, RLS-enforced migrations, seed data. All tables use `org_id` for multi-tenancy; RLS checks `is_org_member()`.

## Key Patterns

**Factory functions, not classes** — Services, repositories, and runtimes are created via factory functions (`createRunService`, `createRunRepository`, `createMastraRuntime`). Each takes dependencies as args and returns an interface. No DI container.

**Domain error hierarchy** — Custom errors extend `AppError` in `backend/src/domain/exceptions/`. Route handlers map them to HTTP codes (`AgentNotFoundError` → 404, `InvalidStatusTransitionError` → 409, `InfrastructureError` → 503). Always throw domain errors, never raw `Error`.

**Status transitions are policy-governed** — `RunStatusTransitionPolicy` in `backend/src/domain/policies/` defines the state machine for run statuses (`pending → running → completed|failed|cancelled`). Use `defaultPolicy` singleton; extend via `withTransitions()`, never mutate.

**Agent execution is async** — `POST /api/agents/:id/run` returns 202 immediately. Backend fires execution via `void runService.execute()`. Frontend polls `GET /api/runs/:id` every 2 seconds until terminal status. Mastra runtime has a 30-second timeout.

**AgentRuntime strategy** — `agents/src/runtime/types.ts` defines the `AgentRuntime` interface. `MastraRuntime` is the current implementation; LangGraph (Python) is a future alternative. Always code against the interface.

**snake_case ↔ camelCase boundary** — `repositories/run-repository.ts` has `toRow`/`fromRow` mappers. DB columns are snake_case; TS properties are camelCase. Keep this mapping isolated in the repository layer.

## Dev Workflow

```
pnpm install                  # install all workspaces
pnpm -C backend dev           # backend on :4000 (tsx watch)
pnpm -C frontend dev          # frontend on :5180 (vite)
pnpm -C agents dev            # Mastra dev server
pnpm -r test                  # run all Vitest suites
pnpm -r lint                  # ESLint across all packages
```

Python agents (separate environment):
```
cd agents/python
python -m venv .venv && .venv\Scripts\Activate.ps1
pip install -e .[dev]
pytest                        # run Python tests
```

Backend tests use Fastify's `app.inject()` for HTTP-level testing without starting a real server — see `backend/src/routes/health.test.ts` for the pattern.

## Conventions

- **Files**: kebab-case (`agent-execution-service.ts`). **Interfaces**: `I` prefix (`IRunService`, `IRunRepository`). **Errors**: `Error` suffix (`AgentNotFoundError`).
- **Validation**: Zod schemas for env config (`backend/src/config/env.ts`), route params/bodies, and Mastra tool I/O. Use `z.object()` with `.transform()` for optional fields.
- **Barrel exports**: Every package and sub-module has an `index.ts` re-exporting its public API. Use `export type` for type-only exports.
- **Agent/tool docs**: Agent behavioral specs live in `agents/agents.md`; skills in `agents/skills/*.md`; tool specs in `agents/tools/*.md`. Update these when changing agent capabilities.
- **Frontend hooks**: Follow the pattern in `hooks/use-agents.ts` — `useState` + `useEffect` with a `cancelled` flag for cleanup, `refetch` via counter increment. Polling hooks use `setTimeout` chains with cleanup.
- **Frontend types are duplicated** from backend in `frontend/src/lib/api-client.ts` — keep both in sync when changing API shapes.

## Testing

- **TS**: Vitest in all packages. Config per-package (`vitest.config.ts`).
- **Python**: Pytest + Ruff (rules: E, F, I, UP, B). Config in `agents/python/pyproject.toml`.
- Backend integration tests: build server via `buildServer()`, call `app.inject({ method, url })`, assert on `statusCode` and parsed JSON. Always call `app.close()` in cleanup.

## Environment

Backend env validated by Zod in `backend/src/config/env.ts`. Key vars: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DEFAULT_LLM_PROVIDER` (openai|anthropic). Frontend uses `VITE_API_BASE_URL` (defaults to `http://localhost:4050`). Templates in `{backend,frontend,agents}/.env.example`.

## CI/CD (GitHub Actions)

All workflows live in `.github/workflows/`. Single `main` branch; all changes via PR.

- **`ci.yml`** — Runs on every PR and push to `main`. Uses `dorny/paths-filter` to detect changed workspaces, then runs lint → typecheck → test → build only for affected packages. Python agents run Ruff + Pytest separately. Database migrations are validated via `supabase db lint`. A **CI Gate** job aggregates all results for branch protection.
- **`deploy.yml`** — Triggered on push to `main` or manual `workflow_dispatch` (staging/production selector). Builds all workspaces, uploads artifacts, runs Supabase migrations, then deploys backend and frontend (placeholder steps — swap in your hosting provider's action).
- **`pr.yml`** — Enforces conventional commit PR titles (`feat`, `fix`, `docs`, etc. with optional workspace scopes) and auto-labels PRs by changed paths via `.github/labeler.yml`.

**Repo governance**: `.github/CODEOWNERS` assigns workspace-level ownership. `.github/pull_request_template.md` includes a checklist for cross-workspace concerns (type sync, agent docs, migration testing).

**Dependabot** (`.github/dependabot.yml`): Weekly updates for npm (grouped by ecosystem — React, Fastify, AI SDKs, etc.), pip (`agents/python`), and GitHub Actions versions.

**Required secrets** for deploy: `SUPABASE_ACCESS_TOKEN`. **Required vars**: `SUPABASE_PROJECT_REF` (per environment).
