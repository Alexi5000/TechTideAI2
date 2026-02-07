# TechTideAI

TechTideAI is a company-scale AI agent platform: a CEO agent, ten orchestrators (including Agent 0), and fifty worker agents operating on a shared execution fabric.

The in-memory agent registry is the source of truth for agent identity. The database `agents` table stores org-scoped configuration and enablement, not canonical identity.

## Stack
- Frontend: React + Vite + Tailwind (shadcn-lite patterns)
- Backend: Fastify + TypeScript orchestration APIs
- Agents: Mastra (TypeScript) + Claude Agent SDK scaffolding
- Python tools: LangGraph + LangChain
- Database: Supabase (migrations + seed data) + Weaviate (vector search)

## Repo structure
- `frontend/` React UI
- `backend/` API + orchestration services
- `database/` Supabase config, migrations, seed data
- `apis/` external provider adapters (OpenAI, Anthropic)
- `agents/` agent specs, skills, tools, Mastra runtime, Python utilities

## Quickstart
1. Install Node 20 and pnpm
2. `pnpm install`
3. `pnpm -C backend dev`
4. `pnpm -C frontend dev`

See `docs/DEV_SETUP.md` for full details and `docs/ARCHITECTURE.md` for system boundaries.
