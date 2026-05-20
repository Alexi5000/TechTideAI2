# Quality Gates

TechTideAI is an agent platform, so the quality bar must cover product behavior, API contracts, agent runtime safety, provider boundaries, and documentation. Use this guide as the release gate and PR review checklist.

## Required Gate

```powershell
pnpm run verify
```

`verify` runs lint, tests, and builds across all TypeScript workspaces.

## Workspace Gates

| Command | Scope |
| --- | --- |
| `pnpm -C frontend build` | Operator console TypeScript and production build. |
| `pnpm -C frontend lint` | Frontend lint pass. |
| `pnpm -C backend build` | Backend TypeScript build. |
| `pnpm -C backend test` | Backend route and service tests. |
| `pnpm -C agents build` | Agent runtime TypeScript build. |
| `pnpm -C agents test` | Agent registry, prompt, memory, monitoring, orchestration, and tool tests. |
| `pnpm -C apis test` | Provider adapter and retry tests. |

## Python Gate

```powershell
cd agents/python
python -m pip install -e .[dev]
python -m pytest
python -m ruff check .
```

## Review Checklist

- Public API changes include Zod validation and tests.
- Agent tool changes include input/output schemas and focused tests.
- Provider adapter changes include retry and error-path coverage.
- UI changes include loading, empty, and failure states.
- Database changes document migration and rollback expectations.
- Docs and README match the commands and ports in the repo.
- Large feature work is split into reviewable PRs with narrow ownership.

## Release Checklist

- `pnpm run verify` passes.
- Python gate passes when `agents/python` changed.
- No secrets are committed.
- README, architecture docs, and env templates are current.
- Generated assets live in `assets/` and are referenced by docs.
- Any skipped checks are understood and documented in the release notes.
