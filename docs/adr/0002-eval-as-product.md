# ADR 0002, Evaluation is part of the product

- **Status:** Accepted
- **Date:** 2026-06-22
- **Deciders:** TechTideAI platform team
- **Supersedes:** none

## Context

Production agent systems drift. Model bumps, prompt tweaks, and tool-wiring changes all silently degrade quality. Without a harness, the only signal is "the dashboard looks slower" or "a customer complained", by which point the damage is done.

## Decision

The eval harness is a **first-class product surface**, not a notebook. It ships in the repo with:

- A versioned suite of golden tasks (`evals/fixtures/golden-tasks.v1.json`).
- A pluggable scorer registry (`backend/src/domain/policies/scorer-policy.ts`).
- A runner that records model versions, scorer versions, latency, cost, and per-scorer breakdowns on every run.
- A CLI with regression detection (`pnpm -C backend evals`).
- An API surface (`/api/evals/*`) and a dashboard (`/dashboard/evals`).
- CI on a nightly schedule (`.github/workflows/evals.yml`). PRs do not run evals, see below.

### Why not on PRs

Cost. A 33-task suite against `gpt-4o` + `gpt-4o` judge runs $0.30–0.80. We'd rather pay that nightly than on every PR. Manual dispatch is available for pre-release validation.

### Why golden tasks and not synthetic generation

Synthetic test generation has its place but is a Phase 4 problem. For Phase 1 we wanted tasks a human could read and reason about, with hand-written rubrics that read like a brief to a smart non-expert.

## Consequences

Positive:

- Every change ships with a measurable claim ("pass rate went from 78% → 82%").
- Regression detection catches the silent failures that dashboards miss.
- The eval suite *is* the documentation of what each agent is supposed to be good at.

Negative:

- Hand-written fixtures don't cover the long tail. We accept that; we'll add adversarial generation once the suite crosses ~100 tasks.
- LLM-judge scorers have non-zero variance. We address this with `temperature: 0` and a 5% regression threshold (configurable via `EVAL_REGRESSION_THRESHOLD_PCT`).

## Alternatives considered

- **LangSmith / Braintrust.** Rejected as primary because we want the harness in-tree and version-controlled. We can still OTLP-export traces to either of them.
- **Production-traffic replay.** Deferred. Sampling real traffic and grading it after the fact is more accurate but harder to debug.
