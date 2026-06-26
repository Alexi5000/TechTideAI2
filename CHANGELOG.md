# Changelog

All notable changes to TechTideAI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.5] - 2026-06-26

First official release of TechTideAI as a tagged version. The harness is feature-complete, the audit is clean, the 33-task golden suite runs end-to-end, the contract drift hash matches across both runtimes, the registry test strictly enforces the 61-agent invariant, and the docs are synchronized.

### Added
- 33rd golden task `veronica-lite-memory-recall` (agent `orch-pinwheel`, category `memory-recall`). The prior 32-task fixture did not exercise the `memory-recall` category at all; the new task closes that gap and brings the count from 32 to 33, the number every badge, callout, and ADR has always advertised.
- `RELEASE_NOTES_0.5.5.md`: a release notes file at the repo root, with the five reviewer probes, the talking points, the surface map, and a direct pointer to `docs/EVALS/latest.json` for the day-0 baseline.
- 7-day frozen eval baseline: the `docs/EVALS/latest.json` produced by the 0.5.5 verification run is the regression baseline until the next release.

### Changed
- `agents/src/core/registry.test.ts`: the 61-agent invariant is now strictly enforced (`toBe(10)`, `toBe(50)`, `toBe(61)`). The previous `toBeGreaterThanOrEqual` would have silently accepted a stray worker; the strict form fails loudly.
- `docs/ARCHITECTURE.md`: full rewrite. The previous version still mentioned "Andromeda (CEO)" and "Andromeda Director" from the pre-galaxy-map naming and pointed at the old `.png` hero. The new version reflects the Local Group Director + 10 galaxy orchestrators + 50 star-cluster workers model, points at the canonical SVG hero, and adds the cross-cutting-guarantees section.
- `.gitignore`: added `.pytest_cache/`, `.ruff_cache/`, `.mypy_cache/`, `coverage/`, `*.log`, `agents/python/build/`, `agents/python/dist/`, `.idea/`, `.vscode/`, and editor swap files. The previous list missed Python caches and IDE folders.
- `PRE_DEMO_AUDIT_PROMPT.md`: removed em-dashes from body prose (the only em-dashes that remain are inside `grep` code samples, which are intentional echoes of the no-em-dashes rule).
- Version pins: all six version fields bumped to `0.5.5` (root, `@techtide/agents`, `@techtide/apis`, `@techtide/frontend`, `@techtide/backend`, `techtide-agents` Python).

### Removed
- `assets/techtideai_hero_2026.png`: the pre-SVG hero. Only `docs/ARCHITECTURE.md` referenced it; the rewrite points at the canonical SVG, so the PNG is no longer needed and is gone.

### Verified
- `pnpm run verify` green (backend / agents / apis / frontend). 124 TS tests pass.
- `pytest`: 20 tests pass.
- `ruff check` + `ruff format`: clean.
- `pnpm -C backend evals --suite golden-tasks.v1 --write-docs` runs end-to-end on 33 tasks and emits `docs/EVALS/latest.json`.
- Contract sync: `pnpm exec tsx scripts/sync-contracts.ts` produces no diff; drift hash `a7e92f6b` matches both `agents/src/runtime/contract-types.generated.ts` and `agents/python/src/techtide_agents/contracts/generated.py`.

## [0.5.0] - 2026-06-25

### Brand: galaxy map
TechTideAI is now themed around the Local Group. The 1 CEO + 10 orchestrators + 50 workers are named after real galaxies and the star clusters / named sources inside them. The mental model is "a company of stars, structured the way the actual universe is structured."

- CEO: `ceo` (display name: **Local Group Director**)
- Orchestrators (10): `orch-andromeda` (Andromeda, M31), `orch-milky-way` (Milky Way), `orch-triangulum` (Triangulum, M33), `orch-centaurus-a` (Centaurus A), `orch-m87` (M87, Virgo A), `orch-whirlpool` (Whirlpool, M51), `orch-sombrero` (Sombrero, M104), `orch-pinwheel` (Pinwheel, M101), `orch-cartwheel` (Cartwheel, ESO 350-40), `orch-circinus` (Circinus)
- Workers (50): five real star clusters / named sources per galaxy (e.g. `worker-m32`, `worker-m110`, `worker-orion`, `worker-pleiades`, `worker-cena`, `worker-cenb`, `worker-m87-jet`, `worker-wheel-ring`, `worker-circinus-x1`)

