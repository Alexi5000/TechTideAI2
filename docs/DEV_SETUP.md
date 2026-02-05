# DEV_SETUP

Windows local development setup.

**Prereqs**
- Node 20.x
- pnpm 9.x+
- Python 3.11+
- Supabase CLI (for local DB)

**Install pnpm**
- `npm install -g pnpm`

**Install deps**
- `pnpm install`

**Run**
- Frontend: `pnpm -C frontend dev`
- Backend: `pnpm -C backend dev`
- Agents (Mastra dev server): `pnpm -C agents dev`

**Environment**
- Backend env template: `backend/.env.example`
- Frontend env template: `frontend/.env.example`
- Agents env template: `agents/.env.example`

**Supabase**
- Local config lives in `database/supabase`
- Initialize or start via Supabase CLI with `--workdir database` if needed

**Python tools (LangGraph/LangChain)**
```
cd agents/python
python -m venv .venv
. .venv/Scripts/activate  # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -e .[dev]
python -m techtide_agents.graph
```
