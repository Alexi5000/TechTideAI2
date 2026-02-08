# Tool: memory-recall

**Description**: Search long-term memory for relevant past interactions, knowledge, and context.

**Inputs (JSON)**
```json
{
  "query": "string (required) — search query for memory recall",
  "agentId": "string (optional) — filter by specific agent ID",
  "limit": "number (optional, 1–50, default 10) — maximum results to return"
}
```

**Outputs (JSON)**
```json
{
  "status": "success",
  "results": [
    {
      "id": "string",
      "content": "string",
      "agentId": "string",
      "timestamp": "ISO 8601 string"
    }
  ],
  "query": "string"
}
```

**Implementation**: `agents/src/mastra/tools/memory-recall.ts`

Uses `InMemoryLongTermMemory` singleton (MVP). Swap to `VectorLongTermMemory` with a Weaviate-backed `VectorStoreAdapter` for production.
