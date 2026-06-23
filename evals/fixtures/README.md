# Eval Fixtures

This directory holds versioned, deterministic-or-rubric eval tasks. The eval harness reads `golden-tasks.v1.json` by default.

## Schema

A suite is a JSON document:

```json
{
  "id": "golden-tasks",
  "name": "Golden Tasks v1",
  "version": "v1.0.0",
  "description": "...",
  "publishedAt": "2026-06-22T00:00:00.000Z",
  "scorers": [
    { "kind": "json-schema", "weight": 0.3, "passThreshold": 0.7, "options": {} },
    { "kind": "llm-judge", "weight": 0.7, "passThreshold": 0.7, "options": { "judgeModel": "gpt-4o" } }
  ],
  "tasks": [
    {
      "id": "...",
      "agentId": "...",
      "tier": "ceo | orchestrator | worker",
      "category": "format-compliance | domain-reasoning | tool-use | memory-recall | multi-step",
      "difficulty": 1 | 2 | 3,
      "input": { "...": "..." },
      "expected": {
        "exact": "...",          // for exact-match scorer
        "regex": "...",          // for regex scorer
        "jsonSchema": { "..." }, // for json-schema scorer
        "rubric": "...",         // for llm-judge scorer
        "assertions": ["..."]    // for rubric-weighted scorer
      },
      "rubric": "...",
      "tags": ["..."],
      "timeoutMs": 30000
    }
  ]
}
```

The schema is validated in `backend/src/domain/entities/eval-task.ts` and `eval-suite.ts` (Zod).

## Adding a task

1. Pick the next available ID. For the v1 suite, IDs are `<agent-or-domain>-<short>`.
2. Decide what scoring you want:
   - **json-schema**, output must be a JSON object matching a schema. Use for format-compliance tasks.
   - **llm-judge**, open-ended output graded by a separate LLM with a rubric. Use for domain-reasoning.
   - **rubric-weighted**, list concrete `assertions` and grade each. Use for multi-step tasks with multiple claims.
3. Pick a category and difficulty. Difficulty 3 means the task requires composition or tradeoffs.
4. Write the rubric as if you were briefing a smart non-expert. The judge reads it.
5. Add the task to the suite's `tasks` array. Bump `version` if it's a new suite; otherwise add in-place.
6. Run `pnpm -C backend evals --suite <id>` to validate it.

## Suite versions

A suite's `version` is bumped whenever the suite schema or the rubric design changes incompatibly. Old versions stay on disk so baselines can be replayed. The eval CLI accepts `--baseline v0.1.0` to compare against a frozen suite.

## What "pass" means

A task `passes` when the weighted score across all scorers meets the per-scorer `passThreshold` and every scorer's individual `passed` flag is true. The harness exposes the per-scorer breakdown on every `EvalTaskResult` so you can see exactly which scorer marked it down.

## Cost guardrails

The harness estimates cost at $0.005 / 1k tokens. A full v1 suite against the default Mastra runtime should fit comfortably under $1. The CI evals workflow runs the suite nightly and posts results as a workflow artifact. PR-triggered runs are intentionally off, see `docs/EVALS.md` for the rationale.
