# DEV_SETUP

Windows local development setup.

**Prereqs**
- Node 20.x
- pnpm 9.x+
- Python 3.11+
- Supabase CLI (for local DB)
- Docker (optional, for containerized deployment)

**Install pnpm**
- `npm install -g pnpm`

**Install deps**
- `pnpm install`

**Run**
- Frontend: `pnpm -C frontend dev` (http://localhost:5180)
- Backend: `pnpm -C backend dev` (http://localhost:4050)
- Agents (Mastra dev server): `pnpm -C agents dev`

**Environment**
- Root env template: `.env.example` (consolidated)
- Backend env template: `backend/.env.example`
- Frontend env template: `frontend/.env.example`
- Agents env template: `agents/.env.example`
- Set `API_KEY` in the backend env and `VITE_API_KEY` / `BACKEND_API_KEY` for client + agent access.
- `DEFAULT_ORG_ID` controls the org used when an API request omits `orgId`.
- `MASTRA_TOOL_POLICY` controls agent tool access (`shared` or `strict`) in the Mastra runtime.
- For vector search, set `WEAVIATE_URL` and `OPENAI_API_KEY` in backend env.
- For agent knowledge tools, set `BACKEND_API_BASE_URL` in the agents env (defaults to `http://localhost:4050`).

**Supabase**
- Local config lives in `database/supabase`
- Initialize or start via Supabase CLI with `--workdir database` if needed

**Weaviate**
- Vector store config lives in `database/weaviate`
- Start via `docker compose -f database/weaviate/docker-compose.yml up -d`

**Python tools (LangGraph/LangChain)**
```
cd agents/python
python -m venv .venv
. .venv/Scripts/activate  # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -e .[dev]
python -m techtide_agents.graph
```

**Docker**
```bash
# Build container
docker build -t techtideai .

# Run with env file
docker run --env-file .env -p 4050:4050 techtideai

# Or use Make
make docker-build
make docker-run
```

**CLI Scripts**
```bash
# Run an agent
npx tsx scripts/run-agent.ts --agent ceo --prompt "What are our priorities?"

# Evaluate agents
npx tsx scripts/evaluate-agent.ts --dataset data/eval/ceo-basic.json

# Generate evaluation dataset
npx tsx scripts/generate-eval-dataset.ts --agent ceo --output data/eval/ceo-generated.json

# Memory operations
npx tsx scripts/populate-memory.ts --file data/memory-entries.json
npx tsx scripts/delete-memory.ts --agent ceo
```

**Notebooks**
```bash
pip install jupyter requests
jupyter notebook notebooks/
```

**Makefile**

Common operations are available via `make`:
```bash
make install    # pnpm install
make build      # Build all packages
make test       # Run all tests
make lint       # Lint all packages
make dev        # Start backend + frontend
make clean      # Remove dist/ directories
```
