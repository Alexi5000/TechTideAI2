# @techtide/agents

Agent catalog, runtime, tools, evaluation, memory, monitoring, and orchestration for TechTideAI.

## Agent Hierarchy

- **1 CEO** (`ceo-chief`) — Top-level strategic agent
- **10 Orchestrators** (`orch-*`) — Domain-specific coordinators
- **50 Workers** (`worker-*`) — Task executors, five per orchestrator

All 61 agents are defined statically in `src/core/registry.ts`. Agent IDs follow `{tier}-{name}` convention.

## Module Layout

```
src/
├── core/           Registry, tool catalog, types
│   └── prompts/    Template-based prompt system (renderPrompt)
├── evaluation/     EvalRunner, scorers, dataset management
├── memory/         Short-term (in-memory) + long-term (vector store)
├── monitoring/     InMemoryTracer + InMemoryMetrics
├── orchestration/  Pipeline primitives (chain, parallel, route, eval-loop)
├── mastra/         Mastra runtime integration + tool implementations
│   └── tools/      18 tool implementations (10 core + 8 stubs)
├── runtime/        IAgentRuntime interface + MastraRuntime
└── claude/         Claude Agent SDK wrapper
```

## Tool System

- **10 core tools** (shared across all agents): system-status, llm-router, knowledge-base, workflow-runner, org-kpi-dashboard, execution-map, market-intel, memory-recall, memory-store, invoke-agent
- **8 planned stubs** (return `not_implemented`): talent-hub, finance-ledger, crm-insights, content-lab, support-hub, user-insights, data-lake, runbook
- **invoke-agent** — Hierarchy-scoped delegation tool (CEO invokes orchestrators; orchestrators invoke workers)
- Per-agent tool filtering via `selectToolsForAgent()`
- Tool policy: `shared` (all core tools) or `strict` (declared tools only) via `MASTRA_TOOL_POLICY`

## Commands

```bash
pnpm dev            # Start Mastra dev server
pnpm build          # Compile TypeScript
pnpm lint           # ESLint
pnpm test           # Run Vitest suite
```

## Spec Files

- Agent behavioral specs: [`agents.md`](agents.md)
- Skill definitions: [`skills/*.md`](skills/)
- Tool specs: [`tools/*.md`](tools/)

## Python Sub-Package

See [`python/README.md`](python/README.md) for the LangGraph/LangChain agent setup.

## Further Reading

See [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for system design details.
