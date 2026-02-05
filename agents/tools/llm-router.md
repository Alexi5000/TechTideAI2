# Tool: llm-router

**Description**: Routes generation requests to the correct model/provider with policy enforcement.

**Inputs (JSON)**
```json
{
  "provider": "openai | anthropic",
  "model": "string",
  "input": "string",
  "system": "string (optional)",
  "temperature": 0.2,
  "maxTokens": 1024
}
```

**Outputs (JSON)**
```json
{
  "provider": "string",
  "model": "string",
  "text": "string"
}
```
