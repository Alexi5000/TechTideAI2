# ADR 0006 — The three-agent harness is a separate loop

- **Status:** Accepted
- **Date:** 2026-06-23
- **Deciders:** TechTideAI platform team
- **Supersedes:** none

## Context

The eval harness (Phase 1) is good at *measurement*: run a fixture, score it, compare to a baseline, alert on regression. It is one-shot. The agent gets a prompt, produces an output, gets scored, and the run is over.

That is the right shape for a benchmark. It is the wrong shape for *producing* something. A benchmark tells you how good your agent is; a sprint gets the agent from "where it is" to "where you want it to be." The two are different products.

The PDF on FDE-aligned harness engineering calls for an "adversarial feedback loop" with a Planner / Generator / Evaluator pattern, four graded axes, hard thresholds, and plateau detection. We considered folding the loop into the eval harness (same scoring framework, same scorers, same repo) before deciding on a separate harness.

## Decision

The three-agent harness is a **separate loop** with its own contract (`SprintContract`), its own CLI (`pnpm -C backend sprint`), its own dashboard (`/dashboard/sprints`), its own repository (`backend/src/repositories/sprint-repository.ts`), and its own blog post (`docs/posts/three-agent-harness.md`).

The two harnesses **share**:
- the scorer framework (`backend/src/services/scoring/`),
- the contract surface (`contracts/schema.json` is unchanged),
- the agent runtime abstraction (`IAgentRuntime`),
- the trace service (the three-agent harness wraps iterations in spans),
- the approval gate (a high-risk sprint can pause for human review).

The two harnesses **differ**:
- EvalHarness is *synchronous, deterministic, single-pass*. ThreeAgentHarness is *iterative, plateau-aware, multi-pass*.
- EvalHarness compares against a *frozen baseline*. ThreeAgentHarness compares against *its own best iteration so far*.
- EvalHarness stops when the suite is exhausted. ThreeAgentHarness stops on pass / plateau / max-iterations / error.
- EvalHarness produces an `EvalRun` (deterministic per fixture). ThreeAgentHarness produces a `SprintResult` (non-deterministic per LLM call).

The four graded axes (correctness, safety, completeness, quality) are non-negotiable per the brief. Per-axis thresholds mean the harness fails fast on the *important* axis even when the headline score would pass. The four-axis grader is itself a `Scorer`; it reads the four axis scores from `context.history[last].meta.axes` and aggregates. ADR 0004 (the approval gate) covers the policy layer; this ADR covers the loop.

## Consequences

Positive:

- The eval harness stays simple. It still answers "did the system regress?" in one pass.
- The sprint harness has a separate, well-named control surface. The dashboard distinguishes "we tried and gave up" (plateau) from "we tried and ran out the clock" (max-iterations).
- Scorers are shared. The four-axis grader is registered in the default `ScorerRegistry`; the eval harness can use it directly when a fixture is graded on the four axes.

Negative:

- Two harnesses to maintain. Two CLIs. Two dashboards.
- Sprint runs are non-deterministic. The plateau detector + four-axis grader mitigate, but a sprint run is *not* a benchmark.

## Alternatives considered

- **Fold the loop into EvalHarness.** Rejected: it confuses the benchmark and the product. EvalHarness is for measurement; ThreeAgentHarness is for production. Mixing them in one component makes both worse.
- **Make the loop a separate repo.** Rejected: the contract + scorer framework are shared. A separate repo would duplicate them.
- **Use LangGraph's `StateGraph` directly.** Considered; deferred. The current function-based implementation is honest about being a router. A real graph will come when we have a reason (Phase 2 of the roadmap).
