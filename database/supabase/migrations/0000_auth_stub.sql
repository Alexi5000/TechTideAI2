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

-- Supabase pre-defines three roles that the RLS policies reference:
-- `anon` (unauthenticated), `authenticated` (logged-in user),
-- `service_role` (server-side trusted). On plain Postgres these
-- don't exist, so the GRANT statements in 0001_init.sql fail with
-- 'role "authenticated" does not exist'. Create them here. They're
-- NOLOGIN BYPASSRLS where Supabase would have configured them with
-- specific privileges; for the local dev stack the simpler defaults
-- are enough.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end$$;
