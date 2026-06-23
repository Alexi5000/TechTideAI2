"""Contract package — re-exports the generated Pydantic models.

The authoritative types live in ``generated.py`` (produced by
``scripts/sync-contracts.ts`` from ``contracts/schema.json``). DO NOT
hand-edit the generated module.
"""

from .generated import (
    CONTRACT_DEFINITIONS,
    CONTRACT_VERSION,
    AgentEvent,
    AgentEventType,
    AgentRunRequest,
    AgentRunResult,
    LlmProvider,
    LlmRequest,
    LlmResponse,
    LlmUsage,
)

__all__ = [
    "CONTRACT_DEFINITIONS",
    "CONTRACT_VERSION",
    "AgentEvent",
    "AgentRunRequest",
    "AgentRunResult",
    "AgentEventType",
    "LlmProvider",
    "LlmRequest",
    "LlmResponse",
    "LlmUsage",
]
