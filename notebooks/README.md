# Notebooks

Authoring surface for golden tasks, prompts, and rubrics. Notebooks are reviewed as `*.py` (see `scripts/convert-notebooks.py`); the runtime is the backend's eval harness, not the notebook itself.

## Files

| File | Purpose | Cost |
|---|---|---|
| `01_author_golden_task.ipynb` | Walk a new task from idea to fixture. | Free (no LLM). |
| `02_iterate_prompt.ipynb` | Score a candidate prompt against a fixture. | $0.30–$0.80/run. |
| `03_audit_run.ipynb` | Pull a run by id and inspect per-scorer breakdown. | Free (no LLM). |
| `_bridge.py` | Re-export of `techtide_agents.notebook_bridge`. |, |

## How the surface works

```
notebooks/*.ipynb  ── (you edit) ──►  notebooks/*.py  (review)
                          │
                          └─►  backend /api/evals/*  (the actual runtime)
```

- The `*.ipynb` is the authoring surface. It is JSON, can be opened in Jupyter, and is what you commit.
- The `*.py` is the reviewable artifact. `scripts/convert-notebooks.py` regenerates it on demand. PR reviewers see Python, not JSON.
- The backend's eval harness is the runtime. Notebooks talk to it over HTTP via `notebooks._bridge` (a thin client around `/api/evals/*`).

## When to use a notebook

- **Authoring a new golden task.** Edit the schema, paste it into the fixture file, run the eval. The notebook is the version-controlled record of "what we tried and what worked."
- **Iterating a prompt.** Score your candidate against an existing fixture, see the breakdown, edit, re-score. Loop 5-10 times. After that, copy the winning prompt into the agent's prompt file and move on.
- **Auditing a run.** When a regression fires, open the run in the notebook, drill into the per-scorer breakdown, find the failing axis, write a follow-up task.

## When NOT to use a notebook

- **As a runtime for agents.** The harness never runs a notebook. The runtime is the backend.
- **To share with end users.** Notebooks are authoring surfaces for the team that owns the harness.
- **For any workflow that already has a CLI or a route.** If `pnpm -C backend evals` or `POST /api/evals/run` does the job, use those.

## Conversion

```bash
# Regenerate sibling .py for every .ipynb
python scripts/convert-notebooks.py

# Verify the .py parses (CI smoke test)
python -c "import ast; ast.parse(open('notebooks/01_author_golden_task.py').read())"
```

The CI workflow `.github/workflows/notebooks.yml` runs the smoke test on every PR.

## Why this is a separate surface

The PDF on FDE-aligned harnesses is right: notebooks are excellent for authoring and poor as a runtime. The trap is letting one notebook become "the way we run the agent." A 200-line `*.ipynb` in version control is fine. A 200-line `*.ipynb` that is the only path to production is a smell. ADR 0008.
