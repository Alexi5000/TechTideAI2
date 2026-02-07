# Tool: execution-map

**Description**: Returns the current execution topology with run statistics.

**Inputs (JSON)**
```json
{
  "days": 30
}
```

**Outputs (JSON)**
```json
{
  "nodes": [
    {
      "id": "string",
      "name": "string",
      "tier": "string",
      "reportsTo": "string",
      "runStats": {
        "runsTotal": 0,
        "running": 0,
        "queued": 0,
        "succeeded": 0,
        "failed": 0,
        "canceled": 0,
        "successRate": 0,
        "lastRunAt": "string"
      }
    }
  ],
  "edges": [{ "from": "string", "to": "string" }]
}
```
