# ADR 0008, Notebooks are authoring surfaces, not runtimes

- **Status:** Accepted
- **Date:** 2026-06-23
- **Deciders:** TechTideAI platform team
- **Supersedes:** none

## Context

The PDF on FDE-aligned harness engineering is right that notebooks are excellent for authoring and iteration but are a poor runtime for production agent systems. The two failure modes:

1. **Notebook-as-runtime.** A 200-line `*.ipynb` becomes the only path to running the agent. It is hard to review (JSON), hard to test (no headless runner that doesn't open Jupyter), and hard to compose with typed contracts.
2. **No notebooks at all.** A team that doesn't allow notebooks loses the easiest surface for *iterating* on prompts, rubrics, and golden tasks. Without that surface, the eval suite is frozen.

We needed both: the iteration affordance of notebooks, and the discipline of typed contracts. The trap is letting one notebook become "the way we run the agent."

## Decision

We ship a **notebook authoring surface**, not a notebook runtime:

- Three hand-written `*.ipynb` files under `notebooks/`:
  - `01_author_golden_task.ipynb`, walk a new task from idea to fixture.
  - `02_iterate_prompt.ipynb`, score a candidate prompt against an existing fixture.
  - `03_audit_run.ipynb`, pull a run by id and inspect per-scorer breakdown.
- A single Python file (`notebooks/_bridge.py`) that re-exports `techtide_agents.notebook_bridge`. The bridge is a thin typed HTTP client around `/api/evals/*`, the *real* runtime is the backend.
- A `scripts/convert-notebooks.py` script that emits a sibling `*.py` for every `*.ipynb`. The `.py` is what reviewers see in PRs; the `.ipynb` is the authoring surface.
- A CI workflow (`.github/workflows/notebooks.yml`) that runs `jupyter nbconvert --execute` on the audit notebook (which needs no LLM) and AST-parses every emitted `.py`.

The bridge is the only Python file in `notebooks/` that is real code. The notebooks are interactive recipes.

## The review rule

> The `.py` is the artifact under review. The `.ipynb` is the authoring surface.

PR reviewers see Python. If a notebook needs to change, the author re-runs `scripts/convert-notebooks.py` and commits both. The CI `--check` flag fails the build if any `.py` is stale.

## Why a typed HTTP client, not a direct import

The eval harness runs in the backend process (TypeScript on Node 20); the notebook runs in the user's local Jupyter kernel. Bridging over HTTP keeps the runtime boundary clean: the notebook never imports a TS module, and the backend never has to ship a Python wheel. The trade-off is one network round-trip per notebook cell; the audit notebook has four cells, so the cost is negligible.

## What we are not allowing

- **A notebook that runs the eval harness directly.** The runtime is the backend, not the notebook.
- **A notebook that calls a different LLM provider than the rest of the harness.** All LLM calls go through `apis/` adapters. A notebook that wants to score a prompt opens an `EvalRun` via the bridge.
- **A notebook that is the *only* way to reproduce a result.** Every notebook's primary output (a new task, a refined prompt, a run audit) is committed to the repo as a fixture, a prompt edit, or a post-mortem respectively.

## Consequences

Positive:

- Iteration is fast. The author's local kernel is the iteration surface; the CI smoke test catches breakage.
- Reviewers see Python. The harness contract is enforced (typed bridge, typed fixtures) without sacrificing the notebook affordance.
- Cost is bounded: only the `02_iterate_prompt` notebook hits an LLM, and only when the author explicitly triggers a run.

Negative:

- One more file system surface. The contributor has to learn the bridge's vocabulary (`EvalRun`, `ScoringBreakdown`).
- The conversion script is bespoke. A future refactor might use `nbconvert` directly.

## Alternatives considered

- **No notebooks.** Rejected: the iteration affordance is real.
- **Notebooks as the only iteration surface (no Python or fixture files).** Rejected: the harness contract must be the source of truth.
- **Use `jupytext` to round-trip the `.ipynb` ↔ `.py` representation.** Considered; deferred. Today's hand-rolled `convert-notebooks.py` is honest about its limits (it doesn't execute cells, just emits text).
