# Human Walkthrough Demo

> A 15-minute, single-file run-of-show for the TechTideAI company-scale
> agent operating system. Designed for a phone screen-share, a virtual
> interview, or a live demo. Six diagrams, four segments, one closer.
> Read it once before the call. Open it during the call. Print the
> cheat sheet at the end and keep it next to the keyboard.

This document is the source of truth for the demo. It is intentionally
written as run-of-show dialogue so the presenter can read each
segment verbatim, or paraphrase freely, without losing the thread.

**Audience.** A hiring manager, a senior peer, or a customer-side
architect evaluating TechTideAI as a forward-deployed-engineer
deliverable. They have heard the term "agent operating system" but
have not seen one that ships into their environment with receipts.

**Goal.** By the end of the 15 minutes, the audience can repeat back
three things: (1) the company-as-agent mental model, (2) the
policy-stamped audit log, (3) the eval-as-regression-dashboard. If
they remember those three, the rest of the system follows.

**Run of show.**

| When | What | Why |
|---|---|---|
| 0:00 to 2:00 | Cold open: the puzzle | frame the problem, set stakes |
| 2:00 to 5:00 | Segment 1: the mental model | show the company-as-agent shape |
| 5:00 to 8:00 | Segment 2: the human gate | show how risk is gated, not bypassed |
| 8:00 to 11:00 | Segment 3: the eval is the regression dashboard | show the 33-task suite, the threshold, the post-mortem |
| 11:00 to 14:00 | Segment 4: audit replay from any row | show the policyVersion stamp, the append-only log |
| 14:00 to 15:00 | Closer: three things to remember | leave them with the three takeaways |

---

## 0:00 to 2:00, cold open: the puzzle

Open with: "Let me show you a company, and let me show you a problem,
and let me show you how we fix the problem with agents."

Show diagram 1 (`assets/walkthrough/01_puzzle.svg`) and talk over it.
Do not open any code in this segment. Stay on the diagram.

> "I am going to be the forward-deployed engineer. I just walked into
> a 200-person services firm. They have a 200-person services firm
> problem. Every day, the operations team is asking questions. What's
> our SLA breach rate for the last 30 days, by team? Who is on call?
> Should we auto-approve a $900 vendor payment? These questions are
> being answered, sort of, by humans, across three dashboards, a
> ticketing system, and a Slack channel. The answers are not auditable.
> They are not replayable. There is no policy. There is no receipt.
>
> "I am going to ship them a harness. The harness has fifty agents
> in it. The firm is going to run the harness for two years. When
> the auditor walks in, I want to be able to show the auditor
> exactly what each agent did, when, and under which policy.
>
> "Here is how I do it."

Hand off to Segment 1.

## 2:00 to 5:00, Segment 1: the mental model

Open diagram 2 (`assets/walkthrough/02_mental_model.svg`). Stay on it.

> "The mental model is a company. One CEO, ten orchestrators, fifty
> workers. Five workers per orchestrator. The CEO delegates. The
> orchestrators coordinate. The workers do the tool calls.
>
> "Why a leverage pyramid? Because the failure mode of a flat agent
> system is coordination collapse. Fifty agents talking to each other
> in a flat graph: O(n^2) calls, O(n^2) failures, O(n^2) bills. A
> pyramid caps coordination at O(log n). The CEO talks to ten leads.
> Each lead talks to five workers. The workers do the work.
>
> "I have a test for this. The test in
> `agents/src/core/registry.test.ts` asserts one CEO, ten
> orchestrators, fifty workers. If I add an eleventh orchestrator
> without a sibling, the test fails. The test is the spec.
>
> "Notice the names. The CEO is Brian Cozy. The orchestrators are
> named after real jobs. The workers are named after real tools.
> `worker-cipher-fpna` does financial planning and analysis for the
> finance orchestrator. `worker-ava-sops` runs standard operating
> procedures for the operations orchestrator. These are not
> abstractions. They are jobs. The harness hires them the way you
> would hire a person."

