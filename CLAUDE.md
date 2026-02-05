# CLAUDE.md

This repository is a mono-repo for TechTideAI with a single `src` convention and multiple top-level modules:

- `frontend/` React + Tailwind + shadcn-lite UI
- `backend/` Node/TypeScript API + orchestration services
- `database/` local DB tooling, migrations, and schema docs
- `apis/` external API adapters
- `agents/` agent specs, skills, tools, and runtime wrappers

## Code Agent SDK Guidance

We use both:
- Claude Code Agent SDK for agent orchestration and tools
- OpenAI SDK for model access and supplemental agent capabilities

### General Rules
- Keep agent prompts in `agents/agents.md` and skills in `agents/skills/*.md`.
- Keep tool definitions in `agents/tools/*.md`.
- Prefer TypeScript for backend orchestration, Python for specialized tools.
- Avoid mixing runtime responsibilities: adapters in `apis/`, business logic in `backend/`.
- Keep docs in `docs/` and update them when structures change.

### Defaults
- Node: 20.x
- TypeScript: strict mode
- Test runner: Vitest for TS, Pytest for Python
- Lint: ESLint + Prettier; Ruff for Python

## Local Dev
- Windows-first setup
- All commands documented in `docs/DEV_SETUP.md`
