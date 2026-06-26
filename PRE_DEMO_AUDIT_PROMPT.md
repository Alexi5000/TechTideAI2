# Pre-demo audit prompt

A runnable checklist for the senior engineer who has to make the
TechTideAI repo presentable in front of a frontier reviewer.
The reviewer will not read the README. They will, in this order:

1. Click a link from the README to a running demo, a recorded
   walkthrough, or a real eval run.
2. Open `docs/EVALS/latest.json` or the eval suite stdout.
3. Open `scripts/sync-contracts.ts` and the contract drift
   hash between `agents/src/runtime/contract-types.generated.ts`
   and `agents/python/src/techtide_agents/contracts/generated.py`.
4. Read one row of `run_events` to see if `policyVersion` is
   actually stamped on the audit log.
5. Read the ADR set under `docs/adr/` to confirm the code
   matches the docs.

If any of those five fail, the meeting is over. This prompt
walks a senior engineer through a runnable audit that surfaces
those failures before the reviewer does.

## How to use this file

1. Run the **Pre-demo audit script** section. It is a
   deterministic, copy-pasteable script that surfaces the
   five failure modes.
2. Walk the **Five reviewer probes** section. For each probe,
   the prompt tells the senior engineer what to look for and
   what the pass / fail signal looks like.
3. Walk the **Surface-by-surface audit** section. Each surface
   has a "the reviewer will look at" line and a "the answer
   must be" line. If the answer is missing, the surface
   blocks the review.
4. Walk the **Talking points** section. The senior engineer
   who has to defend the repo tomorrow will need a one-line
   answer for every likely question. Each talking point is
   written so the engineer can say the line verbatim or
   paraphrase freely.

## Pre-demo audit script

Run the following in order. Stop on the first failure. The
script is deterministic and the failures are sharp.

```bash
# 0. Clean state
cd /c/Users/Admin/TechTide/Apps/TechTideAI2
git checkout main
git fetch origin
git reset --hard origin/main
git log --oneline -1

# Expected: v0.5.1 README overhaul (#57)

# 1. TS surfaces green
pnpm install
pnpm run verify

# Expected: lint + test + build pass for backend, agents, apis, frontend.

# 2. Python surface green
cd agents/python
python -m pip install -e ".[dev,server]"
python -m ruff check .
python -m ruff format --check .
python -m pytest
cd ../..

# Expected: 20 passed, ruff clean.

# 3. Contract sync: TS drift hash == Python drift hash
pnpm exec tsx scripts/sync-contracts.ts
git diff --stat

# Expected: no diff. The script regenerates the two files;
# the drift hash embedded in each must match.

# 4. Eval suite end-to-end
cd backend
pnpm evals --suite golden-tasks.v1 --write-docs
cd ../..

# Expected: 33 tasks loaded and executed. Output writes
# docs/EVALS/latest.json. The summary section is non-empty.
# If OPENAI_API_KEY is set, scores are real numbers. If not,
# the harness correctly reports unconfigured providers and
# score is 0 across the board. That is honest, not a bug.

# 5. Mermaid + SVG validation
python -c "
import xml.etree.ElementTree as ET
from pathlib import Path
for f in sorted(Path('assets').glob('*.svg')):
    ET.parse(f)
print('all SVGs valid')
"
grep -c "mermaid" README.md
grep -c "—" README.md

# Expected: all SVGs valid, 6+ Mermaid blocks, 0 em-dashes.

# 6. GitHub surfaces
gh pr list --state open --json number
gh run list --workflow=ci.yml --limit 5 --json conclusion

# Expected: 0 open PRs, latest CI run conclusion=success.

# 7. Demo walkthrough
cat DEMO_WALKTHROUGH.md | head -3
ls assets/walkthrough/

# Expected: the doc opens with the standard header, six SVGs in
# assets/walkthrough/.
```

## Five reviewer probes

Each probe names what the reviewer will look at, what the pass
signal is, and the file the senior engineer should have open.

### Probe 1: the click

