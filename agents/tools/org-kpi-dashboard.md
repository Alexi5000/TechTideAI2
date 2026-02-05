# Tool: org-kpi-dashboard

**Description**: Reads current company KPIs and historical trends.

**Inputs (JSON)**
```json
{
  "metricGroup": "growth | product | engineering | finance | people",
  "windowDays": 30
}
```

**Outputs (JSON)**
```json
{
  "metricGroup": "string",
  "metrics": [
    { "name": "string", "value": "number", "delta": "number" }
  ]
}
```
