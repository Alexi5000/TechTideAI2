"""
# 01 — Author a Golden Task

Walk a new golden task from idea to fixture. The notebook talks to the backend via `notebooks._bridge` (a thin HTTP client around `/api/evals/*`). When you're happy with the task, paste it into `evals/fixtures/golden-tasks.v1.json` and run `pnpm -C backend evals --suite golden-tasks.v1` to confirm the schema is valid and the harness can score it.

**This is the authoring surface, not the runtime.** The `*.ipynb` is reviewed as `*.py` via `scripts/convert-notebooks.py`. The harness itself never runs the notebook.
"""

from notebooks._bridge import NotebookBridge, EvalSuiteSummary, NotebookBridgeError
import json

bridge = NotebookBridge(base_url="http://localhost:4050")
suites = bridge.list_suites()
for s in suites:
    print(f"  {s.id} @ {s.version} — {s.task_count} tasks")

# ## Draft a new task
#
# Edit the cell below. The `expected` shape follows `EvalExpected` from `agents/src/runtime/contract-types.generated.ts`.

new_task = {
    "id": "<your-task-id>",
    "agentId": "orch-cipher",
    "tier": "orchestrator",
    "category": "domain-reasoning",
    "difficulty": 2,
    "input": {
        "prompt": "Draft a one-paragraph forecast for Q3."
    },
    "expected": {
        "rubric": "Mentions a baseline, a growth assumption, and a confidence interval.",
        "assertions": [
            "Names a baseline number",
            "States a growth assumption explicitly",
            "Includes a confidence range"
        ]
    },
    "rubric": "Forecast draft that explicitly names a baseline, a growth assumption, and a confidence range. Stays under 200 words.",
    "tags": ["forecast", "q3"],
    "timeoutMs": 30000
}
print(json.dumps(new_task, indent=2))

# ## Validate against the schema
#
# The notebook reads `evals/fixtures/golden-tasks.v1.json` directly so you can sanity-check shape compatibility.

from pathlib import Path
import json

fixture_path = Path(__file__).resolve().parents[1] / "evals" / "fixtures" / "golden-tasks.v1.json"
fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
fixture_keys = set(fixture["tasks"][0].keys())
new_keys = set(new_task.keys())
missing = fixture_keys - new_keys
extra = new_keys - fixture_keys
print("fixture keys: ", sorted(fixture_keys))
print("your keys:   ", sorted(new_keys))
print("missing:     ", sorted(missing) or "(none)")
print("extra:       ", sorted(extra) or "(none)")
assert not missing, f"Missing required keys: {missing}"

# ## Next steps
#
# 1. Save your task by appending to `evals/fixtures/golden-tasks.v1.json`.
# 2. Bump the suite's `version` field (e.g. `v1.0.0` → `v1.1.0`).
# 3. Run `pnpm -C backend evals --suite golden-tasks.v1 --concurrency 1` to confirm the harness scores it correctly.
# 4. Commit the change. The next nightly CI run will pick it up and the dashboard will show the new task's score alongside the others.
