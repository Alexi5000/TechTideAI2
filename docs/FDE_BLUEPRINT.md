# The FDE-Aligned Build-Out, A Transferable Blueprint

> A generic, app-agnostic checklist for building a portfolio-quality agent harness that demonstrates Forward-Deployed Engineer competence. Derived from the synthesis of OpenAI / Anthropic / Google DeepMind FDE job descriptions, public harness-engineering writing (OpenHands, Claude Code, OpenHarness, Braintrust, LangSmith), and the 2026 *From Model to Mission-Critical System* brief. Not app-specific, drop the patterns into any TS + Python agent repo.

---

## Part 1, The Twelve Core Pillars (every FDE repo should have all twelve)

### 1. Agent-legible procedural memory (`AGENTS.md` or equivalent)

A single, scannable file at the repo root that an agent reads on session start. Not a marketing doc, an operational map.

- What the repo is (1 paragraph; the mental model).
- The architectural planes (control / execution / evidence / product) with links to ADRs.
- The canonical "how to run a task" sequence (load → invoke → check regression).
- The contract surface (where the schema lives, how to add a definition).
- The agent roster (one-line index of every agent, with the lookup function).
- The "do not touch" zones (append-only logs, policy-gated transitions, the contract seam).
- Test commands.
- Reading order for a new contributor (3 ordered files).

**Why it matters:** "From the agent's perspective, anything it can't access in-context doesn't exist." This is the cheapest, highest-leverage signal that you think about agents as the *reader*, not just the *subject*, of the repo.

---

### 2. Skills vs. tools distinction

Two separate registries, not one merged surface.

- **Tools** execute a function and return a result (file read, API call, system action). Side effects allowed.
- **Skills** augment the agent's reasoning by appending sections to the system prompt. No side effects.
- A typed `SkillRegistry` (mirrors the `ScorerRegistry` pattern, `register` / `resolveFor` / `extend`, OCP-friendly).
- The skill loader is wired into the agent-instructions builder so every agent's prompt gets the relevant skill sections appended.
- A decision-tree ADR: "When to add a tool vs. a skill" (tool = do something in the world; skill = reason differently about something you already have).

**Why it matters:** Most harnesses conflate the two. Making the distinction explicit in code (separate directories, separate interfaces) signals that you understand the difference between *capabilities* and *context*.

---

### 3. Typed, versioned sprint contracts

A first-class artifact that pins the scope of an adversarial-feedback loop before work begins. Not a prompt, a *contract*.

- Zod / Pydantic schema with: `id`, `version`, `contractVersion`, `prompt`, `generatorAgentId`, `evaluatorAgentId`, `acceptanceCriteria[3..7]`, `scorers[]`, `passThreshold`, `maxIterations`, `plateauWindow`, `plateauTolerance`.
- Fixtures in a versioned directory (`evals/sprints/*.json`).
- A loader with `.v1.json` / `.json` fallback so version bumps don't break old callers.
- The contract is immutable once published; bump `version` to publish a new one.

**Why it matters:** "Sprint contracts, negotiated scope before work" is the canonical FDE pattern for preventing wasted iterations. Without a contract, the generator and evaluator argue about scope *after* the work is done.

---

### 4. Three-agent adversarial harness (Planner → Generator → Evaluator)

A separate loop from the eval harness. Shares the scorer framework; does not share the control flow.

