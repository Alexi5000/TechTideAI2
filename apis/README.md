# @techtide/apis

Provider-agnostic LLM adapters for TechTideAI.

## Providers

| Provider | Module | API |
|----------|--------|-----|
| OpenAI | `openai.ts` | **Responses API** (`client.responses.create`), not Chat Completions |
| Anthropic | `anthropic.ts` | Messages API |

## Source Layout

```
src/
├── index.ts         Barrel export
├── openai.ts        OpenAI adapter
├── anthropic.ts     Anthropic adapter
├── retry.ts         Retry utility with configurable backoff
└── types.ts         Shared types (LLMRequest, LLMResponse, etc.)
```

## Retry

The `retry.ts` module provides a generic retry wrapper with exponential backoff. All provider adapters use it for resilient API calls.

## Commands

```bash
pnpm build          # Compile TypeScript
pnpm lint           # ESLint
pnpm test           # Run Vitest suite
```

## Testing

Tests are co-located (`*.test.ts`). Each provider adapter and the retry utility have dedicated test files.
