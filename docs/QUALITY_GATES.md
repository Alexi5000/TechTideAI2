# Quality Gates

> The single source of truth for what "done" looks like in this repo. Every
> agent working in `techtideai` (human or otherwise) is expected to clear
> every gate below before claiming a change is complete.

## 1. The release gate

`pnpm run verify` is the only command that opens a PR for merge. It runs,
in order, across every TypeScript workspace (`backend`, `agents`, `apis`,
`frontend`):

1. **Lint** — `eslint .` (workspace-scoped).
2. **Test** — `vitest run` (workspace-scoped; the frontend intentionally
   has no unit tests — see §6).
3. **Build** — `tsc -b` for `backend` / `agents` / `apis`, and `tsc -b`
   for `frontend`.

CI runs the same command and rejects any PR whose `verify` step is red.

## 2. The Python gate

`agents/python` has its own test suite and a separate release gate:

```bash
cd agents/python
pip install -e ".[dev,server]"
pytest          # 28+ tests across langgraph runtime, dispatcher, contract sync, LLM
ruff check .
```

The Python suite is the second merge gate and runs in CI
(`.github/workflows/ci.yml` matrix includes a `python` job).

## 3. The contract gate

The TypeScript and Python runtimes share a single contract. The drift-check
hash embedded in both generated files is asserted at runtime:

```bash
pnpm tsx scripts/sync-contracts.ts   # regenerates and asserts hash equality
pytest agents/python/tests/test_contract_sync.py   # the Python side of the same check
```

To add a new contract type: edit `contracts/schema.json`, run
`sync-contracts.ts`, commit the regenerated files in the same PR. Hand-edit
to either generated file fails CI.

## 4. The eval gate

Any change to agent behavior must ship with an eval entry. The eval CLI is
the eval harness plus the golden suite:

```bash
pnpm -C backend evals --suite golden-tasks.v1
```

This writes `docs/EVALS/latest.json` and a per-run summary. The harness
throws `EvalRegressionDetectedError` if the pass-rate drops more than
`EVAL_REGRESSION_THRESHOLD_PCT` (default 5%) versus the latest baseline.

A change that improves correctness should bump the baseline explicitly:

```bash
pnpm -C backend evals --suite golden-tasks.v1 --update-baseline
```

## 5. The "do not touch" zones

The following surfaces are deliberately hard to change. If a task asks you
to modify them, push back, write an ADR, and surface the tradeoff.

- **`run_events` is append-only.** Every state transition emits a
  `RunEvent`. The table is the audit log. Adding `UPDATE` paths is a
  security regression; an `event_type` enum is the only legitimate change.
- **Status transitions are policy-gated.** `StatusTransitionPolicy` is the
  single source of truth for legal transitions. Extend it via `extend()`
  (OCP), never by mutating the default.
- **The approval gate is OCP-extended, never mutated.** The
  `ApprovalPolicy` decides which actions need human review. Adding tiers
  is fine; bypassing the policy is not.
- **The contract is the seam.** If you find yourself adding a
  framework-specific type to `IAgentRuntime` or `AgentRunResult`, stop and
  add it to `contracts/schema.json` first.
- **The 61-agent invariant is enforced.**
  `agents/src/core/registry.test.ts` asserts `1 ceo + 10 orchestrators +
  50 workers (5 per orchestrator)`. Don't add a worker without a
  5-sibling pod, don't add an orchestrator without updating both the
  test and `agents/runtime_config.yaml`.

## 6. Test coverage decision matrix

| Workspace | Unit tests | Integration tests | Why |
|---|---|---|---|
| `backend` | Vitest | The eval harness | The eval harness exercises every public surface. |
| `agents` | Vitest | TypeScript contract tests | Runtime types must match the contract. |
| `apis` | Vitest | Mock provider tests | Provider adapters are pure IO; mocks suffice. |
| `agents/python` | pytest | Pytest fixtures | LangGraph runtime is best tested in Python. |
| `frontend` | **None** | Manual QA + the eval suite | The frontend is a thin operator console for an internal FDE. End-to-end behavior is exercised by the backend + agent evals. Unit-testing JSX components would add maintenance burden without catching bugs the eval suite already catches. |

The `frontend` decision is documented here so reviewers can ask the right
question instead of "where are the frontend tests?"

## 7. Review checklist

A reviewer should be able to tick every box before approving a PR:

- Public API changes include Zod validation and tests.
- Agent tool changes include input/output schemas and focused tests.
- Provider adapter changes include retry and error-path coverage.
- UI changes include loading, empty, and failure states.
- Database changes document migration and rollback expectations.
- Docs and README match the commands and ports in the repo.
- Large feature work is split into reviewable PRs with narrow ownership.

## 8. Operating principles

These are the principles the rest of the rules instantiate. They are the
"why" of the gate, not a checklist.

- **Prefer OCP-friendly extensions over mutation.** The registry, policy,
  and scorer patterns exist for a reason.
- **Read `AGENTS.md` on session start.** Update it (and the matching ADR)
  when the architecture changes.
- **Update `evals/fixtures/` when you add an agent capability.** The eval
  suite is the documentation of what the system does.
- **Be honest in docs.** The README, ADRs, and benchmark doc say what is
  real. Aspirational copy is a bug.

## 9. Release checklist

- `pnpm run verify` passes.
- `pytest` passes when `agents/python` changed.
- Contract sync check passes (`pnpm tsx scripts/sync-contracts.ts`).
- No secrets are committed.
- README, architecture docs, and env templates are current.
- Generated assets live in `assets/` and are referenced by docs.
- Any skipped checks are understood and documented in the release notes.

## 10. Where to ask questions

| Question | File |
|---|---|
| What is this repo? | `README.md` |
| How do I work in this repo? | `AGENTS.md` |
| Why was this choice made? | `docs/adr/0001-…` through `docs/adr/0009-…` |
| How is the eval suite structured? | `docs/EVALS.md`, `backend/src/services/eval-harness.ts` |
| How does the Python runtime work? | `docs/PYTHON_RUNTIME.md`, `agents/python/src/techtide_agents/runtime/` |
| What changed in version X? | `CHANGELOG.md` |
| What can this system do compared to reference harnesses? | `docs/BENCHMARK.md` |
| What is the human-in-the-loop surface? | `docs/adr/0004-approval-as-execution-boundary.md`, `backend/src/services/approval-service.ts` |