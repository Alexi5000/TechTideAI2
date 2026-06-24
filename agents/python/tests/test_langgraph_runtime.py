"""LangGraphRuntime tests, exercise the contract surface."""

from __future__ import annotations

import pytest

from techtide_agents.contracts import AgentRunRequest
from techtide_agents.runtime.langgraph_runtime import LangGraphRuntime


@pytest.fixture
def runtime() -> LangGraphRuntime:
    return LangGraphRuntime()


def test_runtime_rejects_unknown_agent(runtime: LangGraphRuntime) -> None:
    request = AgentRunRequest(agent_id="unknown-agent", input={})
    result = runtime.execute(request)
    assert not result.success
    assert result.error is not None
    assert "no LangGraph runtime" in result.error


def test_cipher_graph_produces_financial_numbers(runtime: LangGraphRuntime) -> None:
    request = AgentRunRequest(
        agent_id="orch-cipher",
        input={
            "currentMRR": 120000,
            "growthRate": 0.08,
            "horizonMonths": 12,
        },
    )
    result = runtime.execute(request)
    assert result.success
    numbers = result.output["numbers"]
    assert numbers["forecastSeries"][0] == 120000
    assert numbers["forecastSeries"][-1] == pytest.approx(304678.92, rel=0.01)
    assert result.output["narrative"]


def test_cipher_graph_gates_cost_optimization(runtime: LangGraphRuntime) -> None:
    request = AgentRunRequest(
        agent_id="orch-cipher",
        input={"action": "cost_optimization"},
    )
    result = runtime.execute(request)
    assert result.success
    assert result.approval_id is not None
    assert any(event.type == "approval_requested" for event in result.events)


def test_generic_synthesis_graph_returns_plan_and_synthesis(runtime: LangGraphRuntime) -> None:
    request = AgentRunRequest(
        agent_id="orch-ava",
        input={"prompt": "audit the SOPs"},
    )
    result = runtime.execute(request)
    assert result.success
    assert result.output["domain"]
    assert len(result.output["plan"]["delegations"]) == 5


def test_high_risk_action_returns_approval(runtime: LangGraphRuntime) -> None:
    request = AgentRunRequest(
        agent_id="orch-ava",
        input={"action": "delete_record"},
    )
    result = runtime.execute(request)
    assert result.success
    assert result.approval_id is not None
    assert any(event.type == "approval_requested" for event in result.events)
