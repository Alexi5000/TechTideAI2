"""TechTideAI Python agent runtime.

Public surface:
- ``runtime.LangGraphRuntime``, implements the IAgentRuntime contract for
  orchestrator-tier agents. Backend POSTs ``AgentRunRequest`` here when the
  dispatcher routes an agent to Python instead of Mastra.
- ``runtime.Dispatcher``, selects the right runtime per agent based on
  ``runtime_config.yaml``.
- ``server``, FastAPI sidecar that exposes ``POST /run`` and ``GET /healthz``.

Importing this package does not pull in LangGraph or LangChain eagerly; the
runtime module imports them lazily so cold-start stays cheap.
"""

from __future__ import annotations

__version__ = "0.5.0"
