# 0011: Knowledge-route authorization

## Status

Proposed and incomplete. Do not deploy as a multi-tenant application until independent security review, real Supabase and Postgres tests, and protection of all other tenant-sensitive routes are complete.

## Decision

Knowledge endpoints require a bearer token validated by Supabase Auth `getUser`, a requested GUID organization, and a fresh server-side membership lookup for each operation. Owners and admins may index; owners, admins and members may search and read. No default organization is accepted. Document lookup is scoped by both document ID and authorized organization. Auth or membership service failures fail closed. Direct membership writes are revoked from public, anon and authenticated roles by migration 0007; trusted provisioning and `create_organization` must be independently reviewed before use.

This is a breaking API change. Organization membership can change between the membership check and a later operation; this implementation does not claim atomic revocation. A caller-provided organization is only a selection, never proof of membership. The backend service-role client bypasses user RLS, so its use and all related service-role paths require separate review. No credentials should be provided to the test harness.

## Verification and limits

Each knowledge endpoint limits each client IP to 60 requests per minute per server instance before authorization or service work. The in-memory counters reset on restart and are not shared across replicas; a multi-instance deployment needs a shared rate-limit store. Fastify does not trust proxy headers by default. If deployed behind a proxy, configure and verify a trusted-proxy boundary before relying on client IPs; blindly trusting forwarded headers permits spoofing. Clients sharing an IP also share its endpoint quota.

Route tests exercise mocked valid/invalid identity, missing or revoked membership, forged organization selection, scoped document lookup, role-based writes, and membership lookup failure. They do not validate real tokens, Supabase policy/grant behavior, concurrent revocation or the other application routes. On a disposable plain PostgreSQL 16 instance, migration 0007 revoked direct membership mutation grants from synthetic anon/authenticated roles; this is not a real Supabase JWT, grants or RLS integration test.

The previously checked-in `0000_auth_stub.sql` was changed to preserve an existing `auth.uid()` instead of replacing it. The owner reported no deployment, but this repository is public: users who already applied the old migration need separate migration-history and repair guidance. Never assume editing a historical file repairs an already-deployed database or restore an authentication function without understanding its owner and implementation. Disposable plain PostgreSQL tests cover a pre-existing sentinel helper and a fresh stub; real Supabase behavior remains unverified.

A production gate requires real Supabase integration tests, membership provisioning controls, authentication across all protected routes, and an independent security assessment.

## Related approval and memory restrictions

Migration `0008_protect_memory_and_approvals.sql` removes the unconditional memory policies and revokes public API-role access to the memory tables, which have no tenant ownership model. It also removes public API-role approval mutation privileges and policies; this is intentionally restrictive until a server-side, tenant-scoped approval implementation exists. These changes may break direct clients. The effective grants, service-role access, inherited roles, and behavior on a real Supabase installation must be verified before applying the migration. The plain PostgreSQL regression test uses synthetic grants; it does not establish Supabase production behavior.

The execution service checks the stored approval decision and organization before resuming. Approval routes validate bearer tokens and current membership, scope reads by organization, allow only owners/admins to decide, and record the verified user ID. They use the same local per-IP rate-limit model as knowledge routes. The agent and approval routes now share a per-server in-memory repository; it prevents simultaneous conflicting decisions within one process but is neither durable nor shared across replicas. There is no atomic cross-process approval/resume transaction, and the frontend has not been updated to send approval credentials or an organization ID. Other routes remain unauthenticated. Real Supabase verification, a durable approval workflow, and resource-level authorization throughout the application are still required; this is not a deployable approval workflow.

Run routes now require a verified identity and current membership; reads use the stored run organization and owner/admin membership is required for writes. Agent execution also checks a verified owner/admin and requires an explicit organization. These checks are not atomic with subsequent operations and have only mocked authentication tests. As a safety hold, the assembled server returns 503 for agent execution, LLM, eval and sprint endpoints: their tenant boundaries and/or approval enforcement are incomplete. This intentionally disables those features, not a production-ready replacement. The existing frontend does not supply the newly required credentials. Direct registration of individual route modules is not protected by the assembled server's safety hold.
