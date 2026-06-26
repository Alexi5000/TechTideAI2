# TechTideAI 0.5.5 — first official release

**Date:** 2026-06-26
**Tag:** `v0.5.5`
**Commit:** see `git log v0.5.5 -1`

This is the first version of TechTideAI released under a SemVer tag. The harness is feature-complete, the audit is clean, the 33-task golden suite runs end-to-end, the contract drift hash matches across both runtimes, the registry test strictly enforces the 61-agent invariant, and the docs are synchronized. The version pins in `package.json`, `agents/package.json`, `backend/package.json`, `apis/package.json`, `frontend/package.json`, and `agents/python/pyproject.toml` are all `0.5.5`.

## What's in 0.5.5

- A typed, observable, testable surface around Mastra (TypeScript) and LangGraph (Python).
- A 1 + 10 + 50 agent roster: Local Group Director + 10 galaxy orchestrators + 50 star-cluster workers.
- A three-agent harness (generator, reviewer, escalator) that can produce a draft, review it against a rubric, and escalate to a human when the policy says so.
- A 33-task golden eval suite that runs end-to-end and writes `docs/EVALS/latest.json`.
- A four-axis grader + plateau scorer + per-task `scorerVersions` + 5% regression threshold.
- An append-only `run_events` audit log with a `policyVersion` stamp on every approval decision.
- An OCP-extensible `ApprovalPolicy` (immutable; `extend()` returns a new policy).
- A typed contract (`contracts/schema.json`) shared by both runtimes, with a matching FNV-1a drift hash in both generated files.
- 124 TypeScript tests + 20 Python tests, all green.
- A README that opens with the click (demo link), the eval (golden suite), and the contract (sync hash).

## Day-0 verification

| Surface | Command | Result |
|---|---|---|
| TS lint + test + build | `pnpm run verify` | 124 tests pass; build green |
| Python | `pytest` + `ruff check` + `ruff format --check` | 20 tests pass; ruff clean |
| Contract sync | `pnpm exec tsx scripts/sync-contracts.ts` | drift hash `a7e92f6b` matches both sides; idempotent |
| Eval suite | `pnpm -C backend evals --suite golden-tasks.v1 --write-docs` | 33 tasks executed; `docs/EVALS/latest.json` written |
| Mermaid + SVG | `python -c "import xml.etree.ElementTree as ET; ..."` | 16 SVGs valid; 6 Mermaid blocks in README; 0 em-dashes in README |
| Registry invariant | `pnpm -C agents test` | `toBe(10)`, `toBe(50)`, `toBe(61)` strict assertions pass |

The full audit script lives in `PRE_DEMO_AUDIT_PROMPT.md`. Five reviewer probes (the click, the eval run, the contract sync, the audit row, the ADR set) all pass.

## What the reviewer will see

- `README.md`: the wordmark + badge row, 7 in-page anchors, 23-item TOC, 26 second-level sections, 6 Mermaid diagrams, 8 image refs, 33 HTML anchor links, 7 blockquotes, 0 em-dashes.
- `docs/EVALS/latest.json`: 33 task results, a non-empty `summary` block (suiteId, suiteVersion, passRate, meanScore, latencies, cost), frozen as the 0.5.5 baseline.
- `scripts/sync-contracts.ts`: a real, idempotent sync with a matching drift hash in both generated files.
- `agents/src/core/approval-policy.ts`: the OCP `extend()` pattern, the `policyVersion` stamp, the risk-tier enum.
- `docs/adr/0001` through `docs/adr/0009`: the architectural decisions, in dependency order, each citing the code that implements it.

## How to verify locally

```bash
git checkout v0.5.5
pnpm install
pnpm run verify
cd agents/python && python -m pip install -e ".[dev,server]" && pytest && cd ../..
pnpm exec tsx scripts/sync-contracts.ts
pnpm -C backend evals --suite golden-tasks.v1 --write-docs
```

The fifth line emits `docs/EVALS/latest.json`. Compare it to the `latest.json` shipped in the tag: the runIds differ, the taskIds match, the assertion count is 33.

## Talking points

- **Why this and not LangChain / LangGraph alone?** The harness is what makes a Mastra / LangGraph system safe to ship. Contract, eval suite, audit log, approval gate.
- **Why a CEO agent and not a real human?** The CEO is a routine, not a person. The routine is "given a 33-task suite, decide which orchestrator handles which task." A human can override.
- **Why an approval gate and not a smarter agent?** "Auto-approve a vendor payment under $1,000" is a question of policy, not intelligence. The policy says so; the decision is stamped; the auditor replays.
- **Why a 33-task golden suite and not 10,000?** Every added task is a maintenance burden. The suite covers the director + every orchestrator (three tasks each).
- **Why a TS and a Python runtime, not just one?** TS is good at typed, structured tool-calling at low latency. Python is good at graph-heavy orchestrators with stateful cycles. The contract is the seam.
- **Why an append-only audit log?** The auditor reads the audit log, not the code. The log is the contract the customer signs.
- **Why is this a portfolio piece, not a product?** The success criterion is "a senior reviewer can read the repo end-to-end in one sitting and understand every architectural choice." If they can, the harness is done. If not, it's not.

## See also

- `README.md`, the pitch
- `AGENTS.md`, the procedural memory an agent reads on session start
- `docs/adr/`, the nine ADRs that explain every load-bearing decision in order
- `docs/EVALS.md`, eval methodology
- `docs/PYTHON_RUNTIME.md`, dual runtime architecture
- `docs/QUALITY_GATES.md`, what "done" means in this repo
- `docs/posts/lessons-from-building-a-company-scale-agent-os.md`, the engineering retrospective
- `CHANGELOG.md`, full version history
- `PRE_DEMO_AUDIT_PROMPT.md`, the deterministic audit script a senior engineer runs before a demo
