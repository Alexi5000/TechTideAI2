# Contributing to TechTideAI

## Getting Started

1. Clone the repository
2. Follow the setup guide in [`docs/DEV_SETUP.md`](docs/DEV_SETUP.md)
3. Create a feature branch from `main`

## Branching Model

All changes go through pull requests against `main`. There is no long-lived development branch.

```
main ← feat/your-feature
main ← fix/your-bugfix
main ← docs/your-docs-update
```

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/). PR titles are validated by CI (`pr.yml`).

| Prefix | Usage |
|--------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Build, CI, tooling, or dependency changes |
| `ci` | CI/CD pipeline changes |

Optional workspace scope: `feat(backend): add monitoring endpoint`

## Development Workflow

```bash
pnpm install                  # install all workspaces
pnpm -C backend dev           # backend on :4050
pnpm -C frontend dev          # frontend on :5180
pnpm -C agents dev            # Mastra dev server
```

Before submitting a PR:

```bash
pnpm -r run lint              # ESLint + Prettier (TS), Ruff (Python)
pnpm -r test                  # Vitest (TS), Pytest (Python)
pnpm -r run build             # TypeScript compilation
```

## Code Conventions

- **Files**: kebab-case (`agent-execution-service.ts`)
- **Interfaces**: `I` prefix (`IRunService`, `IRunRepository`)
- **Errors**: `Error` suffix (`AgentNotFoundError`)
- **Validation**: Zod schemas for env config, route params, and tool I/O
- **Barrel exports**: Every package and sub-module has an `index.ts` re-exporting its public API

## Testing

- **TypeScript**: Vitest in all packages. Config per-package (`vitest.config.ts`).
- **Python**: Pytest + Ruff. Config in `agents/python/pyproject.toml`.
- Backend integration tests use `app.inject()` for HTTP-level testing without starting a real server.

## Documentation

When changing agent capabilities, update:
- Tool specs in `agents/tools/*.md`
- Agent behavioral specs in `agents/agents.md`
- Skill definitions in `agents/skills/*.md`
- System architecture in `docs/ARCHITECTURE.md`

## Cross-Workspace Concerns

- Frontend types in `frontend/src/lib/api-client.ts` are duplicated from backend — keep both in sync when changing API shapes.
- Domain errors in `backend/src/domain/exceptions/` map to HTTP status codes in route handlers.
- The agent registry in `agents/src/core/registry.ts` is the source of truth for agent identity.

## Pull Request Checklist

See [`.github/pull_request_template.md`](.github/pull_request_template.md) for the full checklist. Key items:

- [ ] TypeScript compiles without errors
- [ ] Lint and tests pass
- [ ] API type changes are synced between backend and frontend
- [ ] Agent/tool docs are updated if capabilities changed
- [ ] Database migrations tested locally if applicable
