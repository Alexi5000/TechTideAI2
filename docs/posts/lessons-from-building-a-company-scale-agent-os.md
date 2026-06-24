# Lessons from building a company-scale agent OS

> A 2,000-word post-mortem on the engineering choices that shaped TechTideAI, the system, the mistakes, and what we'd do differently.

When I started TechTideAI, the README led with a confident claim: *"Production AI needs more than prompts. Teams need agent registries, execution boundaries, API contracts, evaluation fixtures, memory surfaces, human approval paths, and logs that explain what happened."*

That was the aspiration. Building it turned out to be a sequence of small, hard decisions about what to enforce and what to leave to the framework. This post is the engineering retrospective.

---

## 1. The four planes are not optional

The architecture splits into control / execution / evidence / product. I tried to fold all four into one monolith first. It failed. The reason is mundane: each plane has a different change cadence and a different audience.

- **Control plane** changes when the org chart changes (a new orchestrator, a new risk tier).
- **Execution plane** changes when a tool changes (an API upgrade, a new vendor).
- **Evidence plane** changes when a question changes ("what happened in run X? what would the policy in effect on 2026-06-01 have decided?").
- **Product plane** changes when an operator's workflow changes.

When the planes are coupled, every change touches every other layer. When they're separated by contracts (status machine, event types, trace tree, route surface), changes ripple predictably.

The rule we landed on: *if a change touches three planes, it's actually two changes stapled together.* Split it.

## 2. Evaluation is part of the product, not a notebook

The biggest mistake I made early on was treating the eval harness as a research artifact. "We'll measure things later." Later never comes.

What worked was forcing eval into the same shape as the rest of the platform:

- A versioned suite of golden tasks checked into `evals/fixtures/`.
- A scorer registry (`ScorerRegistry`) that's OCP-extensible, adding a scorer means registering it, not forking the harness.
- A CLI (`pnpm -C backend evals`) that emits a table and exits non-zero on regression.
- A nightly CI workflow (`.github/workflows/evals.yml`), and *not* on PRs, because cost. ($0.30–0.80 per run × every PR is not a budget.)

The thing that surprised me: once the harness was a real surface, the *conversations* changed. "Did the model bump help?" became "pass rate went from 0.74 → 0.81, p95 latency up 200ms, mean score up 0.04." Specific claims, not vibes.

What I'd do differently: ship the harness before the second feature. I waited until three features were already in production. By that point, every change risked breaking a behavior nobody had measured.

## 3. The approval gate is a forcing function for risk modeling

"Human approval where risk matters" sounds obvious. It isn't.

The mistake I made was treating it as a UI problem, a button on a workflow-runner tool that prompts the operator. That implementation let through plenty of high-risk actions because nothing structurally required the approval.

What worked was treating approval as **a first-class state in the status machine**:

- `running → awaiting-approval` (added via OCP-friendly `extend()` on the status policy).
- `awaiting-approval → {running, succeeded, failed, canceled}` (after the operator decides).
- The `ApprovalPolicy` classifies every agent action into `read | write | external | destructive | billing` and pauses on the high-risk three.
- Every decision is recorded with the policy version stamped onto the row, so historical decisions can be replayed against the policy in force at the time.

The downstream effect: every new agent action now has to pass through a *risk classification* conversation. "Is `delete_record` high-risk? Yes. Is `update_doc` high-risk? No, by default, but here's why I want to override." The forcing function made the team *think* about risk before writing the action.

What I'd do differently: put the policy in front of the agent-execution service from day one. I shipped agents that auto-ran their workflow-runner actions for three weeks before realizing none of them had a real safety net.

## 4. Two runtimes are better than one (for our workload)

I almost shipped Mastra-only. It's ergonomic. The agent hot path is just LLM-call-plus-tool-calls.

But Cipher (the finance orchestrator) kept needing more: deterministic compute layers, conditional edges for HITL, multi-step plans that needed to be visible in the trace tree. Wrapping those in a Mastra prompt felt wrong.

The dual runtime won because the **contract was already the seam**. `IAgentRuntime` is just `execute(request) → result`. Adding a Python implementation is "write a class that satisfies the interface." The `Dispatcher` reads `runtime_config.yaml` and decides per agent. Drift is caught by `tests/test_contract_sync.py` reading hash markers in both generated files.

The thing that surprised me: the cost curve inverted. LangGraph orchestrators are *cheaper* than equivalent Mastra orchestrators because the deterministic compute layer avoids an LLM call. The latency curve doesn't invert, Mastra is still faster for one-shot agent calls, but the orchestrator cost was the bigger lever.

