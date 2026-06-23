"""Bridge between the notebook authoring surface and the TechTideAI backend.

Notebooks in `notebooks/` are *authoring surfaces* — they iterate on golden
tasks, prompts, and rubrics interactively. The bridge is a thin typed
client around the backend's eval routes so the notebooks can:

  - list the available suites
  - trigger an eval run
  - fetch a run's per-task scoring breakdown

The bridge is the only Python file in `notebooks/` that is real code (not
JSON). The notebooks are the authoring surface; the bridge is the
reviewable artifact. The conversion script (`scripts/convert-notebooks.py`)
emits a sibling `.py` for each `.ipynb` so reviewers see Python.

Why a bridge, not direct imports? The eval harness runs in the backend
process (TypeScript on Node 20); the notebook runs in the user's local
Jupyter kernel. Bridging over HTTP keeps the runtime boundary clean: the
notebook never imports a TS module, and the backend never has to ship a
Python wheel.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
import json
import urllib.error
import urllib.request


@dataclass(frozen=True)
class EvalSuiteSummary:
    id: str
    version: str
    task_count: int


@dataclass(frozen=True)
class ScoringBreakdown:
    scorer: str
    score: float
    weight: float
    passed: bool
    rationale: str
    duration_ms: int

    @classmethod
    def from_api(cls, payload: dict[str, Any]) -> "ScoringBreakdown":
        return cls(
            scorer=payload["scorer"],
            score=float(payload["score"]),
            weight=float(payload["weight"]),
            passed=bool(payload["passed"]),
            rationale=str(payload["rationale"]),
            duration_ms=int(payload["durationMs"]),
        )


@dataclass(frozen=True)
class EvalTaskResult:
    task_id: str
    agent_id: str
    score: float
    passed: bool
    failure_reason: str | None
    scorers: list[ScoringBreakdown] = field(default_factory=list)

    @classmethod
    def from_api(cls, payload: dict[str, Any]) -> "EvalTaskResult":
        return cls(
            task_id=str(payload["taskId"]),
            agent_id=str(payload["agentId"]),
            score=float(payload["score"]),
            passed=bool(payload["passed"]),
            failure_reason=payload.get("failureReason"),
            scorers=[ScoringBreakdown.from_api(s) for s in payload.get("scorers", [])],
        )


@dataclass(frozen=True)
class EvalRunSummary:
    pass_rate: float
    mean_score: float
    total_cost_usd: float
    regression_delta_pct: float | None


@dataclass(frozen=True)
class EvalRun:
    id: str
    suite_id: str
    suite_version: str
    status: str
    started_at: str
    completed_at: str | None
    task_results: list[EvalTaskResult]
    summary: EvalRunSummary | None
    failure_reason: str | None

    @classmethod
    def from_api(cls, payload: dict[str, Any]) -> "EvalRun":
        summary = payload.get("summary")
        return cls(
            id=str(payload["id"]),
            suite_id=str(payload["suiteId"]),
            suite_version=str(payload["suiteVersion"]),
            status=str(payload["status"]),
            started_at=str(payload["startedAt"]),
            completed_at=payload.get("completedAt"),
            task_results=[EvalTaskResult.from_api(t) for t in payload.get("taskResults", [])],
            summary=(
                EvalRunSummary(
                    pass_rate=float(summary["passRate"]),
                    mean_score=float(summary["meanScore"]),
                    total_cost_usd=float(summary["totalCostUsd"]),
                    regression_delta_pct=(
                        float(summary["regressionDeltaPct"])
                        if summary.get("regressionDeltaPct") is not None
                        else None
                    ),
                )
                if summary
                else None
            ),
            failure_reason=payload.get("failureReason"),
        )


class NotebookBridgeError(RuntimeError):
    """Raised when the backend returns a non-2xx response."""


class NotebookBridge:
    """Typed Python client for the backend's eval routes."""

    def __init__(self, base_url: str = "http://localhost:4050", timeout_s: float = 60.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_s = timeout_s

    def list_suites(self) -> list[EvalSuiteSummary]:
        payload = self._get("/api/evals/suites")
        return [
            EvalSuiteSummary(
                id=str(p["id"]),
                version=str(p["version"]),
                task_count=int(p["taskCount"]),
            )
            for p in payload
        ]

    def list_runs(self, suite: str | None = None, limit: int = 20) -> list[EvalRun]:
        params: list[str] = [f"limit={limit}"]
        if suite:
            params.append(f"suite={suite}")
        payload = self._get(f"/api/evals/runs?{'&'.join(params)}")
        return [EvalRun.from_api(p) for p in payload]

    def get_run(self, run_id: str) -> EvalRun:
        return EvalRun.from_api(self._get(f"/api/evals/runs/{run_id}"))

    def run_eval(
        self,
        suite: str = "golden-tasks.v1",
        baseline: str = "latest",
        concurrency: int = 1,
        judge_model: str = "gpt-4o",
    ) -> EvalRun:
        params = (
            f"suite={suite}&baseline={baseline}"
            f"&concurrency={concurrency}&judgeModel={judge_model}"
        )
        return EvalRun.from_api(self._post(f"/api/evals/run?{params}"))

    # ---- HTTP helpers ----

    def _get(self, path: str) -> Any:
        request = urllib.request.Request(
            f"{self._base_url}{path}",
            method="GET",
            headers={"Accept": "application/json"},
        )
        return self._dispatch(request)

    def _post(self, path: str) -> Any:
        request = urllib.request.Request(
            f"{self._base_url}{path}",
            method="POST",
            headers={"Accept": "application/json"},
        )
        return self._dispatch(request)

    def _dispatch(self, request: urllib.request.Request) -> Any:
        try:
            with urllib.request.urlopen(request, timeout=self._timeout_s) as response:
                body = response.read().decode("utf-8")
                return json.loads(body)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise NotebookBridgeError(
                f"{request.method} {request.full_url} returned {exc.code}: {detail}"
            ) from exc
        except urllib.error.URLError as exc:
            raise NotebookBridgeError(
                f"{request.method} {request.full_url} failed: {exc.reason}"
            ) from exc
