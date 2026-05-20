# TechTideAI

![TechTideAI agent operating system](assets/techtideai_hero_2026.png)

**TechTideAI** is a company-scale AI agent operating system for building, operating, and evaluating production agent teams. It combines a React operator console, Fastify orchestration APIs, Mastra TypeScript agents, provider adapters, Supabase persistence, Weaviate retrieval, and Python graph tools.

The repo is designed around one standard: agent systems that ship. Every major surface should be typed, observable, testable, and reviewable.

## What This Is

TechTideAI models a working company as an agent system:

- A CEO agent and Agent 0 coordinate goals, risk, and routing.
- Domain orchestrators own business functions.
- Worker pods execute scoped tasks through tools and provider adapters.
- The backend records runs, events, knowledge artifacts, and operational evidence.
- The frontend gives operators a clear console for reviewing activity and system state.

## Why It Exists

Production AI needs more than prompts. Teams need agent registries, execution boundaries, API contracts, evaluation fixtures, memory surfaces, human approval paths, and logs that explain what happened.

TechTideAI is built as an engineering harness for those ideas: a product shell, an orchestration backend, an agent runtime, provider adapters, database infrastructure, and docs that make the system understandable to future maintainers.

## Architecture

```text
Operator Console
  -> Fastify Backend API
  -> Agent Runtime
       -> Mastra agents
       -> provider adapters
       -> tool registry
       -> evaluation utilities
  -> Supabase data plane
  -> Weaviate evidence plane
  -> Python LangGraph tools
```

## System Layers

| Layer | Purpose |
| --- | --- |
| Control plane | CEO agent, Agent 0, orchestrators, objectives, risk tiers, and routing decisions. |
| Execution plane | Worker pods, provider calls, MCP-style tools, workflow runs, and artifacts. |
| Evidence plane | Run events, knowledge records, vector search, citations, metrics, and audit-ready traces. |
| Product plane | React console for operators to inspect agents, runs, status, and outputs. |

## Stack

| Area | Technology |
| --- | --- |
| Frontend | React, Vite, Tailwind, TypeScript |
| Backend | Fastify, TypeScript, Zod |
| Agents | Mastra, TypeScript, structured tools |
| Provider adapters | OpenAI and Anthropic SDK wrappers |
| Python agents | LangGraph, LangChain, pytest, ruff |
| Data | Supabase, Weaviate |
| Quality | pnpm workspaces, Vitest, ESLint, TypeScript builds |

## Quick Start

```powershell
git clone https://github.com/Alexi5000/TechTideAI2.git
cd TechTideAI2
pnpm install
```

Run local services:

```powershell
pnpm run dev:backend
pnpm run dev:frontend
pnpm run dev:agents
```

Run quality gates:

```powershell
pnpm run verify
```

## Environment

Environment templates live near the services that consume them:

| File | Purpose |
| --- | --- |
| `backend/.env.example` | API, database, provider, and vector settings. |
| `frontend/.env.example` | Operator console API configuration. |
| `agents/.env.example` | Agent runtime and backend API settings. |

Secrets should stay local or in deployment secret stores. Do not commit API keys.

## Repository Map

| Path | Purpose |
| --- | --- |
| `frontend/` | Operator console for agents, runs, and system state. |
| `backend/` | Fastify orchestration API, routes, repositories, services, and tests. |
| `agents/` | Agent registry, Mastra runtime, tools, prompts, memory, monitoring, and eval code. |
| `apis/` | Provider adapters and retry-capable SDK wrappers. |
| `agents/python/` | Python LangGraph and LangChain tooling. |
| `database/` | Supabase and Weaviate configuration. |
| `docs/` | Architecture, development setup, and quality gates. |
| `assets/` | Repo-owned README graphics. |

## Quality Gates

| Command | Scope |
| --- | --- |
| `pnpm run build` | Build all TypeScript workspaces. |
| `pnpm run lint` | Lint all TypeScript workspaces. |
| `pnpm run test` | Run all Vitest workspaces. |
| `pnpm run verify` | Run lint, tests, and builds as a release gate. |

Python checks:

```powershell
cd agents/python
python -m pip install -e .[dev]
python -m pytest
python -m ruff check .
```

See [Quality Gates](docs/QUALITY_GATES.md) for the full review standard.

## Operating Principles

- Typed contracts over prompt soup.
- Logs and traces over vibes.
- Human approval where risk matters.
- Provider adapters behind clear interfaces.
- Evidence records for every important decision.
- Small, reviewable changes over giant unowned drops.

## License

MIT.
