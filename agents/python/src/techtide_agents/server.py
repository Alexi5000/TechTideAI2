"""FastAPI sidecar for the Python runtime.

The backend's `agent-execution-service` POSTs ``AgentRunRequest`` here when
the dispatcher routes an agent to ``langgraph``. The sidecar runs the
LangGraph runtime and returns an ``AgentRunResult``.

This module is optional, install with ``pip install techtide-agents[server]``.

Run locally:
    SIDECAR_PORT=4051 uvicorn techtide_agents.server:app --host 0.0.0.0 --port 4051
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from techtide_agents.contracts import AgentRunRequest, AgentRunResult
from techtide_agents.runtime.dispatcher import Dispatcher, RuntimeTarget
from techtide_agents.runtime.langgraph_runtime import LangGraphRuntime

app = FastAPI(title="TechTideAI Python Sidecar", version="0.3.0")
_runtime: LangGraphRuntime | None = None
_dispatcher: Dispatcher | None = None


def _get_runtime() -> LangGraphRuntime:
    global _runtime
    if _runtime is None:
        _runtime = LangGraphRuntime()
    return _runtime


def _get_dispatcher() -> Dispatcher:
    global _dispatcher
    if _dispatcher is None:
        _dispatcher = Dispatcher()
    return _dispatcher


@app.get("/healthz")
def healthz() -> dict[str, str]:
    runtime = _get_runtime()
    return {
        "status": "ok",
        "service": "techtideai-python-sidecar",
        "agents": ",".join(sorted(runtime.graphs.keys())),
    }


class RunRequest(BaseModel):
    request: AgentRunRequest


class RunResponse(BaseModel):
    result: AgentRunResult
    target: str


@app.post("/run", response_model=RunResponse)
def run(payload: RunRequest) -> RunResponse:
    runtime = _get_runtime()
    dispatcher = _get_dispatcher()
    decision = dispatcher.decide(payload.request.agent_id, tier="orchestrator")
    if decision.target is not RuntimeTarget.LANGGRAPH:
        raise HTTPException(
            status_code=409,
            detail=f"agent {payload.request.agent_id} not routed to langgraph ({decision.reason})",
        )
    if not runtime.supports(payload.request.agent_id):
        raise HTTPException(
            status_code=404,
            detail=f"agent {payload.request.agent_id} has no graph registered",
        )
    result = runtime.execute(payload.request)
    return RunResponse(result=result, target=decision.target.value)


class DispatchQuery(BaseModel):
    agent_id: str
    tier: str = "orchestrator"


@app.post("/dispatch")
def dispatch(query: DispatchQuery) -> dict[str, str]:
    decision = _get_dispatcher().decide(query.agent_id, query.tier)
    return {"agent_id": query.agent_id, "tier": query.tier, "target": decision.target.value, "reason": decision.reason}