### Changed
- All agent IDs, orchestrator display names + domains, eval task IDs, sprint contract IDs, runtime_config.yaml orchestrators, frontend display names, and doc prose renamed to the galaxy map. 164 substitutions across 30 files.
- The eval fixtures (`evals/fixtures/golden-tasks.v1.json`) and sprint contracts (`evals/sprints/well-scoped-sprint.v1.json`) renamed in place. The 33-task golden suite + 4-scorer grading surface is unchanged.
- The README Mermaid diagrams updated to reference the new orchestrator IDs and worker names.
- The `assets/techtideai_hero_2026.svg` (new) is now the canonical hero image. The old `techtideai_hero_2026.png` is kept temporarily for any external links. (It is removed in [Unreleased].)
- Frontend `App.tsx` / `App.js` orchestrator array: titles + descriptions updated to galaxy-themed names and the matching domain language.
- The 6 inline SVGs (`assets/techtideai_architecture.svg`, `techtideai_control_plane.svg`, `techtideai_three_agent_loop.svg`, `techtideai_run_lifecycle.svg`, `techtideai_contract_sync.svg`) and the 6 walkthrough SVGs under `assets/walkthrough/` already carried orchestrator names; all references were renamed in the same pass.

### Added
- New `assets/techtideai_hero_2026.svg`: a galaxy-themed hero with a starfield background, the Local Group Director at the center, the ten galaxies in a ring, and worker counts beneath each. The old PNG hero is preserved for any external links.

### Verified
- `pnpm run verify` green (backend / agents / apis / frontend).
- `pytest`: 20 tests pass.
- `ruff check` + `ruff format`: clean.
- `pnpm -C backend evals --suite golden-tasks.v1 --write-docs` runs end-to-end on 33 tasks and emits `docs/EVALS/latest.json`.
- `pnpm -C agents test` (registry test, skills, types): 14/14 pass with the new CEO name `Local Group Director`.
- Zero em-dashes anywhere in the repo.
- All 5 version surfaces (package.json, pyproject.toml, `__init__.py`, `server.py`, README callout) report `0.5.0`.

## [0.3.0] - 2026-06-24

### Added
- Five architecture SVG diagrams under `assets/`:
  `techtideai_architecture.svg` (full system), `techtideai_control_plane.svg`
  (1 CEO + 10 orchestrators + 50 workers in five-worker pods),
  `techtideai_contract_sync.svg` (schema.json as the single source of truth),
  `techtideai_three_agent_loop.svg` (generator + evaluator + judge loop), and
  `techtideai_run_lifecycle.svg` (queued → running → approval_requested → succeeded/failed).
  Each diagram is referenced from the corresponding README section.

### Changed
- `package.json` `description` expanded to ~250 chars so the GitHub About
  sidebar shows a specific blurb instead of a generic one. Added `homepage`
  and 15 `keywords` (mastra, langgraph, human-in-the-loop, evaluation-harness,
  approval-gate, opentelemetry, etc.) so GitHub auto-syncs them into the
  repo's `/topics` page.
- `README.md` About section rewritten as a tight bullet list of the mental
  model (one CEO, ten orchestrators, fifty workers in five-worker pods).
- `.github/workflows/deploy.yml`: each deploy job (migrate, deploy-backend,
  deploy-frontend) now skips cleanly when its required secrets and vars are
  absent. Per ADR 0009, the repo deliberately ships no production deploy
  target, so "no infra wired up" is a green skip, not a red failure.
- `package.json` `version`, README callout, Python `pyproject.toml`,
  `__init__.py`, and `server.py` all bumped to `0.3.0`.

### Fixed
- GitHub repo description (set via the web UI) had a stray em-dash.
  Replaced with a comma via the API; verified the About sidebar is now
  em-dash-free alongside `package.json` `description` and the README.

## [0.2.1] - 2026-06-23

### Fixed
- **Workspace dependency cycle (agents → backend).** `ApprovalPolicy` and `ApprovalRiskTier` now live in `@techtide/agents` (`agents/src/core/approval-policy.ts`) and are re-exported from `@techtide/backend` (`backend/src/domain/policies/approval-policy.ts`) so the `apis → agents → backend` build order stays acyclic. `agents/src/mastra/tools/workflow-runner.ts` now imports from the relative path (was an undeclared `import from "@techtide/backend"`). `AGENTS.md` documents the new rule.
- **Python package version drift.** `agents/python/pyproject.toml`, `agents/python/src/techtide_agents/__init__.py`, and `agents/python/src/techtide_agents/server.py` are now at `0.2.0` (the FastAPI sidecar now reports `0.2.0` on `/healthz` and the uvicorn banner).

