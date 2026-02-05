from __future__ import annotations

from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI

load_dotenv()


def create_openai_chat(model: str = "gpt-4o-mini") -> ChatOpenAI:
    return ChatOpenAI(model=model)


def create_anthropic_chat(model: str = "claude-3-5-sonnet-latest") -> ChatAnthropic:
    return ChatAnthropic(model=model)
