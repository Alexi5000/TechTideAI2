# Architecture

## Control plane
- Brian Cozy (CEO) + Veronica Cozy (Agent 0) + domain orchestrators define objectives, risks, and resource allocations.
- Decision logs map to measurable KPIs and dependencies.

## Execution plane
- Worker agents and automation workflows execute scoped tasks (five-worker pods per orchestrator).
- Worker pods are mapped to orchestrators in the agent registry for clear execution boundaries.
- Runs, events, artifacts, and knowledge documents are stored in Supabase for auditability.

## Evidence plane
- All decisions are tied to citations, KPIs, run artifacts, and vector-searchable evidence in Weaviate.
- Observability is enforced through run events and tooling logs.

## Code boundaries
- `apis/`: provider adapters and SDK wrappers
- `agents/`: agent definitions, skills, tools, and Mastra runtime
- `backend/`: orchestration API and runtime services
- `database/`: Supabase schema, policies, and seed data
- `frontend/`: operator UI
