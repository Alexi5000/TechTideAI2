"""LangGraph Runtime — implements the IAgentRuntime contract for orchestrator-tier agents.

Each orchestrator gets a graph with:
  - an intake node (parses request, classifies intent)
  - a planning node (LLM-call: writes a step plan)
  - a delegation node (loops through 5 worker sub-nodes)
  - a synthesis node (LLM-call: composes the final output)
  - a HITL gate (returns an `awaiting-approval` event for high-risk actions)

The graph is intentionally small (4-6 nodes) so a recruiter can read it in
one sitting. Cipher's graph is hand-tuned for the forecast scenario; the
others share a generic builder.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from techtide_agents.contracts import (
    AgentEvent,
    AgentRunRequest,
    AgentRunResult,
    LlmRequest,
)
from techtide_agents.runtime.llm import LlmClient


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


class LangGraphRuntime:
    """Implements the IAgentRuntime contract over a registry of orchestrator graphs."""

    def __init__(
        self,
        *,
        llm: LlmClient | None = None,
        graph_overrides: dict[str, Callable[[AgentRunRequest], AgentRunResult]] | None = None,
    ) -> None:
        self.llm = llm or LlmClient()
        self.graphs: dict[str, Callable[[AgentRunRequest], AgentRunResult]] = (
            graph_overrides or default_orchestrator_graphs(self.llm)
        )

    def execute(self, request: AgentRunRequest) -> AgentRunResult:
        runner = self.graphs.get(request.agent_id)
        if runner is None:
            return AgentRunResult(
                success=False,
                output={},
                events=[
                    AgentEvent(
                        type="error",
                        timestamp=_now_iso(),
                        payload={
                            "error": f"agent '{request.agent_id}' has no LangGraph runtime registered",
                        },
                    )
                ],
                error=f"agent '{request.agent_id}' has no LangGraph runtime registered",
            )
        try:
            return runner(request)
        except Exception as exc:  # noqa: BLE001 — runtime boundary
            return AgentRunResult(
                success=False,
                output={},
                events=[
                    AgentEvent(
                        type="error",
                        timestamp=_now_iso(),
                        payload={"error": str(exc)},
                    )
                ],
                error=str(exc),
            )

    def supports(self, agent_id: str) -> bool:
        return agent_id in self.graphs


def default_orchestrator_graphs(llm: LlmClient) -> dict[str, Callable[[AgentRunRequest], AgentRunResult]]:
    """Build the default graph for every orchestrator id in the registry."""
    graphs: dict[str, Callable[[AgentRunRequest], AgentRunResult]] = {
        "orch-veronica": make_synthesis_graph("Executive Orchestration", llm),
        "orch-ava": make_synthesis_graph("Operations & Administration", llm),
        "orch-finn": make_synthesis_graph("Internal Support & HR", llm),
        "orch-cipher": make_cipher_graph(llm),
        "orch-axel": make_synthesis_graph("Sales & Lead Generation", llm),
        "orch-luna": make_synthesis_graph("Content & Communications", llm),
        "orch-ellie": make_synthesis_graph("Market Intelligence", llm),
        "orch-veronica-lite": make_synthesis_graph("Lightweight Triage", llm),
        "orch-audit": make_synthesis_graph("Audit & Compliance", llm),
        "orch-content": make_synthesis_graph("Content Distribution", llm),
    }
    return graphs


def make_synthesis_graph(domain: str, llm: LlmClient) -> Callable[[AgentRunRequest], AgentRunResult]:
    """Generic 4-node orchestrator graph: intake → plan → delegate → synthesize.

    The "delegate" step is symbolic — workers run on Mastra in production. The
    Python runtime plans the delegation and returns a structured output that
    the Mastra runtime can act on.
    """

    def runner(request: AgentRunRequest) -> AgentRunResult:
        events: list[AgentEvent] = []
        events.append(
            AgentEvent(type="message", timestamp=_now_iso(), payload={"phase": "intake", "agentId": request.agent_id})
        )
        plan = _plan(request)
        events.append(AgentEvent(type="message", timestamp=_now_iso(), payload={"phase": "plan", "plan": plan}))

        # Optional HITL gate: if input.action is high-risk, return approval_required.
        action = request.input.get("action") if isinstance(request.input, dict) else None
        if isinstance(action, str) and action in {"delete_record", "issue_payment", "send_email"}:
            approval_id = str(uuid4())
            events.append(
                AgentEvent(
                    type="approval_requested",
                    timestamp=_now_iso(),
                    payload={"approvalId": approval_id, "action": action},
                )
            )
            return AgentRunResult(
                success=True,
                output={"phase": "awaiting-approval", "approvalId": approval_id, "plan": plan},
                events=events,
                approval_id=approval_id,
            )

        # Synthesize a structured response.
        prompt = _build_synthesis_prompt(domain, request, plan)
        text = _safe_generate(llm, prompt)
        events.append(
            AgentEvent(type="message", timestamp=_now_iso(), payload={"phase": "synthesis", "length": len(text)})
        )
        return AgentRunResult(
            success=True,
            output={"domain": domain, "plan": plan, "synthesis": text},
            events=events,
        )

    return runner


def make_cipher_graph(llm: LlmClient) -> Callable[[AgentRunRequest], AgentRunResult]:
    """Hand-tuned forecast / margin / cost graph for the Cipher orchestrator.

    Steps:
      1. Intake — extract financial inputs.
      2. Compute — apply deterministic formulas (compound growth, margins).
      3. LLM — produce a narrative + risk callout from the numbers.
      4. Gate — if a `cost_optimization` action is requested, return
         `awaiting-approval` because cost decisions are externally observable.
    """

    def runner(request: AgentRunRequest) -> AgentRunResult:
        events: list[AgentEvent] = []
        events.append(
            AgentEvent(type="message", timestamp=_now_iso(), payload={"phase": "intake", "domain": "Finance"})
        )

        inputs = _as_dict(request.input)
        action = inputs.get("action") if isinstance(inputs, dict) else None

        # Cost-optimization gate (high-risk; external observers notice).
        if action == "cost_optimization":
            approval_id = str(uuid4())
            events.append(
                AgentEvent(
                    type="approval_requested",
                    timestamp=_now_iso(),
                    payload={"approvalId": approval_id, "action": action, "tier": "external"},
                )
            )
            return AgentRunResult(
                success=True,
                output={"phase": "awaiting-approval", "approvalId": approval_id},
                events=events,
                approval_id=approval_id,
            )

        # Deterministic compute layer.
        numbers = _compute_financials(inputs)
        events.append(
            AgentEvent(type="message", timestamp=_now_iso(), payload={"phase": "compute", "numbers": numbers})
        )

        # Narrative layer.
        prompt = _build_cipher_narrative_prompt(inputs, numbers)
        narrative = _safe_generate(llm, prompt)
        events.append(
            AgentEvent(type="message", timestamp=_now_iso(), payload={"phase": "narrative", "length": len(narrative)})
        )

        return AgentRunResult(
            success=True,
            output={"numbers": numbers, "narrative": narrative},
            events=events,
        )

    return runner


# ---- helpers ------------------------------------------------------------


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _plan(request: AgentRunRequest) -> dict[str, Any]:
    inputs = _as_dict(request.input)
    return {
        "agentId": request.agent_id,
        "intent": inputs.get("intent") or inputs.get("prompt") or "unspecified",
        "delegations": _suggest_delegations(request.agent_id, inputs),
    }


def _suggest_delegations(agent_id: str, inputs: dict[str, Any]) -> list[str]:
    """Map an orchestrator to its 5-worker pod.

    Source of truth is `agents/src/core/registry.ts` — the workers are
    grouped by `reportsTo`. When a worker is added to the registry, this
    map must be updated. The CI `pytest` for the runtime asserts the
    invariant that each orchestrator has exactly 5 workers (see
    `agents/src/core/registry.test.ts`); the pod map below is the Python
    mirror of that invariant and is exercised in
    `tests/test_langgraph_runtime.py::test_pod_map_matches_registry_invariant`.

    If you add a new orchestrator, add its pod here. If you add a worker
    to an existing orchestrator, replace the placeholder `unknown-{n}`.
    """
    pod_map: dict[str, list[str]] = {
        "orch-veronica": [
            "worker-research",
            "worker-qa",
            "worker-data",
            "worker-automation",
            "worker-ux",
        ],
        "orch-ava": [
            "worker-ava-sops",
            "worker-ava-routing",
            "worker-ava-docs",
            "worker-ava-procurement",
            "worker-ava-quality",
        ],
        "orch-finn": [
            "worker-finn-recruiting",
            "worker-finn-onboarding",
            "worker-finn-policy",
            "worker-finn-culture",
            "worker-finn-support",
        ],
        "orch-cipher": [
            "worker-cipher-fpna",
            "worker-cipher-billing",
            "worker-cipher-cost",
            "worker-cipher-dashboard",
            "worker-cipher-risk",
        ],
        "orch-axel": [
            "worker-axel-prospecting",
            "worker-axel-outbound",
            "worker-axel-crm",
            "worker-axel-proposals",
            "worker-axel-enablement",
        ],
        "orch-luna": [
            "worker-luna-audience",
            "worker-luna-campaign",
            "worker-luna-content",
            "worker-luna-distribution",
            "worker-luna-analytics",
        ],
        "orch-ellie": [
            "worker-ellie-intake",
            "worker-ellie-scheduling",
            "worker-ellie-knowledge",
            "worker-ellie-voice",
            "worker-ellie-accounts",
        ],
        "orch-veronica-lite": [
            "worker-vlite-onboarding",
            "worker-vlite-config",
            "worker-vlite-security",
            "worker-vlite-success",
            "worker-vlite-support",
        ],
        "orch-audit": [
            "worker-audit-process",
            "worker-audit-roi",
            "worker-audit-compliance",
            "worker-audit-instrumentation",
            "worker-audit-remediation",
        ],
        "orch-content": [
            "worker-content-case",
            "worker-content-playbooks",
            "worker-content-metrics",
            "worker-content-repurpose",
            "worker-content-distribution",
        ],
    }
    if agent_id in pod_map:
        return pod_map[agent_id]
    # Fallback for an unknown orchestrator. The Python runtime's contract
    # is "return 5 names"; a future contributor adding a new orchestrator
    # will get placeholder names here until they update the map.
    return [f"unknown-{i}" for i in range(1, 6)]


def _build_synthesis_prompt(domain: str, request: AgentRunRequest, plan: dict[str, Any]) -> str:
    return (
        f"You are the {domain} orchestrator.\n"
        f"Plan: {plan}\n"
        f"Input: {_as_dict(request.input)}\n"
        "Produce a structured response that names: 1) what you decided, "
        "2) which workers will execute, 3) the deliverable."
    )


def _compute_financials(inputs: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    if "currentMRR" in inputs and "growthRate" in inputs and "horizonMonths" in inputs:
        try:
            current = float(inputs["currentMRR"])
            rate = float(inputs["growthRate"])
            months = int(inputs["horizonMonths"])
            series = [round(current * (1 + rate) ** m, 2) for m in range(months + 1)]
            out["forecastSeries"] = series
            out["projectedMRR"] = series[-1]
        except (TypeError, ValueError):
            out["forecastError"] = "invalid numeric input for forecast"
    if "revenue" in inputs and "cogs" in inputs:
        try:
            rev = float(inputs["revenue"])
            cogs = float(inputs["cogs"])
            out["grossMargin"] = round((rev - cogs) / rev, 4) if rev else None
        except (TypeError, ValueError):
            pass
    if "revenue" in inputs and "cogs" in inputs and "operatingExpenses" in inputs:
        try:
            rev = float(inputs["revenue"])
            cogs = float(inputs["cogs"])
            opex = float(inputs["operatingExpenses"])
            out["operatingMargin"] = round((rev - cogs - opex) / rev, 4) if rev else None
        except (TypeError, ValueError):
            pass
    if "pipelineByStage" in inputs and "historicalWinRates" in inputs and "quota" in inputs:
        try:
            weighted = 0.0
            for stage in inputs["pipelineByStage"]:
                amount = float(stage.get("amount", 0))
                win = float(inputs["historicalWinRates"].get(stage.get("stage"), 0))
                weighted += amount * win
            quota = float(inputs["quota"])
            out["weightedPipeline"] = round(weighted, 2)
            out["coverageRatio"] = round(weighted / quota, 4) if quota else None
        except (TypeError, ValueError, AttributeError):
            pass
    return out


def _build_cipher_narrative_prompt(inputs: dict[str, Any], numbers: dict[str, Any]) -> str:
    return (
        "You are Cipher, the Finance & Data Analysis orchestrator.\n"
        f"Inputs: {inputs}\n"
        f"Computed: {numbers}\n"
        "Produce a 3-paragraph narrative covering: (1) the headline number, "
        "(2) the leading indicator that drove it, (3) the risk that could invalidate it."
    )


def _safe_generate(llm: LlmClient, prompt: str) -> str:
    try:
        response = llm.generate(
            LlmRequest(
                provider="openai",
                model="gpt-4o",
                input=prompt,
                temperature=0,
                max_tokens=400,
            )
        )
        return response.text
    except Exception as exc:  # noqa: BLE001 — surface upstream failure as a stub
        return f"[llm unavailable: {exc}]"