If the audience is technical, drop to the shell and show the test:

```bash
pnpm -C agents test -- registry
```

If the audience is non-technical, stay on the diagram.

Hand off to Segment 2.

## 5:00 to 8:00, Segment 2: the human gate

Open diagram 3 (`assets/walkthrough/03_human_gate.svg`). Stay on it.

> "I will now show you what happens when the harness is asked to do
> something dangerous. The customer is going to want a vendor payment
> to be auto-approved. They are going to ask me to enable that. I am
> going to say no, and I am going to show you why.
>
> "Here is the run. It starts queued. It transitions to running. The
> orchestrator `orch-cipher` issues a `vendor-payment` action. The
> action classifier looks at the action string, the payload, and the
> orchestrator. It returns the risk tier: read, write, external,
> destructive, billing. Vendor payment is billing. Billing is in
> the high-risk set. The run pauses. The status is now
> `approval_requested`.
>
> "Pause, not reject. Pause. The system is not saying no. The system
> is saying: a human needs to look at this. The dashboard at
> `/dashboard/approvals` shows the operator a queue. The operator
> reads the rationale, makes the call, and grants or denies. The
> decision is recorded in `run_events` with the policy version
> stamped on the row. When the auditor walks in, we can replay the
> decision against the policy in force at the time.
>
> "This is the only way to ship agents into a regulated business.
> Not by making the agent smarter. By making the harness let a
> human say yes or no to the high-stakes moments, and by giving
> the auditor a paper trail.
>
> "The key file is `backend/src/services/approval-service.ts`. The
> policy is the `ApprovalPolicy` class. The status machine is the
> `StatusTransitionPolicy` class. Both are OCP-extensible. You add
> new risk tiers, you do not mutate the defaults. The default is
> the safe default."

If the audience is technical, show the policy class:

```typescript
import { ApprovalPolicy, defaultApprovalPolicy } from "@techtide/agents";
const policy = defaultApprovalPolicy.extend(["write"]);
// `write` is now a high-risk tier; the next write action pauses.
```

If the audience is non-technical, stay on the diagram.

Hand off to Segment 3.

## 8:00 to 11:00, Segment 3: the eval is the regression dashboard

Open diagram 4 (`assets/walkthrough/04_eval_dashboard.svg`). Stay on it.

> "I have a CEO, ten leads, fifty doers. I have a gate. Now I need
> a way to know whether the system is getting better or worse. I
> do not trust my eyes. I trust a number. The number is a pass rate
> on a frozen set of tasks.
>
> "I have a 33-task golden suite in
> `evals/fixtures/golden-tasks.v1.json`. The tasks cover the CEO,
> every orchestrator, and a representative slice of workers. Every
> night, the harness runs the suite against the live agent
> configuration. The harness scores each task with four scorers:
> `json-schema` (format compliance), `llm-judge` (versioned prompt,
> $1 of judge cost per run), `rubric-weighted` (assertion list), and
> the `four-axis-grader` (correctness, safety, completeness,
> quality). The headline is a weighted mean.
>
> "There is a frozen baseline. The current pass rate is 82%. The
> baseline is 80%. The threshold is 5 percentage points. The
> pass rate is within the threshold. No regression fires.
>
> "If a new model release nudges the pass rate from 82% to 76%, the
> eval fails. The CI Gate fails. The PR cannot merge. The FDE
> knows before the customer knows. There is no Monday morning
> 'the agent got worse' surprise. The eval is the regression
> dashboard.
>
> "And the post-mortem. When a run finishes, the
> `PostMortemService` writes a markdown file to
> `docs/EVALS/post-mortems/<run-id>.md` with the score breakdown,
> the per-task rationale, and the regression summary. The
> operator reads markdown, not a SQL query. The markdown is the
> review surface."

If the audience is technical, show the eval CLI:

```bash
pnpm -C backend evals --suite golden-tasks.v1
```

