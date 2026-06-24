"""Dispatcher tests, routing logic and config merging."""

from __future__ import annotations

from techtide_agents.runtime.dispatcher import Dispatcher, RuntimeTarget


def test_defaults_route_orchestrator_to_langgraph() -> None:
    dispatcher = Dispatcher()
    decision = dispatcher.decide("orch-cipher", "orchestrator")
    assert decision.target is RuntimeTarget.LANGGRAPH


def test_defaults_route_worker_to_mastra() -> None:
    dispatcher = Dispatcher()
    decision = dispatcher.decide("cipher-1", "worker")
    assert decision.target is RuntimeTarget.MASTRA


def test_agent_override_wins_over_tier() -> None:
    dispatcher = Dispatcher(
        {
            "version": 1,
            "tiers": {"orchestrator": "mastra"},
            "agents": {"orch-cipher": "langgraph"},
        }
    )
    decision = dispatcher.decide("orch-cipher", "orchestrator")
    assert decision.target is RuntimeTarget.LANGGRAPH
    assert "explicitly mapped" in decision.reason


def test_unknown_tier_defaults_to_mastra() -> None:
    dispatcher = Dispatcher()
    decision = dispatcher.decide("some-agent", "novel-tier")
    assert decision.target is RuntimeTarget.MASTRA


def test_extend_returns_new_dispatcher() -> None:
    base = Dispatcher({"version": 1, "tiers": {"worker": "mastra"}, "agents": {}})
    extended = base.extend({"orch-cipher": "mastra"})
    assert extended.decide("orch-cipher", "orchestrator").target is RuntimeTarget.MASTRA
    # Original unchanged.
    assert base.decide("orch-cipher", "orchestrator").target is RuntimeTarget.LANGGRAPH
