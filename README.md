# TechTideAI

<!-- ![CI](https://github.com/Alexi5000/TechTideAI2/actions/workflows/ci.yml/badge.svg) -->
<!-- ![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg) -->

TechTideAI is a company-scale AI agent platform: a CEO agent, ten orchestrators, and fifty worker agents operating on a shared execution fabric.

The in-memory agent registry is the source of truth for agent identity. The database `agents` table stores org-scoped configuration and enablement, not canonical identity.

## Architecture

| Plane | Responsibility |
|-------|---------------|
| **Control** | CEO + orchestrators define objectives, risks, and resource allocations |
| **Execution** | Worker agents execute scoped tasks in five-worker pods per orchestrator |
| **Tool** | 17 registered tools (9 core + 8 stubs) with per-agent filtering |
| **Memory** | Short-term in-memory buffer + long-term vector-backed (Weaviate) |
| **Monitoring** | Execution tracing, counters, histograms (swappable for OpenTelemetry) |
| **Evidence** | All decisions tied to citations, KPIs, run artifacts, and vector-searchable evidence |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for full system design.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind v4, React Router v6 |
| Backend | Fastify, TypeScript, DDD layers |
| Agents (TS) | Mastra, Claude Agent SDK, Zod |
| Agents (Python) | LangGraph, LangChain |
| Database | Supabase (Postgres + RLS), Weaviate (vectors) |
| CI/CD | GitHub Actions, pnpm workspaces |

## Project Structure

```
techtideai/
├── frontend/           React UI
├── backend/            Fastify API + orchestration services
├── agents/             Agent registry, tools, evaluation, memory, monitoring
│   ├── src/core/       Registry, tool catalog, prompt templates
│   ├── src/evaluation/ EvalRunner + scorers
│   ├── src/memory/     Short-term + long-term memory
│   ├── src/monitoring/ Tracing + metrics
│   ├── src/mastra/     Mastra runtime + tool implementations
│   ├── python/         LangGraph / LangChain agents
│   ├── skills/         Agent skill specs (*.md)
│   └── tools/          Tool spec docs (*.md)
├── apis/               LLM provider adapters (OpenAI, Anthropic)
├── database/           Supabase config, migrations, Weaviate setup
├── scripts/            CLI entrypoints (run, evaluate, memory, datasets)
├── data/               Evaluation datasets + sample inputs
├── notebooks/          Jupyter notebooks for experimentation
└── docs/               Architecture + dev setup guides
```

## Quickstart

1. Install [Node 20](https://nodejs.org/) and [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
2. `pnpm install`
3. Copy environment templates:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   cp agents/.env.example agents/.env
   ```
4. `pnpm -C backend dev` — backend on http://localhost:4050
5. `pnpm -C frontend dev` — frontend on http://localhost:5180

See [`docs/DEV_SETUP.md`](docs/DEV_SETUP.md) for full details including Docker, Python agents, CLI scripts, and Jupyter notebooks.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for branching, commit conventions, and code review guidelines.

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE) for details.
