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
| **Tool** | 18 registered tools (10 core + 8 planned stubs) with per-agent filtering |
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
│   ├── src/orchestration/ Pipeline primitives (chain, parallel, route, eval-loop)
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
6. Build, test, and lint:
   ```bash
   pnpm run build    # Build all packages
   pnpm run test     # Run all tests (144 across 4 packages)
   pnpm run lint     # Lint all packages
   pnpm run clean    # Remove build artifacts and temp files
   ```

Common operations are also available via `make` (see [Makefile](Makefile)).

See [`docs/DEV_SETUP.md`](docs/DEV_SETUP.md) for full details including Docker, Python agents, CLI scripts, and Jupyter notebooks.

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, architectural planes, tool catalog, orchestration patterns |
| [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) | Complete REST API endpoint catalog (21 endpoints) |
| [`docs/DEV_SETUP.md`](docs/DEV_SETUP.md) | Local development setup, Docker, CLI scripts, troubleshooting |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Branching model, commit conventions, code review |

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for branching, commit conventions, and code review guidelines.

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE) for details.
