"""Runtime package — the Python implementation of ``IAgentRuntime``.

The runtime is registered as a backend destination for orchestrator-tier agents
via the dispatcher. Workers continue to run on Mastra (TypeScript); orchestrators
with graph-heavy control flow (multi-step tool use, conditional HITL gates,
nested sub-graphs) run here.

Heavy imports (langgraph, langchain_openai, etc.) are gated behind functions so
importing this package does not eagerly load them.
"""

from __future__ import annotations

from .dispatcher import DispatchDecision, Dispatcher, RuntimeTarget
from .langgraph_runtime import LangGraphRuntime
from .llm import LlmClient, LlmClientError

__all__ = [
    "Dispatcher",
    "DispatchDecision",
    "RuntimeTarget",
    "LangGraphRuntime",
    "LlmClient",
    "LlmClientError",
]
