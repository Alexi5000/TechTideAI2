# Tool: org-kpi-dashboard

**Description**: Returns execution KPIs for the organization over a rolling window.

**Inputs (JSON)**
```json
{
  "days": 30
}
```

**Outputs (JSON)**
```json
{
  "orgId": "string",
  "range": { "from": "string", "to": "string" },
  "totals": {
    "runsTotal": 0,
    "running": 0,
    "queued": 0,
    "succeeded": 0,
    "failed": 0,
    "canceled": 0
  },
  "successRate": 0,
  "avgDurationMs": 0,
  "lastRunAt": "string",
  "topAgents": [{ "agentId": "string", "runCount": 0, "successRate": 0 }]
}
```
