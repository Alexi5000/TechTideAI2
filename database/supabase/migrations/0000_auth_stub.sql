-- 0000_auth_stub.sql
--
-- Supabase provides the `auth` schema and `auth.users` table out of the
-- box. Plain Postgres does not. The local docker-compose stack runs
-- postgres:16-alpine (not Supabase), so this migration creates a stub
-- `auth` schema + `auth.users` table to satisfy the foreign keys in
-- 0001_init.sql and friends. On a real Supabase project this migration
-- is a no-op (everything already exists), and the schema is gated by
-- `if not exists` to keep it idempotent.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);

-- The Supabase auth schema also exposes `auth.uid()` (a helper function
-- that returns the current request's user id). Provide a stub.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select null::uuid;
$$;