### Changed
- `agents/package.json`, pinned `@anthropic-ai/claude-agent-sdk`, `@mastra/core`, and `mastra` to the resolved versions in `pnpm-lock.yaml` (was `latest`).
- `docs/BENCHMARK.md`, intro rewritten to match the actual Status column vocabulary (`match` / `partial` / `missing` / `differs-on-purpose`).
- `docs/QUALITY_GATES.md`, expanded into the release-gate source of truth: covers the verify gate, the Python gate, the contract gate, the eval gate, the do-not-touch zones, the per-workspace test-coverage decision (including why `frontend` has no unit tests), the review checklist, and the operating principles.
- `AGENTS.md`, added the "Workspace topology" section that documents the agents-as-source-of-truth rule for shared types.

### Removed
- `agents/src/mastra/tools/workflow-runner.ts` no longer imports `defaultApprovalPolicy` (unused after the cycle fix).

## [0.2.0] - 2026-06-23

### Added
- **Three-agent adversarial harness**, `backend/src/services/three-agent-harness.ts` runs a Planner → Generator → Evaluator loop with a typed `SprintContract`, plateau detection, and max-iteration cap. New CLI (`pnpm -C backend sprint`), API routes (`/api/sprints/*`), and dashboard page (`/dashboard/sprints`).
- **Sprint contracts**, versioned JSON-form contracts under `evals/sprints/`. One example (`well-scoped-sprint.v1.json`) plus a README.
- **Four-axis grader** (`backend/src/services/scoring/four-axis-grader.ts`), grades the four canonical axes (correctness, safety, completeness, quality) with per-axis thresholds.
- **Plateau-detection scorer** (`backend/src/services/scoring/plateau-scorer.ts`), wrapper that publishes `{ plateauDetected, rollingDelta, ... }` on `meta`. The harness's loop reads `meta.rollingDelta` to decide when to stop.
- **Skills surface** (`agents/src/skills/`), three built-in skills (`prompt-iteration`, `tool-evaluator`, `contract-aware`) wired into every agent's system prompt. OCP-friendly `SkillRegistry` (mirrors `ScorerRegistry`).
- **Notebook authoring surface** (`notebooks/`), three hand-written `*.ipynb` files for authoring golden tasks, iterating prompts, and auditing runs. A typed Python bridge (`techtide_agents.notebook_bridge`) plus a `scripts/convert-notebooks.py` that emits sibling `.py` for review. CI workflow (`.github/workflows/notebooks.yml`) runs `jupyter nbconvert --execute` as a smoke test.
- **Containerization**, per-service Dockerfiles (`Dockerfile.{backend,frontend,agents,python}`), `docker-compose.yml` with healthchecks and `depends_on: condition: service_healthy`, `.dockerignore`, `frontend/nginx.conf` reverse-proxying `/api/*` to `backend:4050`, and `scripts/smoke-stack.sh`. CI `docker` job builds and smoke-tests the stack.
- **Trace enrichment**, `ThreeAgentHarness` wraps iterations in `withSpan`; new `GET /api/runs/:id/trace` returns the enriched tree. `ScoringBreakdown.meta` carries `eval.*` attributes end-to-end. The trace service has a `runIdIndex` so the route can resolve a run to its trace.
- **Eval harness refactor**, `pickScorersFor` now reads from the suite, not the registry. The suite is the source of truth for which scorers apply and at what weight.
- **Generic contract sync**, `scripts/sync-contracts.ts` now iterates `schema.definitions` and templates each TS + Python type. Adding a new contract type is a one-line schema change.

### Changed
- `IAgentRuntime.AgentEvent.type` now includes the `approval_requested` / `approval_granted` / `approval_denied` variants the runtime actually emits (drift fix).
- `IAgentRuntime.AgentRunResult.approvalId` is now a typed field (was missing).
- `frontend/src/lib/api-client.ts`, `ScorerKind` includes `four-axis-grader` and `plateau-scorer`; `ScoringBreakdown` includes the optional `meta` channel.
- `agents/src/mastra/agents.ts`, default model is now `openai/gpt-4o` (was the fictional `gpt-5.1`).
- `agents/python/src/techtide_agents/runtime/dispatcher.py`, config path now resolves to the actual `agents/runtime_config.yaml` (was resolving to a non-existent path under `agents/python/agents/`).
- `agents/python/src/techtide_agents/notebook_bridge.py`, uses `request.full_url` (was the non-existent `request.full`).
- `agents/python/src/techtide_agents/runtime/langgraph_runtime.py`, `_suggest_delegations` returns the real worker ids from the registry (was returning hallucinated `veronica-1..5` style names).
- `backend/src/routes/evals.ts`, uses `instanceof EvalRegressionDetectedError` (was string-name comparison, brittle to renames).
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

