# 0010: Exact tenant identifiers in knowledge retrieval

## Status

Proposed. This change is not an authentication or authorization system, and must not be described as a complete multi-tenant security boundary.

## Decision

Use `KnowledgeChunkV2` with a filterable `orgId` text field using `field` tokenization. Normal searches and nonempty writes validate that property before use. A legacy-only `KnowledgeChunk`, or coexistence of legacy and V2, makes the repository fail closed. There is currently no operator-approved coexistence or cutover mechanism: do not remove legacy data merely to bypass the guard. Search rejects malformed responses or any result whose returned `orgId` is not an exact match. GraphQL values are serialized, not concatenated as raw text; vectors and limits are validated.

Knowledge routes now verify an access token and current membership before invoking the service; see ADR 0011. Other routes, real Supabase enforcement and end-to-end authorization remain unresolved. Collection labels remain word-tokenized and are not authorization scopes. Direct repository callers must use canonical tenant identifiers consistently. No claim of production tenant isolation follows from this ADR alone.

## Existing data

There is currently no deployment, so no live migration has been authorized or performed. Weaviate properties cannot be retokenized in place. For an existing installation, operators must separately authorize a migration and, before writes resume:

1. Restrict access and freeze writes and deletes; inventory the source server, schema, index settings, tenants, IDs, counts and vector configuration. Take and restore-test a backup. Do not re-embed private data externally.
2. Explicitly create `KnowledgeChunkV2` with the exact tenant schema and matching vector/index configuration. Copy all objects, retaining IDs, properties and vectors. Check every individual batch result; do not rely solely on HTTP status. Quarantine records with missing or ambiguous tenant ownership.
3. Reconcile source and target IDs, properties, vectors, per-tenant counts and representative searches. Verify isolation in both directions with valid tenant IDs and negative canaries. Keep writes paused until all checks succeed.
4. Design, independently review and implement an explicit reconciled cutover mechanism before routing traffic to V2. Current code blocks coexistence; this ADR does not provide an override. Retain the source and backup under an agreed retention policy. Rollback must disable affected search rather than restore the unsafe legacy filter. Deletion of the old data requires separate approval.

`backend/tests/weaviate-migration.integration.mjs` rehearses this sequence for one synthetic object on a disposable local Weaviate; it is not a production migration tool, scale test, backup/restore test, or proof of safe concurrent writes. An operational migration implementation, interruption recovery and independent review are required before migrating real data.

## Verification

The dedicated CI job uses pinned Weaviate 1.35.6 instances and checks fresh-schema isolation and the synthetic legacy-copy rehearsal. It is required by the CI gate, including on cancellation or unexpected skip. It does not test live data, app-level authorization, deployed version compatibility, or a real migration. See `backend/tests/weaviate-search.integration.mjs` and `backend/tests/weaviate-migration.integration.mjs`.
