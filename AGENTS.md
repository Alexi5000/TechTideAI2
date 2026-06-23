# AGENTS.md, procedural memory for any agent working in this repo

> Read this on session start. It is the agent's map of the codebase. If something here is wrong, the agent's first job is to fix this file (and the ADR that explains it), not to work around it.

## What this repo is

TechTideAI is a **company-scale agent operating system**: a typed, observable, testable harness for building and operating production agent teams. It is a portfolio piece, not a SaaS product. The success criterion is "a senior reviewer can read the repo end-to-end in one sitting and understand every architectural choice."

The mental model is a working company modelled as an agent system: 1 CEO + 10 orchestrators + 50 workers (5 per orchestrator). Tools, memory, evals, approvals, and traces are the harness around them.

## The four planes

| Plane | What lives here | Where to read |
|---|---|---|
| **Control** | CEO + orchestrators, dispatching, risk classification | `agents/src/core/registry.ts`, `docs/adr/0003-dual-runtime.md` |
| **Execution** | Workers, tool calls, workflow runs, contracts | `agents/src/mastra/`, `agents/src/runtime/`, `docs/adr/0007-skills-vs-tools.md` |
| **Evidence** | `run_events`, traces, post-mortems, evals | `backend/src/services/trace-service.ts`, `docs/EVALS.md`, `docs/adr/0005-trace-and-memory.md` |
| **Product** | Operator console | `frontend/src/pages/` |

## How to run a task

The canonical sequence for *evaluating* any change to agent behavior:

```bash
# 1. Install
pnpm install

# 2. Verify (lint + test + build)
pnpm run verify

# 3. Run the eval suite (writes docs/EVALS/latest.json)
pnpm -C backend evals --suite golden-tasks.v1

# 4. Run the Python runtime tests
cd agents/python && pip install -e ".[dev,server]" && pytest

# 5. If contracts changed, regenerate
pnpm tsx scripts/sync-contracts.ts
```

The harness will throw `EvalRegressionDetectedError` if pass-rate drops more than `EVAL_REGRESSION_THRESHOLD_PCT` (default 5%) versus the latest baseline.

## The contract surface

The TypeScript and Python runtimes share a single contract. The source of truth is **`contracts/schema.json`**. `scripts/sync-contracts.ts` regenerates both:

- `agents/src/runtime/contract-types.generated.ts` (TypeScript types)
- `agents/python/src/techtide_agents/contracts/generated.py` (Pydantic models)

A drift-check hash is embedded in both generated files. The Python test `tests/test_contract_sync.py` reads both and asserts equality, so any hand-edit fails CI.

**To add a new contract type:** edit `contracts/schema.json`, re-run `pnpm tsx scripts/sync-contracts.ts`, commit the regenerated files in the same PR.

## The 61 agents

`agents/src/core/registry.ts` exports `agentRegistry` (the canonical 1 CEO + 10 orchestrators + 50 workers) and `getAgentById(id)`. The 10 orchestrators are: `orch-veronica`, `orch-ava`, `orch-finn`, `orch-cipher`, `orch-axel`, `orch-luna`, `orch-ellie`, `orch-veronica-lite`, `orch-audit`, `orch-content`. The CEO is `ceo`. Workers are named `worker-<orchestrator-short>-<role>` (e.g. `worker-ava-sops`, `worker-cipher-fpna`, `worker-luna-campaign`) and `reportsTo` their orchestrator. Five per orchestrator; the registry test (`agents/src/core/registry.test.ts`) asserts the invariant.

## The "do not touch" zones

These are *deliberately* hard to change. If a task asks you to modify them, push back, write an ADR, and surface the tradeoff.

- **`run_events` is append-only.** Every state transition emits a `RunEvent`. The table is the audit log. Adding `UPDATE` paths is a security regression; an `event_type` enum is the only legitimate change.
- **Status transitions are policy-gated.** `StatusTransitionPolicy` is the single source of truth for legal transitions. Extend it via `extend()` (OCP), never by mutating the default.
- **The approval gate is OCP-extended, never mutated.** The `ApprovalPolicy` decides which actions need human review. Adding tiers is fine; bypassing the policy is not.
- **The contract is the seam.** If you find yourself adding a framework-specific type to `IAgentRuntime` or `AgentRunResult`, stop and add it to `contracts/schema.json` first.
- **The 61-agent invariant is enforced.** `agents/src/core/registry.test.ts` asserts `1 ceo + 10 orchestrators + 50 workers (5 per orchestrator)`. Don't add a worker without a 5-sibling pod, don't add an orchestrator without updating both the test and `agents/runtime_config.yaml`.

## Workspace topology

The build order is `apis → agents → backend`. To keep that DAG acyclic, any type both sides need (notably `ApprovalPolicy` and `ApprovalRiskTier`) lives in `@techtide/agents` (`agents/src/core/approval-policy.ts`) and is **re-exported** from `@techtide/backend` (`backend/src/domain/policies/approval-policy.ts`) for downstream consumers. The agents package never imports from `@techtide/backend`; the backend imports from `@techtide/agents`. If you find yourself adding an `import from "@techtide/backend"` to anything under `agents/`, stop, move the type into `agents/src/core/` (or `agents/src/runtime/`) instead, then re-export from the backend.

## Test commands (cheat sheet)

| Command | What it does |
|---|---|
| `pnpm run verify` | Lint + test + build across every TS workspace (the release gate) |
| `pnpm -C backend test` | Vitest on the backend |
| `pnpm -C agents test` | Vitest on the agents package |
| `pnpm -C apis test` | Vitest on the provider adapters |
| `pnpm -C backend evals` | Run the eval suite |
| `cd agents/python && pytest` | Python tests (LangGraph runtime, dispatcher, contract sync, LLM) |
| `pnpm tsx scripts/sync-contracts.ts` | Regenerate TS + Python contract files |
| `pnpm tsx scripts/close-stale-deps-prs.sh` | Close stale dependabot PRs (after opening a consolidated one) |

## Reading order for a new contributor

1. **`README.md`**, the pitch, the "what works today" table, the architecture.
2. **`AGENTS.md` (this file)**, the operational map.
3. **`docs/adr/`**, every architectural decision is justified here. The order is 0001 → 0009; each builds on the previous.
4. **`backend/src/services/eval-harness.ts` + `agents/src/runtime/types.ts`**, the load-bearing code paths.
5. **`evals/fixtures/golden-tasks.v1.json`**, what the system is supposed to be good at.
6. **`docs/posts/lessons-from-building-a-company-scale-agent-os.md`**, the engineering retrospective.

## What agents should do

- Read this file on session start. Update it (and the matching ADR) when the architecture changes.
- Run `pnpm run verify` before claiming a change is done.
- Update `evals/fixtures/` when you add an agent capability. The eval suite is the documentation of what the system does.
- Prefer OCP-friendly extensions over mutation. The registry/policy/scorer patterns exist for a reason.
- Be honest in docs. The README, ADRs, and benchmark doc say what is real. Aspirational copy is a bug.

## What agents should not do

- Don't add framework-specific types to `IAgentRuntime` or `AgentRunResult`. Add to `contracts/schema.json` first.
- Don't add a worker without updating the 5-sibling pod, the registry test, and the runtime config.
- Don't bypass the approval gate. The HITL surface is the safety net; bypassing it is a security regression.
- Don't write aspirational README copy. Every line points to a file or CLI command.
- Don't merge without a green `pnpm run verify`. The gate exists for a reason.
