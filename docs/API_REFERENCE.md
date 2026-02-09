# API Reference

Base URL: `http://localhost:4050`

## Authentication

All endpoints except `/` and `/health` require authentication when the `API_KEY` environment variable is set. In dev mode (no `API_KEY`), all endpoints are open.

Provide credentials via either:
- `Authorization: Bearer <API_KEY>` header
- `X-API-Key: <API_KEY>` header

Rate limit: **100 requests per minute** (localhost exempt).

## Default Org ID

Endpoints that accept `orgId` default to `00000000-0000-0000-0000-000000000001` when omitted.

---

## Endpoints

### General

#### `GET /`

Returns API identity and status.

**Response** `200`
```json
{ "name": "TechTideAI API", "status": "ok" }
```

#### `GET /health`

Health check. No auth required.

**Response** `200`
```json
{ "status": "ok", "env": "development", "uptimeSeconds": 42, "timestamp": "..." }
```

---

### Agents

#### `GET /api/agents`

List the full agent registry (CEO, orchestrators, workers).

**Response** `200`
```json
{ "ceo": { ... }, "orchestrators": [ ... ], "workers": [ ... ] }
```

#### `GET /api/agents/:id`

Get a single agent by its registry ID (e.g. `ceo`, `orch-veronica`, `worker-ops-alpha`).

**Response** `200` agent object | `404` not found

#### `POST /api/agents/:id/run`

Execute an agent. Returns immediately with a run ID for polling.

**Request Body**
```json
{
  "input": { ... },
  "orgId": "uuid (optional, defaults to DEFAULT_ORG_ID)"
}
```

**Response** `202` run created (poll `GET /api/runs/:id`) | `400` validation | `404` agent not found | `503` database unavailable

---

### LLM

#### `POST /api/llm`

Generate text via an LLM provider.

**Request Body**
```json
{
  "provider": "openai | anthropic (default: env.DEFAULT_LLM_PROVIDER)",
  "model": "string (required)",
  "input": "string (required)",
  "system": "string (optional)",
  "temperature": "0-2 (optional)",
  "maxTokens": "int >= 1 (optional)"
}
```

**Response** `200` generated text | `400` validation | `503` provider not configured

---

### Runs

#### `GET /api/runs`

List runs for an organization.

**Query Parameters**
- `orgId` (uuid, optional) - defaults to DEFAULT_ORG_ID
- `limit` (1-100, optional)

**Response** `200` array of runs | `400` validation | `503` database unavailable

#### `GET /api/runs/:id`

Get a single run by UUID.

**Response** `200` run object | `400` invalid UUID | `404` not found | `503` database unavailable

#### `POST /api/runs`

Create a new run (internal use, called by agent execution service).

**Request Body**
```json
{
  "agentId": "string (required)",
  "input": { ... },
  "orgId": "uuid (optional)"
}
```

**Response** `201` created | `400` validation | `503` database unavailable

#### `POST /api/runs/:id/cancel`

Cancel a running execution. Signals the in-flight AbortController and updates database status.

**Response** `200` cancelled run + `executionSignalled` flag | `400` invalid UUID | `404` not found | `409` invalid status transition | `503` database unavailable

---

### Run Events

#### `GET /api/runs/:id/events`

Get the audit trail of events for a run.

**Response** `200` `{ "events": [...] }` | `400` invalid UUID | `404` not found | `503` database unavailable

---

### Knowledge

#### `POST /api/knowledge/documents`

Index a knowledge document (stores in Supabase + vectors in Weaviate).

**Request Body**
```json
{
  "title": "string (required)",
  "source": "string (required)",
  "content": "string (required)",
  "collection": "string (optional)",
  "metadata": { ... },
  "orgId": "uuid (optional)"
}
```

**Response** `201` created document | `400` validation | `503` database or embedding provider unavailable

#### `GET /api/knowledge/documents/:id`

Fetch a knowledge document by UUID.

**Response** `200` document | `400` invalid UUID | `404` not found | `503` database unavailable

#### `POST /api/knowledge/search`

Vector search over indexed knowledge chunks.

**Request Body**
```json
{
  "query": "string (min 3 chars, required)",
  "limit": "1-20 (default 5)",
  "collections": ["string array (optional)"],
  "orgId": "uuid (optional)"
}
```

**Response** `200` `{ "results": [...] }` | `400` validation | `503` database or embedding provider unavailable

---

### Insights

#### `GET /api/insights/kpis`

KPI dashboard data for the organization.

**Query Parameters**
- `days` (1-365, default 30) - lookback window
- `orgId` (uuid, optional)

**Response** `200` KPI data | `400` validation | `503` database unavailable

#### `GET /api/insights/execution-map`

Execution map visualization data (agent call graphs).

**Query Parameters**
- `days` (1-365, default 30)
- `orgId` (uuid, optional)

**Response** `200` execution map | `400` validation | `503` database unavailable

#### `POST /api/insights/market-intel`

Query market intelligence using RAG (vector search + LLM summarization).

**Request Body**
```json
{
  "query": "string (min 3 chars, required)",
  "provider": "openai | anthropic (optional)",
  "model": "known model string (optional)",
  "collections": ["string array (optional)"],
  "orgId": "uuid (optional)"
}
```

**Response** `200` summarized intelligence | `400` validation | `503` provider/database unavailable

---

### Monitoring

#### `GET /api/monitoring/metrics`

Execution metrics (counters, histograms).

**Response** `200`
```json
{ "metrics": [...], "count": 0, "timestamp": "..." }
```

#### `GET /api/monitoring/traces`

Execution traces (spans and events).

**Query Parameters**
- `limit` (1-1000, default 100)

**Response** `200`
```json
{ "traces": [...], "count": 0, "timestamp": "..." }
```

---

### Pipelines

#### `GET /api/pipelines`

List available multi-agent pipelines.

**Response** `200` `{ "pipelines": [...] }`

#### `POST /api/pipelines/:id/run`

Execute a multi-agent pipeline. Returns immediately for polling.

**Request Body**
```json
{
  "input": { ... },
  "orgId": "uuid (optional)"
}
```

**Response** `202` run created | `400` validation | `404` pipeline not found | `503` database unavailable

---

## Error Format

All errors return a consistent shape:
```json
{
  "error": "Error Category",
  "message": "Human-readable description"
}
```

## Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async execution started) |
| 400 | Validation error (Zod schema failure) |
| 401 | Unauthorized (missing or invalid API key) |
| 404 | Resource not found |
| 409 | Conflict (invalid status transition) |
| 429 | Rate limited |
| 500 | Internal server error |
| 503 | Service unavailable (database, LLM, or vector store not configured) |