The reviewer will click the first link in the README that
points to a live surface. The candidate links are:
- The DEMO_WALKTHROUGH.md link.
- The architecture SVG (renders in the GitHub preview).
- The badge row (which links to the latest release).
- The repository map.

Pass signal: every link in the README resolves to a real file
or a real external URL. Zero `404`. Zero link to a non-existent
branch. Zero placeholder.

Open in the editor: `README.md`. Search for `](\` to enumerate
every markdown link. Verify each.

### Probe 2: the eval run

The reviewer will look at `docs/EVALS/latest.json` first,
then at the eval suite stdout. They want to see a real number,
not a slide. The single line they will quote back is the
pass rate.

Pass signal: `pnpm -C backend evals --suite golden-tasks.v1`
exits cleanly and writes `docs/EVALS/latest.json` with a
non-empty `summary`. The pass rate is whatever it is. Honest
numbers, not aspirational.

Open in the editor: `backend/src/services/eval-harness.ts`. The
reviewer will read the harness to see whether the scorer
framework is a real implementation or a stub.

### Probe 3: the contract sync

The reviewer will open `scripts/sync-contracts.ts` and check
that the drift hash in
`agents/src/runtime/contract-types.generated.ts` matches the
drift hash in
`agents/python/src/techtide_agents/contracts/generated.py`. This
is the highest-signal artifact in the whole repo. If it works,
the rest of the design is probably coherent. If it doesn't,
nothing else matters.

Pass signal: `pnpm exec tsx scripts/sync-contracts.ts` produces
no diff. The drift hash embedded in both files is identical.
The Python test `pytest agents/python/tests/test_contract_sync.py`
passes.

Open in the editor: `contracts/schema.json`. This is the single
source of truth. The reviewer will read it as the contract.

### Probe 4: the audit row

The reviewer will pick one row of the audit log and read it.
They want to see:
- `eventType` is a real enum value (not a free-text string).
- `payload` is JSON.
- `createdAt` is a timestamp.
- The `ApprovalRequest` row, when present, has `policyVersion`
  stamped on it.

Pass signal: the eval suite has run at least once, so
`docs/EVALS/latest.json` has rows. The row schema in
`backend/src/services/trace-service.ts` matches the row schema
the reviewer will infer. The `ApprovalRequest` entity in
`backend/src/domain/entities/approval-request.ts` has a required
`policyVersion` field.

Open in the editor: `agents/src/core/approval-policy.ts`. The
reviewer will read this file to see if the OCP-friendly
`extend()` pattern is real or nominal.

### Probe 5: the ADR set

The reviewer will read the ADR set under `docs/adr/` in order,
looking for:
- Each ADR cites a real code surface.
- The decisions in the ADRs match the code.
- The "do not touch" zones in `AGENTS.md` match the ADRs.

Pass signal: the ADRs cover state machine, eval-as-product,
dual runtime, approval gate, trace and memory, three-agent
harness, skills vs. tools, notebook authoring, and
containerization. They are written in dependency order. Each
ADR's "Decision" section names a file or a test that proves
the decision was implemented.

Open in the editor: `docs/adr/`. Read 0001, 0002, 0003, 0004,
0007 in order. The reviewer will skim; you must be able to
answer the file pointer on each.

## Surface-by-surface audit

Each surface names what the reviewer will look at, what the
answer must be, and the file to have open. The senior engineer
walks this list top to bottom.

### Surface A: README

The reviewer will land here first.

- Header band renders cleanly (wordmark + badge row).
- 7 in-page anchors at the top work.
- 23-item TOC renders cleanly. Every anchor resolves.
- 26 second-level sections. The reviewer will skim them in
  order. Each section opens with a short paragraph and
  ends with a file pointer or a table.
- 6 Mermaid diagrams. They render on github.com. The
  reviewer will click into one and read it for 30 seconds.
- 8 image references. They render.
- 33 HTML anchor links. They resolve.
- 7 blockquotes. They are humanized, not marketing copy.

Open in the editor: `README.md`. Search for `mermaid`. There
should be 6. Search for `—`. There should be 0.

### Surface B: AGENTS.md

The reviewer will read this if they want to know what the
harness tells its own agents to do.

- "Do not touch" zones match the ADRs.
- Test commands are correct.
- File pointers resolve.

Open in the editor: `AGENTS.md`. The reviewer will read the
"Do not touch" section first.

### Surface C: docs/adr/0001 through 0009

The reviewer will read this in order.

- 0001 status machine: cites `StatusTransitionPolicy` in code.
- 0002 eval-as-product: cites `eval-harness.ts` and
  `golden-tasks.v1.json`.
- 0003 dual runtime: cites both TypeScript and Python runtimes.
- 0004 approval-as-execution-boundary: cites
  `approval-service.ts` and `approval-request.ts` (and the
  `policyVersion` field).
- 0005 trace and memory: cites `trace-service.ts` and the
  append-only invariant.
- 0006 three-agent harness: cites `three-agent-harness.ts`.
- 0007 skills vs. tools: cites `agents/src/skills/`.
- 0008 notebook authoring: cites `notebooks/` and
  `convert-notebooks.py`.
- 0009 containerization: cites `Dockerfile.*` and
  `docker-compose.yml`.

Open in the editor: `docs/adr/`. The reviewer will skim
decisions, then click into the file the ADR points at.

### Surface D: evals/fixtures/golden-tasks.v1.json

The reviewer will read this to see whether the eval suite is a
real workload or a couple of demo tasks.

- 33 tasks.
- Tasks cover all 10 orchestrators + the director.
- Each task has a `rubric`, `tags`, `expected`, `timeoutMs`.
- The suite is "v1", meaning there is a frozen baseline.

Open in the editor: `evals/fixtures/golden-tasks.v1.json`. Search
for `"agentId"`. There should be at least 11 unique agents
(1 director + 10 orchestrators).

### Surface E: backend/src/services/eval-harness.ts

The reviewer will read this to see if the eval framework is a
real implementation.

- 4 scorers wired in: `json-schema`, `llm-judge`,
  `rubric-weighted`, `four-axis-grader`.
- Frozen baseline + 5% threshold.
- Post-mortem auto-gen.
- Per-task `scorerVersions` tracked for drift detection.

Open in the editor: `backend/src/services/eval-harness.ts`. The
reviewer will look at the `runSuite` method first.

### Surface F: agents/src/core/approval-policy.ts

The reviewer will read this to see whether the OCP pattern is
real or nominal.

- `extend()` returns a new policy (immutable).
- Risk tiers are an enum, not a free-text string.
- High-risk tier set is configurable.

Open in the editor: `agents/src/core/approval-policy.ts`. The
reviewer will look at the `extend()` method first.

### Surface G: scripts/sync-contracts.ts

The reviewer will read this to see whether the contract sync
is a real mechanism or a one-shot script.

- Single source of truth: `contracts/schema.json`.
- Drift hash embedded in both generated files.
- `pnpm exec tsx scripts/sync-contracts.ts` produces no diff
  on a clean run.

Open in the editor: `scripts/sync-contracts.ts`.

### Surface H: agents/src/core/registry.ts

The reviewer will read this to see the canonical 61-agent
roster.

- 1 CEO + 10 orchestrators + 50 workers.
- The director's name is galaxy-themed.
- The 10 orchestrators are real galaxies.
- The 50 workers are real star clusters and named sources.
- 5 workers per orchestrator.
- `reportsTo` is a typed string, not a free-text.

Open in the editor: `agents/src/core/registry.ts`. The reviewer
will skim the orchestrator and worker arrays.

### Surface I: agents/src/core/registry.test.ts

The reviewer will read this to see if the 61-agent invariant
is real.

- The test asserts the count: 1 + 10 + 50.
- The test asserts the structure: every worker reports to an
  orchestrator, every orchestrator reports to the director.
- The test fails loudly if a worker is added without a sibling.

Open in the editor: `agents/src/core/registry.test.ts`. The
reviewer will look at the assertion list.

### Surface J: Dockerfile.backend and Dockerfile.python

The reviewer will skim these to see whether the harness ships.

- Both files use multi-stage builds.
- Both files have a HEALTHCHECK.
- Both files have a non-root USER (or are non-root by design).
- Both files COPY a real `tsconfig.build.json` (or pyproject.toml
  in the Python case).

Open in the editor: `Dockerfile.backend` and `Dockerfile.python`.

### Surface K: contracts/schema.json

The reviewer will read this to see the contract.

- It is the single source of truth for TS + Python types.
- It has a `CONTRACT_VERSION` field.
- It covers `AgentRunRequest`, `AgentRunResult`, `AgentEvent`,
  `LlmProvider`, `LlmRequest`, `LlmResponse`.

Open in the editor: `contracts/schema.json`.

## Talking points

The senior engineer who has to defend the repo tomorrow will
need a one-line answer for every likely question. Each
talking point is written so the engineer can say the line
verbatim or paraphrase freely. The questions are framed as
the reviewer might ask them.

### Why this and not LangChain / LangGraph alone?

The harness is not a re-implementation of LangChain or
LangGraph. It is a typed, observable, testable surface
*around* those runtimes, plus a contract, an eval suite,
an audit log, and an approval gate. The harness is what
makes a Mastra / LangGraph system safe to ship to a
regulated customer.

### Why a CEO agent and not a real human?

The CEO here is a routine, not a person. The routine is
"given a 33-task suite, decide which orchestrator handles
which task." That routine belongs in the harness, not in
someone's head. If a human wants to override the CEO, they
can. The policy says so. The CEO is a placeholder for the
operator's strategic direction, not a replacement for it.

### Why an approval gate and not a smarter agent?

Because a smarter agent is the wrong tool for the
high-stakes moments. "Auto-approve a vendor payment under
$1,000" is not a question of intelligence; it is a
question of policy. The harness classifies the action by
name and payload, not by reasoning. The operator makes the
call. The decision is recorded with the policy version
stamped on it. A future auditor can replay the decision
against the policy in force at the time.

### Why a 33-task golden suite and not 10,000?

Because every added task is a maintenance burden. The suite
covers the director, every orchestrator, and a representative
worker. As we add workers, we add tasks. ADR 0002 documents
the policy. The suite is the regression dashboard, not a
benchmark.

### Why a TS and a Python runtime, not just one?

Because the two runtimes are good at different things.
TypeScript (Mastra) is good for typed, structured tool-calling
at low latency. Python (LangGraph) is good for graph-heavy
orchestrators with stateful cycles. The dual runtime is
what gives the harness breadth without forcing a single
language trade-off. The contract (`contracts/schema.json`)
is the seam.

### Why an append-only audit log?

Because the auditor walks in. The auditor does not read the
code; the auditor reads the audit log. Every run, every
state transition, every approval decision is a row in
`run_events`. The row is JSON, append-only, and stamped
with the policy version. A future operator can replay the
decision against the policy in force at the time. The
audit log is the contract the customer signs.

### Why is this a portfolio piece, not a product?

Because the success criterion for the harness is "a senior
reviewer can read the repo end-to-end in one sitting and
understand every architectural choice." The reviewer is the
auditor. If the reviewer can read the repo, the harness is
done. If not, the harness is not done. The harness is
shipping, not selling.

## What to do if a probe fails

If any probe fails, the meeting is over. Stop. Do not try
to explain a failure. Fix the failure. The harness is
complete only when every probe passes. The fix for most
failures is small: a missing file, a wrong version, a stale
SVG. Do the fix, re-run the audit script, confirm green,
then go to the meeting.

## Closing note

The harness is the answer to a real question: how do you
ship a 50-agent system to a customer without losing track
of what each agent did. The answer is: typed contracts,
append-only audit, eval-as-regression, policy-stamped human
gate, dual runtime, galaxy-themed roster. The answer is in
the repo. The reviewer will see the answer, or they will
not. This prompt is the work to make sure they do.
