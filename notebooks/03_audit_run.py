"""
# 03 — Audit a Run

Pull a single eval run by id and inspect its per-scorer breakdown. Useful when a regression alert fires or when an operator asks "why did this run fail?"

This notebook does not call the LLM. It is the cheapest notebook in the surface; safe to run in CI smoke tests.
"""

from notebooks._bridge import NotebookBridge
bridge = NotebookBridge(base_url="http://localhost:4050")
runs = bridge.list_runs(limit=10)
for r in runs:
    summary = r.summary
    pass_rate = f"{summary.pass_rate:.0%}" if summary else "—"
    print(f"  {r.id[:8]}  {r.suite_id}  {r.status:10s}  pass={pass_rate}  {r.started_at}")

# Pick a run to audit. The first run is the most recent.
run_id = runs[0].id if runs else None
if not run_id:
    raise SystemExit("No eval runs to audit; trigger one first.")
run = bridge.get_run(run_id)
print(f"Run {run.id}")
print(f"  status: {run.status}")
print(f"  suite:  {run.suite_id} @ {run.suite_version}")
if run.summary:
    print(f"  pass rate:        {run.summary.pass_rate:.2%}")
    print(f"  mean score:       {run.summary.mean_score:.3f}")
    print(f"  total cost:       ${run.summary.total_cost_usd:.4f}")
    print(f"  regression delta: {run.summary.regression_delta_pct}")

print("Per-task breakdown:")
for t in run.task_results:
    status = "PASS" if t.passed else "FAIL"
    reason = t.failure_reason or ""
    print(f"  [{status}] {t.task_id:34s} score={t.score:.3f}  {reason[:80]}")

# Per-scorer breakdown for a single failing task.
failing = [t for t in run.task_results if not t.passed]
if failing:
    focus = failing[0]
    print(f"Focus: {focus.task_id}")
    for s in focus.scorers:
        verdict = "PASS" if s.passed else "FAIL"
        print(f"  [{verdict}] {s.scorer:20s} score={s.score:.3f}  weight={s.weight:.2f}  {s.rationale[:100]}")
else:
    print("No failing tasks in this run.")
