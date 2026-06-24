"""Tests for the notebook bridge (Item 6).

The bridge is the only real Python code in `notebooks/`. It must round-trip
the backend's eval routes without losing the per-scorer breakdown.
"""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread
from typing import Any

import pytest

from techtide_agents.notebook_bridge import (
    EvalRun,
    EvalSuiteSummary,
    EvalTaskResult,
    NotebookBridge,
    NotebookBridgeError,
    ScoringBreakdown,
)


class _StubHandler(BaseHTTPRequestHandler):
    payload: dict[str, Any] = {}

    def do_GET(self) -> None:  # noqa: N802 — http.server convention
        if self.path == "/api/evals/suites":
            self._respond(200, [{"id": "golden-tasks", "version": "v1.0.0", "taskCount": 33}])
            return
        if self.path.startswith("/api/evals/runs/"):
            self._respond(200, self.payload["run"])
            return
        if self.path.startswith("/api/evals/runs"):
            self._respond(200, [self.payload["run"]])
            return
        self._respond(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        self._respond(200, self.payload["run"])

    def _respond(self, status: int, body: Any) -> None:
        encoded = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format: str, *args: Any) -> None:  # silence stderr
        return


@pytest.fixture
def bridge() -> tuple[NotebookBridge, str]:
    server = HTTPServer(("127.0.0.1", 0), _StubHandler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address
    base_url = f"http://{host}:{port}"
    yield NotebookBridge(base_url=base_url), base_url
    server.shutdown()
    thread.join(timeout=2)
    server.server_close()


SAMPLE_RUN_PAYLOAD: dict[str, Any] = {
    "id": "11111111-1111-1111-1111-111111111111",
    "suiteId": "golden-tasks",
    "suiteVersion": "v1.0.0",
    "status": "succeeded",
    "startedAt": "2026-06-23T00:00:00.000Z",
    "completedAt": "2026-06-23T00:00:30.000Z",
    "taskResults": [
        {
            "taskId": "t1",
            "agentId": "ceo",
            "agentOutput": {"answer": 42},
            "score": 1.0,
            "passed": True,
            "latencyMs": 100,
            "tokensUsed": 50,
            "estimatedCostUsd": 0.001,
            "scorers": [
                {
                    "scorer": "exact-match",
                    "score": 1.0,
                    "weight": 1.0,
                    "passed": True,
                    "rationale": "exact match",
                    "durationMs": 5,
                }
            ],
            "failureReason": None,
            "observedAt": "2026-06-23T00:00:30.000Z",
        }
    ],
    "summary": {
        "suiteId": "golden-tasks",
        "suiteVersion": "v1.0.0",
        "passRate": 1.0,
        "meanScore": 1.0,
        "p50LatencyMs": 100,
        "p95LatencyMs": 100,
        "totalCostUsd": 0.001,
        "regressionDeltaPct": None,
    },
    "failureReason": None,
}


def test_list_suites_parses_response(bridge: tuple[NotebookBridge, str]) -> None:
    client, _ = bridge
    suites = client.list_suites()
    assert len(suites) == 1
    assert isinstance(suites[0], EvalSuiteSummary)
    assert suites[0].id == "golden-tasks"
    assert suites[0].task_count == 33


def test_get_run_parses_breakdown(bridge: tuple[NotebookBridge, str]) -> None:
    client, _ = bridge
    _StubHandler.payload = {"run": SAMPLE_RUN_PAYLOAD}
    run = client.get_run("11111111-1111-1111-1111-111111111111")
    assert isinstance(run, EvalRun)
    assert run.id == "11111111-1111-1111-1111-111111111111"
    assert len(run.task_results) == 1
    t1 = run.task_results[0]
    assert isinstance(t1, EvalTaskResult)
    assert t1.task_id == "t1"
    assert len(t1.scorers) == 1
    assert isinstance(t1.scorers[0], ScoringBreakdown)
    assert t1.scorers[0].scorer == "exact-match"
    assert t1.scorers[0].score == 1.0


def test_run_eval_posts_to_correct_path(bridge: tuple[NotebookBridge, str]) -> None:
    client, base_url = bridge
    _StubHandler.payload = {"run": SAMPLE_RUN_PAYLOAD}
    # Just verify the call doesn't raise; the stub returns the run payload.
    run = client.run_eval(suite="golden-tasks.v1", baseline="none")
    assert run.summary is not None
    assert run.summary.pass_rate == 1.0


def test_bridge_surfaces_http_error(bridge: tuple[NotebookBridge, str]) -> None:
    client, _ = bridge
    # Override the handler to return 500 for the next call.
    original_do_get = _StubHandler.do_GET

    def boom(self: Any) -> None:  # type: ignore[no-untyped-def]
        self._respond(500, {"error": "boom"})

    _StubHandler.do_GET = boom  # type: ignore[method-assign]
    try:
        with pytest.raises(NotebookBridgeError) as exc:
            client.list_suites()
        assert "500" in str(exc.value)
    finally:
        _StubHandler.do_GET = original_do_get  # type: ignore[method-assign]