- **Planner** expands the one-line prompt into a spec (one-shot).
- **Generator** produces a candidate per iteration, receiving the previous Evaluator's rationale as feedback.
- **Evaluator** scores the candidate against the contract's `scorers` (including the four-axis grader).
- **Plateau detection** checks if the rolling score has stagnated within `plateauWindow × plateauTolerance`.
- **Stop discipline:** pass → `succeeded`; plateau → `plateau`; max-iterations → `max-iterations`; every-iteration-errored → `errored`.
- A `SprintResult` entity carries the iteration-by-iteration record, the best iteration, the verdict, and the totals.
- A separate repository (don't pollute the eval-run history).
- CLI, API routes (`/api/sprints/run`, `/api/sprints/runs/:id`), and a dashboard page.

**Why it matters:** A benchmark tells you how good your agent is. A sprint gets the agent from "where it is" to "where you want it to be." They are different products. Folding the loop into the benchmark confuses measurement with production.

---

### 5. Four-axis grader (Correctness / Safety / Completeness / Quality)

Single-score grading is convenient and lossy. Four axes give the harness four actionable signals per iteration.

- Each axis on `[0, 1]` with a per-axis threshold.
- The headline score is the weighted mean of the four.
- The task fails if *any* axis is below its threshold, even when the headline would pass.
- Default thresholds: correctness ≥ 0.8, safety ≥ 0.9, completeness ≥ 0.7, quality ≥ 0.6.
- Implemented as a `Scorer` (not a special case) so it composes with the rest of the scorer framework.
- The grader reads the four axis scores from the evaluator's structured output (`meta.axes`), not from a second LLM call.

**Why it matters:** "Score 0.73" tells you almost nothing about *what to fix*. A product brief that scores 0.9 on completeness and 0.5 on safety fails, and the failure is actionable.

---

### 6. Plateau-detection scorer (composable wrapper)

A wrapper scorer that composes with any inner scorer without forking the registry.

- Constructor takes `{ inner: Scorer, windowSize, tolerance }`.
- Reads the rolling history (`context.history`) and decides whether the latest `windowSize` scores have a spread below `tolerance`.
- Publishes `{ plateauDetected, rollingDelta, bestSoFar, latestScore, samplesConsidered }` on `meta`.
- **Never short-circuits the loop.** The scorer only reports; the harness's loop reads `meta.rollingDelta` and decides whether to stop.
- This separation is deliberate: scorers measure, the harness decides.

**Why it matters:** Without plateau detection, an adversarial loop either runs forever (wasted cost) or stops on a fixed iteration count (wasted signal). The wrapper pattern means any existing scorer gets plateau-awareness for free.

---

### 7. Notebook authoring surface (not runtime)

Three hand-written `*.ipynb` files plus a typed Python bridge and a conversion script.

- **Author a golden task**, walk a new task from idea to fixture.
- **Iterate a prompt**, score a candidate against an existing fixture, loop 5–10 times.
- **Audit a run**, pull a run by id, inspect per-scorer breakdown (no LLM call; safe in CI).
- A typed Python client (the "bridge") that talks to the backend's eval routes over HTTP. The bridge is the only real code in `notebooks/`; the notebooks are recipes.
- A `scripts/convert-notebooks.py` that emits a sibling `.py` for every `*.ipynb`. Reviewers see Python, not JSON.
- A CI workflow that runs `jupyter nbconvert --execute` on the no-LLM notebook and AST-parses every emitted `.py`.
- The review rule: **the `.py` is the artifact under review; the `.ipynb` is the authoring surface.**

**Why it matters:** Notebooks are excellent for authoring and poor as a runtime. The trap is letting one notebook become "the way we run the agent." A 200-line `*.ipynb` in version control is fine; a 200-line `*.ipynb` that is the only path to production is a smell.

---

### 8. Containerization (per-service Dockerfiles + compose)

Per-service images, not a monorepo Dockerfile. Local dev stack, not a production deployment.

- One Dockerfile per service (backend, frontend, agents, python sidecar).
- Multi-stage builds (deps + build → slim runtime).
- Non-root user, `/health` or `/healthz` endpoint, `HEALTHCHECK` directive.
- `docker-compose.yml` with `postgres`, `weaviate` (or your vector store), the app services, and the sidecar.
- `depends_on: condition: service_healthy` so the stack comes up in dependency order.
- `docker-compose.override.yml.example` for local dev overrides (mount source for live reload).
- `.dockerignore` at the repo root.
- A smoke script (`scripts/smoke-stack.sh`) the CI job calls: bring up, curl healthchecks, tear down.
- **Deliberately do not ship:** Kubernetes chart, Helm template, Terraform module, production auth, TLS termination, registry push. Those are customer-specific decisions the FDE makes per deployment.

**Why it matters:** "Containerize the entire agent application" is the corollary discipline to "no notebooks as runtime." Per-service images mean CI can build them in parallel, layers compose with the workspace structure, and an FDE can swap any one service for a customer's preferred runtime.

---

### 9. FDE-narrative README (customer problem first, architecture second)

The README leads with a customer scenario, not with the stack table.

- **Opening paragraph:** who uses this, what they use it for, how we know it's working (concrete success metrics).
- **Customer scenario:** a named persona (e.g. "VP of Operations at a 200-person services firm"), the pain, the solution, the outcome. Not a sales doc; a positioning doc.
- **Success metrics table:** pass-rate ≥ 80%, p95 latency < 8s, approval median < 4h, eval cost < $1/run. Each metric links to where it's measured.
- **"What works today" table:** every row maps a claim to a file and a verify command. No aspirational copy.
- **Architecture diagram** (ASCII is fine; a PNG is better).
- **Architecture decisions:** bullet list linking to every ADR.
- **Quality gates:** the `verify` command and what it checks.
- **Operating principles:** 6 short bullets ("Typed contracts over prompt soup", "Logs and traces over vibes", etc.).
- **License.**

**Why it matters:** A README that leads with architecture signals "I built a thing." A README that leads with a customer scenario signals "I understand the problem this thing solves." The latter is what gets an FDE interview.

---

### 10. Honest benchmark doc (`docs/BENCHMARK.md`)

Side-by-side comparison against 3–5 reference harnesses. Not a sales doc, an honest gap analysis.

- Reference harnesses you actually read (OpenHands, Claude Code, OpenHarness, Braintrust, LangSmith, etc.).
- A feature matrix with columns: feature, reference A, reference B, your repo, status (`match | partial | differs-on-purpose | missing`).
- Every row tagged `verified` (you read the source) or `unverified` (claimed by a third-party summary).
- A "What we don't have, and why" table, explicit non-goals with reasons (no chat UI, no Slack adapter, no production auth).
- A "What we deliberately do differently" section, where you diverge from the references and why.

**Why it matters:** A senior reviewer reads the benchmark doc to see if you can *think critically about the field*, not just ape it. "Verified" vs. "unverified" tagging is the signal that you know the difference.

---

### 11. Architecture Decision Records (one per load-bearing choice)

Every non-obvious architectural decision gets a written ADR. Sequential numbering, no gaps.

- **Status:** Accepted (or Proposed / Superseded).
- **Context:** the problem you were solving.
- **Decision:** what you chose.
- **Consequences:** positive and negative.
- **Alternatives considered:** what else you looked at and why you didn't pick it.

The nine canonical ADRs for an FDE-aligned agent harness:

1. Status machine as the execution boundary.
2. Evaluation is part of the product (not a notebook).
3. Dual runtime (or single runtime, but the decision is documented).
4. Approval as execution boundary (HITL is a state, not a UI feature).
5. Trace and memory as the contract.
6. The three-agent harness is a separate loop.
7. Skills vs. tools.
8. Notebooks are authoring surfaces, not runtimes.
9. Per-service containerization, deliberately no production stack.

**Why it matters:** ADRs are the artifact that proves the architecture was *chosen*, not *accidental*. A reviewer who disagrees with a decision can at least see the tradeoff you considered.

---

### 12. Full test coverage for the new surface

Every new module gets tests. No "I'll add tests later."

- Unit tests for every scorer (deterministic + LLM-judge + rubric-weighted + four-axis + plateau).
- Unit tests for the harness loop (monotonic improvement, max-iterations, plateau, errored, one-step regression, contract version).
- Schema validation tests (Zod / Pydantic parse the fixtures).
- Repository tests (save, findById, listByContract, findLatestByContract).
- Contract-sync round-trip tests (schema → TS, schema → Python, drift-hash matches across both).
- Notebook bridge tests (typed request shape, error surface, response parsing).
- Conversion script tests (writes sibling `.py`, fails on corrupt input).
- Trace service tests (attributes survive `end()`, error status captured, runId→traceId mapping).
- A Docker smoke test (shell script; not unit-test material).
- Python tests for the runtime, dispatcher, LLM client, contract sync.

**Why it matters:** A repo with great architecture and no tests is a demo. A repo with great architecture and 60+ targeted tests is a product. The test count is the single most reliable signal of engineering discipline.

---

## Part 2, Additional Items to Make It a Full FDE Build-Out

These twelve get you to "credible." The items below get you to "state-of-the-art." Add as many as fit the target app.

### 13. Typed contract as the single source of truth (`contracts/schema.json`)

One JSON Schema file. A sync script regenerates TypeScript types *and* Python Pydantic models from it. A drift-check hash is embedded in both generated files; a test asserts they match.

- Adding a new contract type is a one-line schema change + a re-run of the sync script.
- CI runs the sync script and fails if the generated files are stale.
- The schema is the seam between runtimes; neither side leaks framework types into the other.

**Why it matters:** Two runtimes (TS + Python) need a single source of truth. Without it, drift is inevitable and debugging it is a 90-minute `git log` exercise.

---

### 14. Dual runtime (TypeScript + Python) behind a shared contract

Workers on the fast runtime (TypeScript / Mastra); orchestrators on the graph-heavy runtime (Python / LangGraph). A dispatcher reads a config file and routes per agent.

- Default routing: workers → TS, orchestrators → Python, CEO → TS (configurable).
- Per-agent overrides win over tier defaults.
- The Python sidecar is optional, if `LANGGRAPH_SIDECAR_URL` is unset, everything routes to TS.
- A bridge in the backend POSTs to the sidecar and unwraps the result.

**Why it matters:** Each runtime does what it's good at. The contract is the boundary; drift is caught at CI time. This is architectural range, not duplication.

---

### 15. Eval harness with regression detection

A real eval surface, not a notebook.

- Versioned suites of golden tasks (`evals/fixtures/*.json`).
- A scorer registry (OCP-friendly: `register` / `get` / `extend`).
- Five scorer kinds: `exact-match`, `regex`, `json-schema`, `llm-judge`, `rubric-weighted`.
- A runner that captures output, latency, tokens, cost, and per-scorer breakdown.
- A CLI that prints a summary table and exits non-zero on regression (`EVAL_REGRESSION_THRESHOLD_PCT`, default 5%).
- An API surface and a dashboard page.
- Nightly CI (cost guard, not on every PR).

**Why it matters:** Production agent systems drift. Model bumps, prompt tweaks, and tool-wiring changes all silently degrade quality. Without a harness, the only signal is "a customer complained."

---

### 16. Human-in-the-loop approval gate

Approval is a first-class state in the status machine, not a UI feature.

- An `ApprovalPolicy` classifies every agent action into a risk tier: `read | write | external | destructive | billing`.
- High-risk tiers (`external`, `destructive`, `billing`) pause the run in `awaiting-approval`.
- An `ApprovalRequest` entity with `decidedAt`, `decidedBy`, `rationale`, and the policy version stamped on the row.
- The operator grants or denies via the dashboard; the run resumes or fails.
- Every decision is recorded in `run_events` for audit replay.

**Why it matters:** "Human approval where risk matters" is the canonical FDE promise. Treating it as a domain entity (not a Slack ping) is what makes it auditable.

---

### 17. Structured run-events log (append-only)

Every state transition emits a structured event. The table is the audit log.

- A fixed `RunEventType` enum (`run.created`, `run.started`, `agent.tool_call`, `approval.requested`, etc.).
- Each event carries `correlationId` (ties to a trace), `severity`, `occurredAt`.
- `GET /api/runs/:id/events` returns the full timeline.
- No `UPDATE` paths, adding them is a security regression.

**Why it matters:** "Logs that explain what happened" is the FDE promise. A typed, append-only event log is the artifact that delivers it.

---

### 18. OpenTelemetry trace surface (enriched)

Every run gets a `trace_id`. Spans for HTTP request → run create → agent execute → tool call → LLM call.

- Defaults to in-process buffering; switches to OTLP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
- A `runIdIndex` so `GET /api/runs/:id/trace` resolves a run to its trace without threading the OTel traceId through the request lifecycle.
- Per-span `eval.*` attributes (score, iteration, axes) attached by the three-agent harness.
- A "Grader" tab on the run-detail page that shows the per-iteration score sparkline.

**Why it matters:** "Trace every step before you write serious evals." The trace tree is the natural place to attach cost attribution and per-axis scores.

---

### 19. Post-mortem auto-generation

Every completed run writes a markdown post-mortem.

- `PostMortemService` listens for `run.completed`.
- Output: header, summary, event timeline, output, reflection (3 paragraphs).
- The reflection is LLM-generated against the run's input, output, and event timeline.
- Lives at `docs/EVALS/post-mortems/<run-id>.md` so engineers review runs by reading markdown, not by querying tables.

**Why it matters:** A trace tree is for debugging. A post-mortem is for *learning*. The post-mortem is what gets read; optimize for read time first.

---

### 20. Mastra memory surface (or equivalent)

Cross-session working memory backed by Postgres + a vector store.

- A `Memory` adapter configured against a Postgres store.
- Tier-scoped working-memory templates (CEO / orchestrator / worker).
- Memory is opt-in: returns `undefined` when the environment isn't ready.
- Migration that creates the `mastra_messages` and `mastra_working_memory` tables.

**Why it matters:** Orchestrator agents that run for hours need persistent state. Context-window stuffing is a band-aid.

---

### 21. CI that covers contracts, docker, notebooks, evals, and drift

Not just lint + test + build.

- **`ci.yml`:** TS matrix, Python, database, contracts-drift (re-runs sync, fails on diff), docker smoke, gate.
- **`evals.yml`:** nightly + manual dispatch. Never on PR (cost guard).
- **`notebooks.yml`:** converts notebooks, AST-parses every `.py`, tests the bridge.
- **`pr.yml`:** semantic PR titles, auto-labeling.
- **`deploy.yml`:** per-service deploy (Railway / Vercel / Fly.io, the FDE picks).
- Paths filter so each job only runs when its surface changes.
- Dependabot on a monthly cadence with grouped updates.

**Why it matters:** The CI file is the second thing a senior reviewer reads (after the README). The breadth of checks is the signal that you treat the repo as production-grade.

---

### 22. A `close-stale-deps-prs.sh` script (or equivalent)

Automated cleanup of the dependabot backlog.

- Uses `gh pr list --label dependencies --json number,createdAt` filtered by age.
- Closes each with a comment pointing to the consolidated PR.
- No hardcoded PR numbers.

**Why it matters:** 15 stale dependabot PRs is the same anti-pattern as 16 open issues. A reviewer will check.

---

### 23. The "engineering blog" posts

Two long-form technical posts in `docs/posts/`.

- **"Lessons from building a company-scale agent OS"** (~2,000 words), the engineering retrospective. The four planes, the dual runtime, what the eval harness taught about prompt brittleness, the approval gate as a forcing function, what you'd do differently.
- **"The three-agent harness"**, the Planner / Generator / Evaluator pattern, why the four axes replace a single score, why the loop is separate from the benchmark.

**Why it matters:** The blog posts are where a reviewer sees how you *think*. The code shows what you built; the posts show why.

---

### 24. Standard repo hygiene

The boring essentials that a reviewer checks in 30 seconds.

- `CHANGELOG.md` (Keep-a-Changelog format, versioned).
- `CONTRIBUTING.md` (references the PR template, CODEOWNERS, verify gate).
- `SECURITY.md` (vulnerability disclosure, supported versions, secrets hygiene).
- `.github/ISSUE_TEMPLATE/{bug,feature,eval-result}.yml`, including a template for reporting an eval failure.
- `.github/pull_request_template.md`, `.github/CODEOWNERS`, `.github/dependabot.yml`, `.github/labeler.yml`, `.github/copilot-instructions.md`.
- `.env.example` files for every package.
- `.editorconfig`, `.prettierrc.json`, `.gitignore`.

**Why it matters:** Their absence is louder than their presence. A repo without a CHANGELOG signals "I don't think about future maintainers."

---

## Part 3, The Minimum Viable FDE Repo (if you can only do twelve)

If you are time-boxed and can only ship the twelve core pillars, ship:

1. `AGENTS.md`
2. Skills vs. tools
3. Sprint contracts
4. Three-agent harness
5. Four-axis grader
6. Plateau scorer
7. Notebook authoring surface
8. Containerization
9. FDE-narrative README
10. `docs/BENCHMARK.md`
11. ADRs (at least 0006, 0007, 0008, 0009)
12. Test coverage

Then add 13–24 as time permits. The twelve alone get you to "credible." The full twenty-four get you to "state-of-the-art."

---

## Part 4, What This Blueprint Deliberately Does Not Include

- **A "hired on the spot" claim.** No repo gets anyone hired on the spot.
- **RAILS / AgingBench / protocol-X features.** Research artifacts, not production patterns.
- **Embedding notebooks as agent runtime.** The ADR and the notebook README both say so explicitly.
- **Aspirational README copy.** Every line points to a file or CLI command.
- **A public chat surface, Slack adapter, or production auth.** Out of scope for a portfolio repo; called out in the benchmark doc.
- **A Kubernetes chart, Helm template, or Terraform module.** Pre-judges the customer's orchestrator. The FDE picks per deployment.

---

## Transfer checklist

Copy this into a new repo and check off each item:

```
[ ] 1.  AGENTS.md at repo root
[ ] 2.  Skills registry + 3 skills + wired into agent instructions
[ ] 3.  Sprint contract schema + example fixture
[ ] 4.  Three-agent harness (Planner/Generator/Evaluator) + CLI + API + dashboard
[ ] 5.  Four-axis grader scorer
[ ] 6.  Plateau-detection wrapper scorer
[ ] 7.  Notebook authoring surface (3 .ipynb + bridge + convert script + CI smoke)
[ ] 8.  Per-service Dockerfiles + docker-compose.yml + smoke script
[ ] 9.  FDE-narrative README (customer scenario + success metrics + what-works-today)
[ ] 10. docs/BENCHMARK.md (honest side-by-side, verified/unverified tags)
[ ] 11. ADRs (at least 4; ideally all 9)
[ ] 12. Test coverage (60+ cases across the new surface)
[ ] 13. Typed contract (schema.json + sync script + drift hash)
[ ] 14. Dual runtime behind the contract (if applicable)
[ ] 15. Eval harness with regression detection
[ ] 16. HITL approval gate (risk-tier classifier + status machine)
[ ] 17. Structured run-events log (append-only)
[ ] 18. OpenTelemetry trace surface (enriched with eval.* attrs)
[ ] 19. Post-mortem auto-generation
[ ] 20. Memory surface (Postgres + vector store)
[ ] 21. CI covering contracts, docker, notebooks, evals, drift
[ ] 22. close-stale-deps-prs.sh (or equivalent automated cleanup)
[ ] 23. Two engineering blog posts
[ ] 24. Standard repo hygiene (CHANGELOG, CONTRIBUTING, SECURITY, issue templates, .env.examples)
```

When all twenty-four are checked, the repo is in a state where a senior reviewer at a top lab can read it end-to-end in one sitting and understand every architectural choice.
