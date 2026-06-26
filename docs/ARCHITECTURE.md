# Architecture

![TechTideAI agent operating system](../assets/techtideai_hero_2026.svg)

The harness is a company. The brand is a galaxy. The architecture is a
pyramid with three planes hanging off the side. Every surface below has
a code file, a test, and an ADR behind it.

## The pyramid

```
            Local Group Director (ceo)
                       |
        +--------------+--------------+
        |              |              |
  orch-andromeda  orch-milky-way  orch-triangulum  ...  orch-circinus
   (product+GTM) (finance+analytics) (sales)             (CS triage)
        |              |              |
   +----+----+    +----+----+    +----+----+
   |    |    |    |    |    |    |    |    |
   w   w   w   w   w   w   w   w   w   w   ...   (50 workers, 5 per pod)
```

- **1 director** (`ceo`, display name: **Local Group Director**): routine that dispatches the 33-task suite to the right orchestrator.
- **10 orchestrators** (one per galaxy): each owns a domain, reviews worker output, and decides when to escalate to the human gate.
- **50 workers** (5 per orchestrator, star-cluster named): the actual tool-call hot path. Workers run on the TypeScript Mastra runtime by default.

The 61-agent invariant is asserted in `agents/src/core/registry.test.ts`
(`toBe(10)` orchestrators, `toBe(50)` workers, `toBe(61)` total). Adding
a worker without updating the pod, or an orchestrator without updating
the runtime config, fails that test.

## The four planes

| Plane | Lives in | Read |
|---|---|---|
| **Control** | `agents/src/core/registry.ts`, `agents/runtime_config.yaml` | The 1 + 10 + 50 roster, the dispatch policy, the risk classifier. |
| **Execution** | `agents/src/mastra/`, `agents/src/runtime/`, `agents/python/src/techtide_agents/runtime/` | The two `IAgentRuntime` implementations, the tools, the skills. |
| **Evidence** | `backend/src/services/trace-service.ts`, `run_events` (Supabase), `docs/EVALS/latest.json` | The append-only audit log, the OTel trace tree, the eval baseline. |
| **Product** | `frontend/src/pages/` | The operator console: agents, runs, approvals, evals, sprints. |

## Code boundaries

- `apis/`: provider adapters and SDK wrappers. The only package that talks to OpenAI / Anthropic / a future provider.
- `agents/`: agent definitions, skills, tools, and the Mastra (TypeScript) runtime. Plus `agents/python/` for the LangGraph sidecar.
- `backend/`: Fastify orchestration API, the run + approval + eval services, the post-mortem writer, the contract-sync shim.
- `contracts/`: the single source of truth (`schema.json`). Both runtimes are generated from this file by `scripts/sync-contracts.ts`.
- `database/`: Supabase schema, migrations, and RLS policies.
- `frontend/`: the operator UI (React + Vite + Tailwind).
- `evals/`: the versioned golden task suite and the sprint contract.
- `notebooks/`: the authoring surface (three `.ipynb` files, plus the bridge that talks to the backend over HTTP).
- `scripts/`: repo maintenance, contract sync, notebook conversion.
- `docs/`: ADRs, methodology, demo run-of-show, engineering retrospective.
- `assets/`: SVG diagrams and the hero.

## Cross-cutting guarantees

- **Typed contract, two runtimes.** `contracts/schema.json` is the single source of truth; `scripts/sync-contracts.ts` regenerates both `agents/src/runtime/contract-types.generated.ts` and `agents/python/src/techtide_agents/contracts/generated.py` and stamps a matching FNV-1a drift hash in both. `pytest agents/python/tests/test_contract_sync.py` enforces the equality.
- **Append-only audit log.** Every state transition emits a `run_events` row. The `run_events` table is never updated. Application-level enum (`RunEventTypeSchema`) keeps the values stable.
- **Policy-stamped human gate.** `ApprovalPolicy` is OCP-extensible (`extend()` returns a new policy). Every `ApprovalRequest` carries a `policyVersion` string, so a future auditor can replay the decision against the policy in force at the time.
- **Eval-as-regression.** The 33-task golden suite is the regression dashboard. Frozen baseline + 5% threshold + post-mortem auto-gen. A drop in pass rate is the only signal the FDE needs to know something broke.
- **OCP over mutation.** `StatusTransitionPolicy.extend()`, `ApprovalPolicy.extend()`, `ScorerRegistry.register()`, `SkillRegistry.register()`, `agents/runtime_config.yaml` dispatch. Default surfaces are never mutated; new behavior is layered.

## See also

- `AGENTS.md`, the procedural memory an agent reads on session start
- `docs/adr/`, the nine ADRs that explain every load-bearing decision in order
- `docs/EVALS.md`, eval methodology
- `docs/PYTHON_RUNTIME.md`, dual runtime architecture
- `docs/QUALITY_GATES.md`, what "done" means in this repo
- `docs/posts/lessons-from-building-a-company-scale-agent-os.md`, the engineering retrospective
