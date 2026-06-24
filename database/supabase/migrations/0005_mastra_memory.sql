-- Migration 0005 — Mastra PostgresStore memory surface (Phase 2.2)
--
-- Mastra's `Memory` adapter (when configured with a Postgres store) writes
-- messages and working-memory state to a small relational schema. We ship
-- the schema here so Supabase applies it on `db push`. The store is opt-in:
-- the backend only enables memory when both SUPABASE_URL and a memory table
-- name are configured.

begin;

create table if not exists mastra_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id text not null,
  resource_id text not null,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_mastra_messages_thread on mastra_messages(thread_id, created_at);
create index if not exists idx_mastra_messages_resource on mastra_messages(resource_id);

create table if not exists mastra_working_memory (
  resource_id text primary key,
  scope text not null check (scope in ('thread', 'resource')),
  thread_id text,
  content jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_mastra_working_memory_thread on mastra_working_memory(thread_id) where thread_id is not null;

alter table mastra_messages enable row level security;
alter table mastra_working_memory enable row level security;

-- Memory is per-resource (agent session); RLS is permissive in dev and tightened
-- when auth is wired up (out of scope for this build-out).
create policy mastra_messages_select on mastra_messages for select using (true);
create policy mastra_messages_insert on mastra_messages for insert with check (true);
create policy mastra_working_memory_all on mastra_working_memory for all using (true);

commit;
