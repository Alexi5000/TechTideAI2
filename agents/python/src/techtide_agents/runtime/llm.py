"""Thin LLM client that satisfies the contract.

Calls into LangChain's chat-model factories. The backend's `apis` package
mirrors this surface on the TS side so providers stay interchangeable.
"""

from __future__ import annotations

import os
from typing import Any

from techtide_agents.contracts import LlmProvider, LlmRequest, LlmResponse, LlmUsage


class LlmClientError(RuntimeError):
    """Raised when the LLM client cannot complete a request."""


class LlmClient:
    """Provider-agnostic LLM client.

    Lazily imports LangChain chat-model classes so the runtime can boot
    without the heavy deps installed (useful for tests).
    """

    def __init__(self, *, default_provider: LlmProvider | None = None) -> None:
        self.default_provider: LlmProvider | None = default_provider or (
            "openai"
            if os.environ.get("OPENAI_API_KEY")
            else "anthropic"
            if os.environ.get("ANTHROPIC_API_KEY")
            else None
        )

    def generate(self, request: LlmRequest) -> LlmResponse:
        provider = request.provider or self.default_provider
        if provider is None:
            raise LlmClientError("no LLM provider configured; set OPENAI_API_KEY or ANTHROPIC_API_KEY")
        if provider == "openai":
            return self._generate_openai(request)
        return self._generate_anthropic(request)

    def _generate_openai(self, request: LlmRequest) -> LlmResponse:
        try:
            from langchain_openai import ChatOpenAI  # type: ignore
        except ImportError as exc:
            raise LlmClientError("langchain-openai not installed") from exc

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise LlmClientError("OPENAI_API_KEY not set")

        kwargs: dict[str, Any] = {"model": request.model, "api_key": api_key}
        if request.temperature is not None:
            kwargs["temperature"] = request.temperature
        if request.max_tokens is not None:
            kwargs["max_tokens"] = request.max_tokens

        model = ChatOpenAI(**kwargs)
        messages = []
        if request.system:
            messages.append(("system", request.system))
        messages.append(("human", request.input))
        result = model.invoke(messages)
        text = getattr(result, "content", str(result))
        usage = self._extract_usage(result)
        return LlmResponse(provider="openai", model=request.model, text=text, usage=usage)

    def _generate_anthropic(self, request: LlmRequest) -> LlmResponse:
        try:
            from langchain_anthropic import ChatAnthropic  # type: ignore
        except ImportError as exc:
            raise LlmClientError("langchain-anthropic not installed") from exc

        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise LlmClientError("ANTHROPIC_API_KEY not set")

        kwargs: dict[str, Any] = {"model": request.model, "api_key": api_key}
        if request.temperature is not None:
            kwargs["temperature"] = request.temperature
        if request.max_tokens is not None:
            kwargs["max_tokens"] = request.max_tokens

        model = ChatAnthropic(**kwargs)
        messages = []
        if request.system:
            messages.append(("system", request.system))
        messages.append(("human", request.input))
        result = model.invoke(messages)
        text = getattr(result, "content", str(result))
        return LlmResponse(provider="anthropic", model=request.model, text=text)

    @staticmethod
    def _extract_usage(result: Any) -> LlmUsage | None:
        usage = getattr(result, "response_metadata", {}).get("token_usage") or getattr(result, "usage_metadata", None)
        if not usage:
            return None
        return LlmUsage(
            input_tokens=usage.get("input_tokens") or usage.get("prompt_tokens"),
            output_tokens=usage.get("output_tokens") or usage.get("completion_tokens"),
        )
