"""Runtime dispatcher, picks LangGraph vs Mastra per agent.

Default routing:
  - orchestrators → LangGraph (graph-heavy control flow, conditional HITL gates)
  - workers → Mastra (fast, tool-call hot path)
  - ceo → Mastra (configurable)

The dispatch table is read from ``runtime_config.yaml`` at boot. If the config
file is missing, the defaults above are used. Operators can override via the
``TECHTIDE_RUNTIME_CONFIG`` env var.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Any

import yaml


class RuntimeTarget(StrEnum):
    MASTRA = "mastra"
    LANGGRAPH = "langgraph"


@dataclass
class DispatchDecision:
    target: RuntimeTarget
    reason: str


DEFAULT_CONFIG: dict[str, Any] = {
    "version": 1,
    "tiers": {
        "ceo": RuntimeTarget.MASTRA.value,
        "orchestrator": RuntimeTarget.LANGGRAPH.value,
        "worker": RuntimeTarget.MASTRA.value,
    },
    "agents": {},
}


class Dispatcher:
    def __init__(self, config: dict[str, Any] | None = None, *, config_path: Path | None = None) -> None:
        if config is None:
            config = self._load_config(config_path)
        self.config = {**DEFAULT_CONFIG, **config}
        # Deep-merge the `tiers` and `agents` sub-dicts so a partial override
        # (e.g. `{"tiers": {"worker": "mastra"}}`) doesn't blow away the
        # default tier mappings (ceo/orchestrator).
        merged_tiers = {**DEFAULT_CONFIG["tiers"], **config.get("tiers", {})}
        merged_agents = {**DEFAULT_CONFIG["agents"], **config.get("agents", {})}
        self.tiers: dict[str, RuntimeTarget] = {tier: RuntimeTarget(value) for tier, value in merged_tiers.items()}
        self.agents: dict[str, RuntimeTarget] = {
            agent_id: RuntimeTarget(value) for agent_id, value in merged_agents.items()
        }

    @staticmethod
    def _load_config(config_path: Path | None) -> dict[str, Any]:
        # File lives at agents/python/src/techtide_agents/runtime/dispatcher.py.
        # parents[0]=runtime/, [1]=techtide_agents/, [2]=src/, [3]=python/, [4]=agents/.
        # The runtime config lives at the repo's agents/runtime_config.yaml,
        # which is `parents[4] / "runtime_config.yaml"`.
        path = config_path or Path(
            os.environ.get("TECHTIDE_RUNTIME_CONFIG") or Path(__file__).resolve().parents[4] / "runtime_config.yaml"
        )
        if not path.exists():
            return DEFAULT_CONFIG
        with path.open("r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}
        if not isinstance(data, dict):
            return DEFAULT_CONFIG
        return data

    def decide(self, agent_id: str, tier: str) -> DispatchDecision:
        # Agent-specific overrides win over tier defaults.
        if agent_id in self.agents:
            return DispatchDecision(
                target=self.agents[agent_id],
                reason=f"agent {agent_id} explicitly mapped to {self.agents[agent_id].value}",
            )
        if tier in self.tiers:
            return DispatchDecision(
                target=self.tiers[tier],
                reason=f"tier {tier} defaults to {self.tiers[tier].value}",
            )
        return DispatchDecision(
            target=RuntimeTarget.MASTRA,
            reason="no mapping; defaulting to mastra",
        )

    def extend(self, overrides: dict[str, str]) -> Dispatcher:
        merged = {
            "version": self.config.get("version", 1),
            "tiers": dict(self.config.get("tiers", {})),
            "agents": {**self.config.get("agents", {}), **overrides},
        }
        return Dispatcher(merged)
