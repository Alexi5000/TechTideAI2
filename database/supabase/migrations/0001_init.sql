begin;

create extension if not exists "pgcrypto";

create type agent_tier as enum ('ceo', 'orchestrator', 'worker');
create type run_status as enum ('queued', 'running', 'succeeded', 'failed', 'canceled');

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table org_members (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table agents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  tier agent_tier not null,
  role text not null,
  summary text,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table agent_skills (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  name text not null,
  summary text,
  created_at timestamptz not null default now()
);

create table runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid references agents(id) on delete set null,
  status run_status not null default 'queued',
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table run_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table artifacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  run_id uuid references runs(id) on delete set null,
  agent_id uuid references agents(id) on delete set null,
  kind text not null,
  uri text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_agents_org_id on agents(org_id);
create index idx_runs_org_id on runs(org_id);
create index idx_runs_agent_id on runs(agent_id);
create index idx_run_events_run_id on run_events(run_id);
create index idx_artifacts_org_id on artifacts(org_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger agents_set_updated_at
before update on agents
for each row execute procedure set_updated_at();

create trigger runs_set_updated_at
before update on runs
for each row execute procedure set_updated_at();

alter table organizations enable row level security;
alter table org_members enable row level security;
alter table agents enable row level security;
alter table agent_skills enable row level security;
alter table runs enable row level security;
alter table run_events enable row level security;
alter table artifacts enable row level security;

create or replace function is_org_member(target_org uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from org_members
    where org_id = target_org
      and user_id = auth.uid()
  );
$$;

create policy org_members_select on org_members
  for select using (user_id = auth.uid());

create policy org_members_insert on org_members
  for insert with check (user_id = auth.uid());

create policy organizations_select on organizations
  for select using (is_org_member(id));

create policy organizations_update on organizations
  for update using (is_org_member(id)) with check (is_org_member(id));

create policy organizations_delete on organizations
  for delete using (is_org_member(id));

create policy agents_select on agents
  for select using (is_org_member(org_id));

create policy agents_insert on agents
  for insert with check (is_org_member(org_id));

create policy agents_update on agents
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy agents_delete on agents
  for delete using (is_org_member(org_id));

create policy agent_skills_select on agent_skills
  for select using (
    exists (select 1 from agents where agents.id = agent_skills.agent_id and is_org_member(agents.org_id))
  );

create policy agent_skills_insert on agent_skills
  for insert with check (
    exists (select 1 from agents where agents.id = agent_skills.agent_id and is_org_member(agents.org_id))
  );

create policy runs_select on runs
  for select using (is_org_member(org_id));

create policy runs_insert on runs
  for insert with check (is_org_member(org_id));

create policy runs_update on runs
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy run_events_select on run_events
  for select using (is_org_member(org_id));

create policy run_events_insert on run_events
  for insert with check (is_org_member(org_id));

create policy artifacts_select on artifacts
  for select using (is_org_member(org_id));

create policy artifacts_insert on artifacts
  for insert with check (is_org_member(org_id));

create or replace function create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into organizations (name) values (org_name) returning id into new_org_id;
  insert into org_members (org_id, user_id, role) values (new_org_id, auth.uid(), 'owner');
  return new_org_id;
end;
$$;

grant execute on function create_organization(text) to authenticated;

commit;
