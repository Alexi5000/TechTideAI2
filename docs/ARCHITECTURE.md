# Architecture

## Control plane
- CEO Agent + orchestrators define objectives, risks, and resource allocations.
- Decision logs map to measurable KPIs and dependencies.

## Execution plane
- Worker agents and automation workflows execute scoped tasks.
- Runs, events, and artifacts are stored in Supabase for auditability.

## Evidence plane
- All decisions are tied to citations, KPIs, and run artifacts.
- Observability is enforced through run events and tooling logs.

## Code boundaries
- `apis/`: provider adapters and SDK wrappers
- `agents/`: agent definitions, skills, tools, and Mastra runtime
- `backend/`: orchestration API and runtime services
- `database/`: Supabase schema, policies, and seed data
- `frontend/`: operator UI
