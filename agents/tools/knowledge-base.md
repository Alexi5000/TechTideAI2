# Tool: knowledge-base

**Description**: Query internal knowledge and policy documents via the backend knowledge API.

**Inputs (JSON)**
```json
{
  "query": "string",
  "collections": ["policies", "architecture", "product"]
}
```

**Outputs (JSON)**
```json
{
  "answer": "string",
  "sources": ["string"],
  "matchCount": 0
}
```

**Environment**
- `BACKEND_API_BASE_URL` (default: `http://localhost:4050`)
