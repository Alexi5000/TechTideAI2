# Tool: market-intel

**Description**: Summarizes market/competitive intelligence using knowledge-base evidence.

**Inputs (JSON)**
```json
{
  "query": "string",
  "provider": "openai | anthropic (optional)",
  "model": "string (optional)",
  "collections": ["market-intel"]
}
```

**Outputs (JSON)**
```json
{
  "summary": "string",
  "sources": [
    { "title": "string", "source": "string", "documentId": "string", "chunkId": "string" }
  ],
  "matches": [
    { "content": "string", "documentId": "string", "chunkId": "string" }
  ],
  "provider": "string",
  "model": "string"
}
```
