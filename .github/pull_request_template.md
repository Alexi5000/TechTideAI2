## What

<!-- Brief description of the change -->

## Why

<!-- Link to issue/discussion or explain motivation -->

## How

<!-- Implementation approach, key decisions -->

## Workspaces affected

- [ ] `frontend/`
- [ ] `backend/`
- [ ] `agents/`
- [ ] `apis/`
- [ ] `database/`
- [ ] `agents/python/`

## Checklist

- [ ] Types compile (`pnpm -C <workspace> exec tsc --noEmit`)
- [ ] Lint passes (`pnpm -r lint`)
- [ ] Tests pass (`pnpm -r test`)
- [ ] API changes reflected in `frontend/src/lib/api-client.ts` types
- [ ] Agent capability changes reflected in `agents/agents.md` / `agents/tools/*.md`
- [ ] Migration tested locally (`supabase db reset --workdir database`)
