# Sprint Contracts

Versioned, JSON-form sprint contracts that drive the **three-agent harness** (Planner → Generator → Evaluator with adversarial feedback loop). See `docs/adr/0006-three-agent-harness.md` for the design.

## Schema

```json
{
  "id": "well-scoped-sprint",
  "name": "Well-scoped sprint",
  "version": "v1.0.0",
  "description": "A small adversarial-feedback example. ...",
  "publishedAt": "2026-06-23T00:00:00.000Z",
  "prompt": "Write a one-paragraph product brief for ...",
  "generatorAgentId": "orch-ava",
  "evaluatorAgentId": "orch-audit",
  "acceptanceCriteria": [
    "Names the target user explicitly",
    "Names a measurable outcome",
    "Stays under 200 words",
    "Mentions at least one risk"
  ],
  "scorers": [
    { "kind": "llm-judge", "weight": 0.5, "passThreshold": 0.7, "options": { "judgeModel": "gpt-4o" } },
    { "kind": "rubric-weighted", "weight": 0.3, "passThreshold": 0.6, "options": {} },
    { "kind": "four-axis-grader", "weight": 0.2, "passThreshold": 0.7, "options": {} }
  ],
  "passThreshold": 0.7,
  "maxIterations": 3,
  "plateauWindow": 2,
  "plateauTolerance": 0.02,
  "contractVersion": "sprint-contract-v1"
}
```

Validated in `backend/src/domain/entities/sprint-contract.ts` (Zod).

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Stable id. Bump `version` to publish a new sprint. |
| `contractVersion` | no, default `sprint-contract-v1` | Bump on incompatible schema changes. |
| `generatorAgentId` | yes | Must resolve via `getAgentById`. |
| `evaluatorAgentId` | yes | Same. Should be a different agent from the generator. |
| `acceptanceCriteria` | yes, 3-7 items | The Generator is graded against these. |
| `scorers` | yes, ≥1 | The Evaluator runs each scorer. Same shape as `EvalSuite.scorers`. |
| `passThreshold` | no, default 0.7 | Headline pass threshold; the four-axis grader uses per-axis thresholds. |
| `maxIterations` | no, default 5 | Hard cap. |
| `plateauWindow` | no, default 2 | Stop if the latest `window` scores don't improve within `plateauTolerance`. |
| `plateauTolerance` | no, default 0.02 | Score spread below which the run is considered stagnant. |

## Adding a contract

1. Pick an id (kebab-case, e.g. `pricing-memo-v1`).
2. Choose a generator + evaluator pair. The evaluator should be a different agent from the generator, the harness passes the generator's output to the evaluator, so an LLM-as-judge bias toward a peer agent is a real risk.
3. Write 3-7 acceptance criteria. The rubric-weighted scorer grades each one.
4. Pick scorers. The default set is `llm-judge` + `rubric-weighted` + `four-axis-grader`. Drop `four-axis-grader` for tasks where the four axes don't make sense (e.g. translation).
5. Run `pnpm -C backend sprint --contract evals/sprints/<id>.v1.json`. The CLI prints the iteration table.

## How "pass" works

A sprint passes when:

1. The loop ran at least one iteration,
2. The best iteration's headline score meets `passThreshold`,
3. The four-axis grader (if used) had no axis below its per-axis threshold.

A sprint fails when:

- The loop hit `maxIterations` without crossing the threshold, **or**
- The Evaluator errored on every iteration, **or**
- The Generator returned a hard error on every iteration.

A sprint "plateaus" when the running score didn't improve within `plateauWindow` and `plateauTolerance`. This is reported separately from "failed" so the dashboard can distinguish "we tried and gave up" from "we tried and ran out the clock."

## Cost guardrails

Each iteration runs every scorer against the generator's output. A 5-iteration sprint with `llm-judge` + `rubric-weighted` + `four-axis-grader` costs roughly $0.02-$0.05 against gpt-4o. Plan nightly sprints to stay under $1/day.