The output is a table of pass/fail, per-scorer breakdown, and a
post-mortem path. Show the post-mortem file in the editor.

Hand off to Segment 4.

## 11:00 to 14:00, Segment 4: audit replay from any row

Open diagram 5 (`assets/walkthrough/05_audit_replay.svg`). Stay on it.

> "The auditor walks in. The auditor is a regulator. The auditor
> is a customer. The auditor asks: 'In June, who approved a $900
> payment, and what policy were they operating under?' I open the
> `run_events` table, filter to that run, and read five rows.
>
> "The first row says: `run.created`. The orchestrator was
> `orch-cipher`. The policy version was `approval-policy-v1`. The
> second row says: `approval.requested`. The amount was $900. The
> risk tier was billing. The third row says: `approval.granted`. The
> operator was `operator-7`. The fourth row says: `run.succeeded`.
> The output was emitted. The fifth row says: `post_mortem.emitted`.
> The post-mortem is at `docs/EVALS/post-mortems/r-9001.md`.
>
> "Every row carries the policy version. The policy is in the repo.
> The repo is in git. The git is in a signed commit. The signed
> commit is on a server. I can replay the decision against the
> policy in force at the time. If `approval-policy-v2` is in force
> today, the June decision is still under v1. The auditor can see
> exactly which rules applied.
>
> "Three files make this work. The `run_events` table is append-only.
> The `ApprovalPolicy` stamps the version. The `StatusTransitionPolicy`
> is the single source of truth for legal transitions. Extend via
> `extend()`, never mutate the default. The default is the safe
> default."

If the audience is technical, show one run_event row via the API:

```bash
curl -s http://localhost:4050/api/runs/<id>/events | jq '.[0]'
```

Hand off to the closer.

## 14:00 to 15:00, closer: three things to remember

Open diagram 6 (`assets/walkthrough/06_closer.svg`). Stay on it. This
is the slide that closes the demo. The audience takes a screenshot of
this one. The first slide they see on the call is also this one
(show it again on a second monitor if you have one).

> "Three things to remember. One. It is a company. One CEO, ten
> leads, fifty doers, in five-worker pods. The mental model is a
> leverage pyramid. The test in the repo is the spec. Two. Every
> row is an audit row. The log is append-only, every transition
> emits one, every row carries the policy version stamp. Three. The
> eval is the regression dashboard. Thirty-three tasks, four scorers,
> a frozen baseline, a 5% threshold, a post-mortem auto-gen. The
> FDE knows before the customer knows.
>
> "That's the whole harness. One CEO, ten leads, fifty doers, a
> typed audit log, and a regression dashboard. Available in the repo
> at `HUMAN_WALKTHROUGH_DEMO.md`. Fifteen minutes. Six diagrams.
> One job offer."

Take a beat. The next sentence is the only one that matters.

> "Want to see the tests pass?"

Hand off to the cheat sheet for the Q&A.

---

## One-page cheat sheet (print and keep next to the keyboard)

