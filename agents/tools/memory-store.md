# Tool: memory-store

**Description**: Persist important information, insights, or context to long-term memory for future recall.

**Inputs (JSON)**
```json
{
  "content": "string (required) — content to store in long-term memory",
  "agentId": "string (optional) — agent ID to associate with this memory",
  "metadata": "object (optional) — additional metadata for the memory entry"
}
```

**Outputs (JSON)**
```json
{
  "status": "stored",
  "entryId": "string",
  "content": "string"
}
```

**Implementation**: `agents/src/mastra/tools/memory-store.ts`

Shares the `InMemoryLongTermMemory` singleton with `memory-recall`. Generates a UUID for each stored entry.
