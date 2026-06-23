# Python Runtime (LangGraph Sidecar)

> The Python runtime is the second `IAgentRuntime` implementation. Orchestrator-tier agents with graph-heavy control flow (conditional HITL gates, deterministic compute layers, multi-step plans) run here. Workers stay on the TypeScript Mastra runtime.

## Why two runtimes

The Mastra (TypeScript) runtime is fast and ergonomic for the worker hot path — a single LLM call plus a few tool calls. It is the wrong shape for orchestrators that:

- Need a deterministic compute layer (e.g. Cipher's forecast / margin / pipeline math).
- Gate execution on human approval with conditional edges.
- Compose multi-step plans that need explicit step-by-step visibility in the trace tree.

LangGraph (Python) gives us those primitives for free. We expose the same `IAgentRuntime` contract on both sides so the dispatch is invisible to the rest of the system.

## Architecture

```
backend Fastify
   │
   │  IAgentExecutionService.executeAgent(...)
   │      │
   │      ▼
   │  Dispatcher.decide(agent_id, tier)
   │      │
   │      ├─ langgraph ─► LangGraphBridge ──► POST /run ─► Python sidecar (FastAPI)
   │      │                                                       │
   │      │                                                       ▼
   │      │                                                  LangGraphRuntime
   │      │                                                       │
   │      └─ mastra    ─► MastraRuntime (TypeScript, in-process)
```

Default routing lives in `agents/runtime_config.yaml`:

```yaml
tiers:
  ceo: mastra
  orchestrator: langgraph
  worker: mastra

agents:
  orch-cipher: langgraph
  orch-audit: langgraph
  ...
```

Per-agent overrides win over tier defaults. To backport an orchestrator to Mastra, remove its `agents:` entry; to graduate a worker to a graph, add one.

## The contract

The TS and Python runtimes share a single source-of-truth: `contracts/schema.json`. `scripts/sync-contracts.ts` reads the schema and emits:

- `agents/src/runtime/contract-types.generated.ts` — TypeScript types.
- `agents/python/src/techtide_agents/contracts/generated.py` — Pydantic models.

The two files embed a **drift-check hash** at the bottom. `agents/python/tests/test_contract_sync.py` reads both hashes and asserts they match. CI fails if anyone edits one side without re-running the sync.

To change the contract:

1. Edit `contracts/schema.json`.
2. Run `pnpm tsx scripts/sync-contracts.ts`.
3. Run `pnpm -C backend test` and `pytest agents/python` locally.
4. Commit the regenerated files in the same PR.

## Running locally

The Python sidecar is optional. The backend works fine without it (every agent runs on Mastra).

```bash
# 1. Install the Python runtime with the [server] extras
cd agents/python
python -m pip install -e ".[dev,server]"

# 2. Boot the sidecar
SIDECAR_PORT=4051 uvicorn techtide_agents.server:app --host 0.0.0.0 --port 4051

# 3. Tell the backend about it
# backend/.env
LANGGRAPH_SIDECAR_URL=http://localhost:4051

# 4. Run an orchestrator agent — it'll route to Python
pnpm -C backend dev:backend
curl -X POST http://localhost:4050/api/agents/orch-cipher/run \
  -H "Content-Type: application/json" \
  -d '{"input": {"currentMRR": 120000, "growthRate": 0.08, "horizonMonths": 12}}'
```

## Cipher's graph

Cipher is the showcase graph. It has four phases:

1. **Intake** — extract the financial inputs from `AgentRunRequest.input`.
2. **Compute** — apply deterministic formulas (compound growth for forecast, gross/operating margin, weighted pipeline coverage).
3. **Narrative** — call the LLM with a structured prompt that grounds the narrative in the computed numbers.
4. **Gate** — if `input.action == "cost_optimization"`, return `awaiting-approval` instead of executing. This is the canonical example of how a high-risk orchestrator action pauses for human review.

The other orchestrators use a generic 4-node synthesis graph (intake → plan → delegate → synthesize). Each is small enough to read in one sitting and bespoke-tunable when an orchestrator graduates.

## Adding a new graph

1. Add the agent id to `default_orchestrator_graphs()` in `agents/python/src/techtide_agents/runtime/langgraph_runtime.py`. Either reuse `make_synthesis_graph` or hand-tune a new function.
2. Add the agent id to `agents/runtime_config.yaml` under `agents:`.
3. Add a golden task to `evals/fixtures/golden-tasks.v1.json` exercising the new graph.
4. Run `pnpm -C backend evals --suite golden-tasks.v1` to verify.

## Cost & latency budget

| Tier        | Latency p95 (target) | Cost / run (target) |
|-------------|---------------------:|--------------------:|
| Worker      | 4s                   | $0.02               |
| Orchestrator (Mastra) | 8s            | $0.04               |
| Orchestrator (LangGraph) | 6s         | $0.03               |

LangGraph wins on cost because the deterministic compute layer avoids an LLM call for the math-heavy work; Mastra wins on latency when the graph is one-shot.

## What's deliberately not here yet

- **Real LangGraph state graphs.** The current implementation is a function-based router. The next iteration will replace `make_cipher_graph` with `langgraph.graph.StateGraph` so spans appear in LangSmith / OpenLLMetry.
- **Conditional edges for HITL.** Right now we return `awaiting-approval`; a `langgraph.graph.END` + `langgraph.graph.StateGraph.add_conditional_edges` rewrite will let the graph itself pause.
- **Vector memory wiring.** `getMastraMemory` is the TS side. The Python equivalent is a stub.
