# Tool: workflow-runner

**Description**: Execute approved automation workflows and report results.

**Inputs (JSON)**
```json
{
  "workflowId": "string",
  "input": {}
}
```

**Outputs (JSON)**
```json
{
  "workflowId": "string",
  "status": "queued | running | succeeded | failed",
  "result": {}
}
```
