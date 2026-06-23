# Changelog

All notable changes to TechTideAI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-06-23

### Fixed
- **Workspace dependency cycle (agents → backend).** `ApprovalPolicy` and `ApprovalRiskTier` now live in `@techtide/agents` (`agents/src/core/approval-policy.ts`) and are re-exported from `@techtide/backend` (`backend/src/domain/policies/approval-policy.ts`) so the `apis → agents → backend` build order stays acyclic. `agents/src/mastra/tools/workflow-runner.ts` now imports from the relative path (was an undeclared `import from "@techtide/backend"`). `AGENTS.md` documents the new rule.
- **Python package version drift.** `agents/python/pyproject.toml`, `agents/python/src/techtide_agents/__init__.py`, and `agents/python/src/techtide_agents/server.py` are now at `0.2.0` (the FastAPI sidecar now reports `0.2.0` on `/healthz` and the uvicorn banner).

### Changed
- `agents/package.json` — pinned `@anthropic-ai/claude-agent-sdk`, `@mastra/core`, and `mastra` to the resolved versions in `pnpm-lock.yaml` (was `latest`).
- `docs/BENCHMARK.md` — intro rewritten to match the actual Status column vocabulary (`match` / `partial` / `missing` / `differs-on-purpose`).
- `docs/QUALITY_GATES.md` — expanded into the release-gate source of truth: covers the verify gate, the Python gate, the contract gate, the eval gate, the do-not-touch zones, the per-workspace test-coverage decision (including why `frontend` has no unit tests), the review checklist, and the operating principles.
- `AGENTS.md` — added the "Workspace topology" section that documents the agents-as-source-of-truth rule for shared types.

### Removed
- `agents/src/mastra/tools/workflow-runner.ts` no longer imports `defaultApprovalPolicy` (unused after the cycle fix).

## [0.2.0] - 2026-06-23

### Added
- **Three-agent adversarial harness** — `backend/src/services/three-agent-harness.ts` runs a Planner → Generator → Evaluator loop with a typed `SprintContract`, plateau detection, and max-iteration cap. New CLI (`pnpm -C backend sprint`), API routes (`/api/sprints/*`), and dashboard page (`/dashboard/sprints`).
- **Sprint contracts** — versioned JSON-form contracts under `evals/sprints/`. One example (`well-scoped-sprint.v1.json`) plus a README.
- **Four-axis grader** (`backend/src/services/scoring/four-axis-grader.ts`) — grades the four canonical axes (correctness, safety, completeness, quality) with per-axis thresholds.
- **Plateau-detection scorer** (`backend/src/services/scoring/plateau-scorer.ts`) — wrapper that publishes `{ plateauDetected, rollingDelta, ... }` on `meta`. The harness's loop reads `meta.rollingDelta` to decide when to stop.
- **Skills surface** (`agents/src/skills/`) — three built-in skills (`prompt-iteration`, `tool-evaluator`, `contract-aware`) wired into every agent's system prompt. OCP-friendly `SkillRegistry` (mirrors `ScorerRegistry`).
- **Notebook authoring surface** (`notebooks/`) — three hand-written `*.ipynb` files for authoring golden tasks, iterating prompts, and auditing runs. A typed Python bridge (`techtide_agents.notebook_bridge`) plus a `scripts/convert-notebooks.py` that emits sibling `.py` for review. CI workflow (`.github/workflows/notebooks.yml`) runs `jupyter nbconvert --execute` as a smoke test.
- **Containerization** — per-service Dockerfiles (`Dockerfile.{backend,frontend,agents,python}`), `docker-compose.yml` with healthchecks and `depends_on: condition: service_healthy`, `.dockerignore`, `frontend/nginx.conf` reverse-proxying `/api/*` to `backend:4050`, and `scripts/smoke-stack.sh`. CI `docker` job builds and smoke-tests the stack.
- **Trace enrichment** — `ThreeAgentHarness` wraps iterations in `withSpan`; new `GET /api/runs/:id/trace` returns the enriched tree. `ScoringBreakdown.meta` carries `eval.*` attributes end-to-end. The trace service has a `runIdIndex` so the route can resolve a run to its trace.
- **Eval harness refactor** — `pickScorersFor` now reads from the suite, not the registry. The suite is the source of truth for which scorers apply and at what weight.
- **Generic contract sync** — `scripts/sync-contracts.ts` now iterates `schema.definitions` and templates each TS + Python type. Adding a new contract type is a one-line schema change.

### Changed
- `IAgentRuntime.AgentEvent.type` now includes the `approval_requested` / `approval_granted` / `approval_denied` variants the runtime actually emits (drift fix).
- `IAgentRuntime.AgentRunResult.approvalId` is now a typed field (was missing).
- `frontend/src/lib/api-client.ts` — `ScorerKind` includes `four-axis-grader` and `plateau-scorer`; `ScoringBreakdown` includes the optional `meta` channel.
- `agents/src/mastra/agents.ts` — default model is now `openai/gpt-4o` (was the fictional `gpt-5.1`).
- `agents/python/src/techtide_agents/runtime/dispatcher.py` — config path now resolves to the actual `agents/runtime_config.yaml` (was resolving to a non-existent path under `agents/python/agents/`).
- `agents/python/src/techtide_agents/notebook_bridge.py` — uses `request.full_url` (was the non-existent `request.full`).
- `agents/python/src/techtide_agents/runtime/langgraph_runtime.py` — `_suggest_delegations` returns the real worker ids from the registry (was returning hallucinated `veronica-1..5` style names).
- `backend/src/routes/evals.ts` — uses `instanceof EvalRegressionDetectedError` (was string-name comparison, brittle to renames).
- README rewritten around a customer-scenario narrative and explicit success metrics.

### Fixed
- `runId → traceId` mapping in the trace service: `GET /api/runs/:id/trace` now returns the correct tree.
- `contract-types.generated.ts` was missing from the repo; regenerated to match schema v1.1.0.
- `LlmUsage` is now a named definition in `contracts/schema.json` (was inlined inside `LlmResponse`).
- `three-agent-harness.ts` was passing `r.rationale ? "llm-judge" : "llm-judge"` to `toBreakdown` (both branches identical); now passes the real `r.kind`.
- `run-sprint.ts` was using `input.contractVersion` (undefined on the `finalize` arg); now uses `input.contract.contractVersion`.
- `AGENTS.md` claimed workers are `<orch-id>-N`; the actual worker pattern is `worker-<topic>-<role>`. Updated.

## [0.1.0] - 2026-05-20

### Added
- Initial monorepo scaffold: pnpm workspaces, Fastify backend, Vite + React frontend, Mastra agents.
- 61-agent static registry (1 CEO + 10 orchestrators + 50 workers).
- Provider adapters for OpenAI (Responses API) and Anthropic (Messages API).
- Supabase migrations for `runs`, `run_events`, `knowledge_documents`, `knowledge_chunks`.
- Weaviate single-node docker-compose for vector storage.
- Two-node LangGraph demo under `agents/python/`.
- CI workflows: `ci.yml`, `deploy.yml`, `pr.yml`.

[Unreleased]: https://github.com/Alexi5000/TechTideAI2/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Alexi5000/TechTideAI2/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Alexi5000/TechTideAI2/releases/tag/v0.1.0

