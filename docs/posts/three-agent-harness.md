# The three-agent harness in TechTideAI

> Why a separate Planner / Generator / Evaluator loop on top of the eval harness, and how the four axes (correctness, safety, completeness, quality) replace a single headline score.

## The shape of the problem

The eval harness (Phase 1) is good at *measurement*: run a fixture, score it, compare to a baseline, alert on regression. It is one-shot. The agent gets a prompt, produces an output, gets scored, and the run is over.

That is the right shape for a benchmark. It is the wrong shape for *producing* something. If you ask the eval harness to write a one-paragraph product brief, the harness will dutifully measure the first draft and stop. The draft is what it is. There is no loop. There is no feedback. There is no "try again, this time mention a measurable outcome."

A benchmark tells you how good your agent is. A *sprint* gets the agent from "where it is" to "where you want it to be." The two are different products.

## What we built

`backend/src/services/three-agent-harness.ts` runs a SprintContract. The contract is a typed artifact (Zod-validated, versioned, JSON-form) that pins:

- a one-line prompt seed,
- a `generatorAgentId` (the agent that produces the candidate),
- an `evaluatorAgentId` (a *different* agent that grades it),
- 3-7 acceptance criteria,
- a list of scorers with per-scorer thresholds,
- a `passThreshold` for the headline,
- a `maxIterations` cap,
- a `plateauWindow` × `plateauTolerance` stop rule.

Per iteration, the harness:

1. **Generator.** Calls `IAgentRuntime.execute({ agentId: generatorAgentId, input: { prompt, feedback: <last eval rationale>, iteration } })`.
2. **Evaluator.** Calls `IAgentRuntime.execute({ agentId: evaluatorAgentId, input: { prompt, candidate, acceptanceCriteria, iteration } })`.
3. **Scorers.** Runs every scorer in the contract against the Generator's output. The `four-axis-grader` aggregates the four canonical axes. The `plateau-scorer` wrapper records whether the rolling score has stagnated.
4. **Decision.** Stop on pass / plateau / max-iterations. Otherwise, package the failed scorers' rationales into `feedback` and loop.

The harness is *evaluator-correctness > generator-cleverness*. A plateau is not a failure; it is a signal that more iteration won't help, and the dashboard distinguishes "we tried and gave up" from "we tried and ran out the clock."

## Why four axes (not a single score)

A single `score ∈ [0, 1]` is the right *metric* for ranking — pass rate, mean score, p95 latency all roll up to a number. It is the wrong *spec* for grading. "Score 0.73" tells you almost nothing about *what to fix*.

The four axes (correctness, safety, completeness, quality) give the harness four actionable signals per iteration:

| Axis | What it catches |
|---|---|
| **Correctness** | Wrong facts, broken code, hallucinated APIs. |
| **Safety** | PII leakage, prompt-injection, missing risk callouts. |
| **Completeness** | Missed parts of the prompt, missing acceptance criteria. |
| **Quality** | Verbose, hype-y, generic, low-signal. |

Per-axis thresholds mean the harness fails fast on the *important* axis even when the headline score would pass. A product brief that scores 0.9 on completeness and 0.5 on safety fails. A code change that scores 0.9 on quality and 0.5 on correctness fails. Single-score grading would let both through.

The four-axis grader is itself a `Scorer` (`backend/src/services/scoring/four-axis-grader.ts`). It does not call the LLM directly — it reads the four axis scores from `context.history[last].meta.axes`, which the harness sets after the Evaluator returns. This composition (a grader that consumes another scorer's structured output) is the pattern: scorers are composable, not magical.

## Why a separate loop (and not fold it into EvalHarness)

The eval harness and the sprint harness share the *scoring framework* but not the *control flow*. EvalHarness runs a fixed suite of tasks against a fixed baseline; it knows the answers. The sprint harness runs an open-ended prompt against a moving target; the "answer" is the contract's `passThreshold`, and the harness is the only place that knows whether the loop has converged.

Folding them together would force the eval harness to learn about convergence, plateau detection, and adversarial feedback. None of those belong in a benchmark. ADR 0006 documents the split.

## The plateau-scorer (and why it never short-circuits the loop)

`PlateauScorer` is a *wrapper* around any inner scorer. It looks at the rolling history (`context.history`) and decides whether the latest `plateauWindow` scores have a spread below `plateauTolerance`. If yes, it publishes `{ plateauDetected: true, rollingDelta, ... }` on `meta`. It does not change `passed` — the inner scorer's verdict stands.

Why? Because the harness's loop reads `meta.rollingDelta` to decide whether to stop. The scorer never *forces* the loop to stop; the harness owns the stop decision. The scorer only reports. This is a deliberate separation: scorers measure, the harness decides.

## What it looks like to run

```bash
# Trigger a sprint
pnpm -C backend sprint --contract evals/sprints/well-scoped-sprint.v1.json

# Watch the loop in the dashboard
open http://localhost:5180/dashboard/sprints
```

Output:

```
=== Sprint Run ===
Run id:       0c3b9f1e-...
Contract:     well-scoped-sprint @ v1.0.0
Status:       succeeded
Iterations:   2
Best score:   0.94 (iter 1)
Total tokens: 4218
Cost (USD):   $0.021

Iterations:
  [PASS] iter=0 score=0.84
  [PASS] iter=1 score=0.94
```

## What we are not pretending this is

- **Not a replacement for the eval harness.** Sprints measure *this attempt*. Evals measure *the system*. They serve different purposes; the dashboard has a page for each.
- **Not a guarantee of correctness.** The four axes are heuristics. They catch obvious failure modes; they do not replace a human reviewer for high-stakes work. The approval gate (Phase 3) is what gates high-risk actions, not the sprint.
- **Not a free lunch.** A 5-iteration sprint with `llm-judge` + `rubric-weighted` + `four-axis-grader` costs roughly $0.02-$0.05 against gpt-4o. Plan nightly sprints to stay under $1/day.

## What's next

- **Conditional edges in LangGraph.** Today the harness is function-based. The next iteration uses `langgraph.graph.StateGraph` so the Generator / Evaluator nodes have explicit `add_conditional_edges` for the pass / plateau / max-iterations branches. ADR 0003.
- **Real adversarial test cases.** Hand-written contracts are fine for the first 20 sprints; the next 200 should be generated by an LLM that takes the operator's worst past contract and produces variations.
- **Per-axis trace events.** Today the four axis scores are in the `SprintResult.iterations[].taskResult.scorers[].meta` of the four-axis scorer. The next iteration emits them as OTel span attributes so the trace tree shows "correctness went from 0.6 → 0.9" at a glance. Phase 7.
