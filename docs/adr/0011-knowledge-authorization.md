# 0011: Knowledge-route authorization

## Status

Proposed and incomplete. Do not deploy as a multi-tenant application until independent security review, real Supabase and Postgres tests, and protection of all other tenant-sensitive routes are complete.

## Decision

Knowledge endpoints require a bearer token validated by Supabase Auth `getUser`, a requested GUID organization, and a fresh server-side membership lookup for each operation. Owners and admins may index; owners, admins and members may search and read. No default organization is accepted. Document lookup is scoped by both document ID and authorized organization. Auth or membership service failures fail closed. Direct membership writes are revoked from public, anon and authenticated roles by migration 0007; trusted provisioning and `create_organization` must be independently reviewed before use.

This is a breaking API change. Organization membership can change between the membership check and a later operation; this implementation does not claim atomic revocation. A caller-provided organization is only a selection, never proof of membership. The backend service-role client bypasses user RLS, so its use and all related service-role paths require separate review. No credentials should be provided to the test harness.

## Verification and limits

Route tests exercise mocked valid/invalid identity, missing or revoked membership, forged organization selection, scoped document lookup, role-based writes, and membership lookup failure. They do not validate real tokens, Supabase policy/grant behavior, concurrent revocation or the other application routes. On a disposable plain PostgreSQL 16 instance, migration 0007 revoked direct membership mutation grants from synthetic anon/authenticated roles; this is not a real Supabase JWT, grants or RLS integration test.

The previously checked-in `0000_auth_stub.sql` was changed to preserve an existing `auth.uid()` instead of replacing it. The owner reported no deployment, but this repository is public: users who already applied the old migration need separate migration-history and repair guidance. Never assume editing a historical file repairs an already-deployed database or restore an authentication function without understanding its owner and implementation. Disposable plain PostgreSQL tests cover a pre-existing sentinel helper and a fresh stub; real Supabase behavior remains unverified.

A production gate requires real Supabase integration tests, membership provisioning controls, authentication across all protected routes, and an independent security assessment.
