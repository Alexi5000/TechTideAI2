# Eval Methodology

> The eval harness is the product's quality contract. Every change to prompts, models, or tool wiring must be measurable here. If you can't measure it, you can't claim it works.

## What the harness does

For every task in a suite, the harness:

1. Calls `IAgentRuntime.execute({ agentId, input })`.
2. Routes the agent's output through **every registered scorer** (deterministic + LLM).
3. Aggregates the per-scorer results into a weighted score in `[0, 1]`.
4. Records the run in the eval-run repository (Supabase in production, in-memory in tests).
5. Compares the run against the chosen **baseline** and emits a regression if pass-rate dropped more than `EVAL_REGRESSION_THRESHOLD_PCT` (default 5%).

The run is the system of record. A run contains: model versions, scorer versions, every per-task breakdown, latency, cost estimate, regression delta. Nothing is left to inference.

## Scorers

| Kind            | Cost    | Use for                              | Notes |
|-----------------|---------|--------------------------------------|-------|
| `exact-match`   | free    | Deterministic golden outputs         | JSON-stringify normalizes objects; truncation preserves signal in `rationale`. |
| `regex`         | free    | Tokens / phrases that must appear    | Multiline flag on. |
| `json-schema`   | free    | Format compliance                    | Hand-rolled minimal subset (object/array/string/number/boolean + required + enum + pattern + items + min/max). |
| `llm-judge`     | $$      | Open-ended outputs graded by rubric  | `temperature: 0`, versioned prompt (`judge-v1`), Zod-validated output. |
| `rubric-weighted` | $$    | Multi-claim tasks                    | Each `assertions[]` entry graded independently; score = satisfied / total. |

Each scorer returns a `ScoringBreakdown` so the dashboard can show exactly **which scorer marked this down**. There is no global score; the harness computes a weighted average.

### What "pass" means

A task passes when **every scorer's** individual `passed` flag is true. The weighted aggregate is for ranking / regression detection, not for the binary pass.

### Why we hand-rolled the JSON-schema scorer

We deliberately did not pull in `ajv` to keep the eval path dependency-light and deterministic. The schema subset covers every fixture in `evals/fixtures/`. If you need a fuller subset, add it to `backend/src/services/scoring/json-schema.ts` — the function is small enough to read in one screen.

## Fixtures

Fixtures live in `evals/fixtures/*.json` and are validated against the Zod schema in `backend/src/domain/entities/eval-task.ts` and `eval-suite.ts`. The canonical suite today is `golden-tasks.v1.json` — **33 tasks** spanning the CEO + all 10 orchestrators. Difficulty is 1-3; category is `format-compliance`, `domain-reasoning`, `tool-use`, `memory-recall`, or `multi-step`.

To add a task:

1. Pick the next ID. For v1 it's `<agent-or-domain>-<short>`.
2. Decide what scoring you want. Format-compliance → json-schema. Domain-reasoning → llm-judge with rubric. Multi-claim → rubric-weighted with assertions[].
3. Write the rubric as if briefing a smart non-expert. The judge reads it.
4. Add to the suite's `tasks` array. Bump `version` if it's a new suite.
5. Run `pnpm -C backend evals --suite golden-tasks.v1` to validate.

## Baseline discipline

Every published suite has a baseline run recorded under `docs/EVALS/`. The eval CLI's `--baseline` flag defaults to `latest`. To freeze a baseline:

```bash
pnpm -C backend evals --suite golden-tasks.v1 --write-docs
git add docs/EVALS/latest.json
git commit -m "evals: freeze baseline for v1.0.0"
git tag -a evals-v1.0.0 -m "v1.0.0 baseline"
```

The `--baseline` flag accepts `latest`, `none`, or a specific `EvalRun.id`.

## Cost guardrails

| Suite            | Tasks | Est. cost / run (gpt-4o + gpt-4o judge) |
|------------------|------:|----------------------------------------:|
| `golden-tasks.v1` | 33   | $0.30 - $0.80                          |

The harness estimates cost at `$0.005 / 1k tokens` for OpenAI-class models. Replace with `LlmResponse.usage` once the provider adapters surface it.

## CI policy

- **PRs do not run evals** (cost guard). PRs run `pnpm run verify` (lint + tests + build) only.
- **Nightly** runs the eval suite and posts results to `docs/EVALS/<date>.json` as a workflow artifact. Failures open a [Eval Result Report](../../.github/ISSUE_TEMPLATE/eval-result.yml).
- **Manual dispatch** is available for pre-release validation. Use the `Run eval suite` action in the Actions tab.

## Reading a regression

When `passRate` drops by more than `EVAL_REGRESSION_THRESHOLD_PCT` (default 5%), the harness throws `EvalRegressionDetectedError` and exits non-zero. The CLI prints the per-task breakdown so you can see exactly which tasks regressed. Common causes:

1. **Model bump.** The most common. Check `modelVersions` on the failing run vs the baseline.
2. **Prompt change.** Check git blame on the affected agent's prompt.
3. **Tool wiring regression.** A tool returned a different shape and a downstream judge mis-fired.
4. **Scorer bump.** Rare; we version scorers (`SCORER_VERSIONS` in `services/scoring/index.ts`).

## What we don't do (yet)

- **Adversarial test generation.** Rubrics and assertions are hand-written. Worth adding when the suite crosses ~100 tasks.
- **Statistical significance checks.** With ~30 tasks per suite, run-to-run variance from the judge dominates. We treat any regression ≥ 5% as actionable.
- **Production-traffic replay.** The harness runs fixtures; we don't yet sample real agent traffic and grade it after the fact. Roadmap item for 0.4.
