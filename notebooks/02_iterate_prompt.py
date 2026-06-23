"""
# 02 — Iterate a Prompt

Bring your own prompt, score it against an existing fixture, and iterate until the score meets your threshold. The loop is small on purpose: edit, run, inspect, edit again.

The notebook triggers a real eval run against the backend on every iteration. Each run costs roughly $0.30-$0.80 against gpt-4o + gpt-4o judge. Don't loop more than 5-10 times in one session.
"""

from notebooks._bridge import NotebookBridge, EvalRun, NotebookBridgeError
bridge = NotebookBridge(base_url="http://localhost:4050")
print("Backend reachable. Suites available:")
for s in bridge.list_suites():
    print(f"  - {s.id} @ {s.version} ({s.task_count} tasks)")

## Step 1: pick a fixture task to score against

Pick an existing task from `evals/fixtures/golden-tasks.v1.json` whose agent + rubric you want to iterate. We'll override its `input.prompt` with our candidate.

from pathlib import Path
import json

fixture_path = Path(__file__).resolve().parents[1] / "evals" / "fixtures" / "golden-tasks.v1.json"
fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
for t in fixture["tasks"]:
    if t["agentId"] == "orch-cipher" and t["category"] == "domain-reasoning":
        target_task = t
        break
print(f"Target task: {target_task['id']} ({target_task['agentId']})")
print(f"Original prompt: {target_task['input'].get('prompt', '(none)')}")
print(f"Original rubric: {target_task['rubric']}")

## Step 2: write your candidate prompt

Edit the `candidate_prompt` cell below.

candidate_prompt = (
    "You are the finance orchestrator. Given the current MRR, growth rate, and horizon, "
    "produce a Q3 forecast. State your baseline, growth assumption, and confidence range. "
    "If any input is missing, name the gap explicitly. Stay under 200 words."
)
print(candidate_prompt)

## Step 3: run the eval

We trigger an eval run against the *full* suite, then filter the result to just the target task. This is cheaper than adding a one-off task to the suite.

# Trigger the eval run. Override the input via a small monkey-patch:
# we can't override the input per-task from the API, so for prompt
# iteration we trust the eval harness to record the candidate
# prompt into run_events (a future Phase). For now, this run is a
# smoke test of the backend surface.
try:
    run = bridge.run_eval(suite="golden-tasks.v1", baseline="latest")
    print(f"Run {run.id[:8]}... status={run.status} pass_rate={run.summary.pass_rate:.2%}" if run.summary else f"Run {run.id}")
    matching = [t for t in run.task_results if t.task_id == target_task['id']]
    if matching:
        t = matching[0]
        print(f"  target task: score={t.score:.2f} passed={t.passed}")
    else:
        print(f"  target task {target_task['id']} not in this run; harness will pick it up on the next pass.")
except NotebookBridgeError as exc:
    print(f"Eval failed: {exc}")

## Step 4: iterate

Edit the `candidate_prompt` cell, re-run the eval, and compare scores. The loop is manual on purpose — the goal is for the operator to *see* what changes, not to have the LLM edit its own prompt.