```
========================================================================
TECHTIDAEAI 15-MINUTE WALKTHROUGH DEMO
Presenter:                              Date: ___________
Audience:                               Call type: ___________
========================================================================

RUN OF SHOW
 0:00  Cold open: the puzzle
 2:00  Segment 1: the mental model        [1 + 10 + 50 = 61 agents]
 5:00  Segment 2: the human gate         [billing pauses, risk stamp]
 8:00  Segment 3: the eval is the regression dashboard  [33 tasks, 4 scorers]
11:00  Segment 4: audit replay from any row         [policy version stamp]
14:00  Closer: three things to remember

DIAGRAMS (open in browser tab or VSCode preview, full screen)
 1. Puzzle           assets/walkthrough/01_puzzle.svg
 2. Mental model     assets/walkthrough/02_mental_model.svg
 3. Human gate       assets/walkthrough/03_human_gate.svg
 4. Eval dashboard   assets/walkthrough/04_eval_dashboard.svg
 5. Audit replay     assets/walkthrough/05_audit_replay.svg
 6. Closer           assets/walkthrough/06_closer.svg

KEY COMMANDS (only if audience is technical)
 pnpm run verify                                  # lint + test + build (green)
 pnpm -C backend evals --suite golden-tasks.v1   # run the 33-task suite
 pnpm -C backend sprint --contract evals/sprints/well-scoped-sprint.v1.json
 curl -s http://localhost:4050/api/runs/<id>/events | jq '.[0]'

KEY FILES (only if audience is technical)
 agents/src/core/registry.ts                       # 1 + 10 + 50 invariant
 agents/src/core/approval-policy.ts               # OCP-extensible risk classifier
 backend/src/services/approval-service.ts          # run pause / grant / deny
 backend/src/services/eval-harness.ts              # 33-task golden suite
 backend/src/services/scoring/four-axis-grader.ts  # correctness, safety, completeness, quality
 backend/src/services/post-mortem-service.ts        # markdown post-mortem
 docs/adr/0004-approval-as-execution-boundary.md   # the ADR for the gate
 docs/adr/0001-status-machine.md                   # the ADR for the state machine
 contracts/schema.json                             # TS <-> Python contract

TALKING POINTS (anchor phrases that always land)
 - "It's a company."
 - "Pause, not reject."
 - "The eval is the regression dashboard."
 - "Every row is an audit row."
 - "Future operator vs. policy in force at the time."
 - "The default is the safe default."

ANTICIPATED QUESTIONS (the four you'll always get)
 1. Q: Why is the CEO an agent, not a human?
    A: Because the CEO here is a routine, not a person. The routine
       is "given a 33-task suite, decide which orchestrator handles
       which task." That routine belongs in the harness, not in
       someone's head. If a human wants to override the CEO, they
       can. The policy says so.
 2. Q: What happens if a worker returns something dangerous?
    A: The ApprovalPolicy classifies the action by its name and
       payload, not by the worker's output. A worker that returns
       "delete_customer_record" is gated before the action runs,
       regardless of what reasoning produced it.
 3. Q: Why is the eval a 33-task suite, not 10,000?
    A: Because every added task is a maintenance burden. The suite
       covers the CEO, every orchestrator, and a representative
       worker. As we add workers we add tasks. ADR 0002 documents
       the policy.
 4. Q: What if the model changes?
    A: The eval fails first. The CI Gate fails. The PR cannot merge.
       The FDE knows before the customer knows. The eval is the
       regression dashboard.

========================================================================
Backup plan: if a diagram fails to render, fall back to the README.
        The README has the same five diagrams at full resolution
        in assets/, plus the architecture, control plane, contract
        sync, three-agent loop, and run lifecycle SVGs.
========================================================================
```

## Where this document sits in the repo

This file is the **canonical demo script**. The README links to it
from the about / what-works-today section. The cheat sheet is
intended to be printable on a single page and is the only artifact
the presenter needs to keep next to the keyboard during the call.

## Asset inventory

All walkthrough graphics live under `assets/walkthrough/` as inline
SVG so they render in any markdown viewer that supports images,
no external renderer required.

- `01_puzzle.svg`: the 200-person services firm problem
- `02_mental_model.svg`: 1 CEO + 10 orchestrators + 50 workers
- `03_human_gate.svg`: queued to running to approval_requested to succeeded
- `04_eval_dashboard.svg`: 33-task suite, 4 scorers, 5% threshold
- `05_audit_replay.svg`: `run_events` rows with policyVersion stamps
- `06_closer.svg`: the three takeaways, one slide to close on

## Extending the walkthrough

If the audience asks a question the script does not anticipate, the
right move is to walk them through the matching ADR under `docs/adr/`
and the matching service file under `backend/src/services/`. The
diagrams are anchors, not the whole story. The whole story is in
the repo. The walkthrough is the trailer.