What I'd do differently: write the contract first, *then* the runtimes. I wrote the TypeScript runtime first and the contract second, which meant the Python port had to be reverse-engineered into a clean schema. `contracts/schema.json` should have been the first artifact, not the third.

## 5. Observability is a contract, not a feature

The original `run_events` table existed in migration 0001 and was *never written to*. The original README promised "logs that explain what happened." Both were true at the same time, because nothing forced the runs service to emit events.

The fix was three things:

1. **Every state transition emits a structured event.** `run-service.ts` calls `runRepository.addEvent(...)` on every status change. The event type is one of a fixed enum (`run.created`, `run.started`, `run.completed`, `agent.tool_call`, `approval.requested`, …).
2. **Every run gets a `trace_id`** that flows through OpenTelemetry spans for the HTTP request, the run create, the agent execute, the tool call, the LLM call. Defaults to in-process; switches to OTLP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
3. **Every completed run writes a post-mortem** to `docs/EVALS/post-mortems/<run-id>.md`. Engineers review runs by reading markdown, not by querying tables.

The third one is the unsung hero. A 60-line markdown file with: header, summary, event timeline, output, three-paragraph reflection. The PostMortemService asks an LLM to write the reflection against the run's input, output, and event timeline. It's not perfect, but it's always written, and a tired human can scan it.

What I'd do differently: ship the post-mortem before shipping the trace tree. The trace tree is more powerful, but the post-mortem is what gets *read*. Optimize for read time first.

## 6. Drift detection is cheap; drift repair is expensive

The TS and Python runtimes drifted three times during development. Each drift was a 90-minute "what changed?" exercise that ended in `git log contracts/schema.json`. The fix was a single hash marker in each generated file (`# Drift-check hash (mirrored in TypeScript/Python): abc12345`) and a test that reads both. Three lines of code, two hours saved per drift.

The same lesson applies to the open PR backlog. We had 15 stale dependabot PRs from May 25, 2026. Closing them all with a comment and opening one consolidated `build(deps): refresh all groups` PR took ten minutes. Letting them pile up looked lazy.

The lesson: *every shared surface needs a contract and a test that the contract holds.*

## 7. Operator UI is a feature, not a tax

The original repo had three dashboard pages. The eval harness added `/dashboard/evals` (run history, per-task breakdown, regression highlights). The approval gate added `/dashboard/approvals` (pending queue, grant/deny buttons, audit trail).

The temptation was to skip the UI for the harness and ship "the data is in `/api/evals/runs`." I tried that. The harness went unused. The moment `/dashboard/evals` shipped with a "Run suite" button, the team started running it weekly.

The same was true for approvals. A Slack ping "agent paused on run X" is not a HITL system. The `/dashboard/approvals` queue, with grant/deny buttons and a rationale field, *is*.

The lesson: if a surface is part of the product, it gets a screen. Operator UI is the difference between "we have a HITL system" and "we have a HITL system that someone actually uses."

## 8. The dependency surface tells you what you actually shipped

The original `package.json` said "Mastra, LangGraph, Supabase, Weaviate." It also said: 137 TS source files, 4 Python source files, 3 tests. The surface area was an order of magnitude off the dependencies.

When we wrote the README rewrite, we removed every aspirational claim that didn't have a working artifact behind it. We ended up with:

- 5 ADRs (one per major decision, all with status "Accepted").
- A "What works today" table that maps every claim to a verifiable surface.
- A "How to verify" section that walks a new contributor through `pnpm run verify` + `pnpm -C backend evals`.
- An eval methodology doc that explains what "pass" means, how scorers are versioned, and what counts as a regression.

The README went from "vision doc" to "executable documentation." The diff was a few hours and a lot of "delete this paragraph."

The lesson: *if the README claims it, the repo must demonstrate it.* Otherwise it's a vision doc, not a product.

---

## What's next

Three things I'd build next, in order:

1. **Real LangGraph state graphs.** The current implementation is a function-based router. The next iteration uses `langgraph.graph.StateGraph` so the trace tree shows actual graph transitions.
2. **Adversarial test generation.** Hand-written fixtures don't cover the long tail. Once the suite crosses ~100 tasks, we generate adversarial variants from the existing rubrics.
3. **Production-traffic replay.** Sample real agent traffic and grade it against the eval suite after the fact. The signal is more accurate than hand-written fixtures; the engineering cost is the storage and the grader.

The hard part of any agent system is the loop: ship → measure → fix → re-measure. Everything in this post, the eval harness, the approval gate, the trace surface, the post-mortem service, is in service of closing that loop faster.

The product is the loop. Everything else is plumbing.
