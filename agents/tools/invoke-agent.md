# Tool: invoke-agent

**Description**: Invoke another agent to perform a subtask. Used for orchestrator-worker delegation within the agent hierarchy.

**Access**: Factory-scoped — each agent receives an instance restricted to its allowed targets. CEO can invoke orchestrators; orchestrators can invoke their workers; workers have no access (tool removed entirely).

**Inputs (JSON)**
```json
{
  "agentId": "string (required) — ID of the target agent to invoke",
  "input": "object (optional, default {}) — input payload; if it contains a 'prompt' string key, that is used as the agent prompt"
}
```

**Outputs (JSON)**
```json
{
  "agentId": "string",
  "success": true,
  "output": { "text": "string — agent response" }
}
```

**Error output**
```json
{
  "agentId": "string",
  "success": false,
  "output": {},
  "error": "string — reason for failure"
}
```

**Implementation**: `agents/src/mastra/tools/invoke-agent.ts`

Uses `createInvokeAgentTool(allowedTargetIds)` factory. Hierarchy enforcement happens in `createMastraAgents()` which calls `scopeToolsForAgent()` to produce per-agent tool sets.
