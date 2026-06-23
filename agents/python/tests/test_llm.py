"""LlmClient tests — provider selection and error surface."""

from __future__ import annotations

import pytest

from techtide_agents.contracts import LlmRequest
from techtide_agents.runtime.llm import LlmClient, LlmClientError


def test_no_provider_configured_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    client = LlmClient()
    with pytest.raises(LlmClientError):
        client.generate(LlmRequest(provider="openai", model="gpt-4o", input="hi"))


def test_anthropic_missing_key_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    client = LlmClient()
    with pytest.raises(LlmClientError):
        client.generate(LlmRequest(provider="anthropic", model="claude-3-5-sonnet-20241022", input="hi"))
