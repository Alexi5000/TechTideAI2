begin;

create table eval_suites (
  id text primary key,
  version text not null,
  name text not null,
  description text not null default '',
  -- The full suite payload (tasks + scorers + provenance). Versioned.
  payload jsonb not null,
  published_at timestamptz not null default now(),
  unique (id, version)
);

create type eval_run_status as enum ('running', 'succeeded', 'failed', 'canceled');

create table eval_runs (
  id uuid primary key,
  suite_id text not null references eval_suites(id) on delete restrict,
  suite_version text not null,
  baseline_id uuid references eval_runs(id) on delete set null,
  status eval_run_status not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  model_versions jsonb not null default '{}'::jsonb,
  scorer_versions jsonb not null default '{}'::jsonb,
  summary jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  unique (suite_id, suite_version, id)
);

create table eval_task_results (
  id uuid primary key default gen_random_uuid(),
  eval_run_id uuid not null references eval_runs(id) on delete cascade,
  task_id text not null,
  agent_id text not null,
  agent_output jsonb,
  score double precision not null,
  passed boolean not null,
  latency_ms integer not null,
  tokens_used integer not null default 0,
  estimated_cost_usd double precision not null default 0,
  scorers jsonb not null default '[]'::jsonb,
  failure_reason text,
  observed_at timestamptz not null default now()
);

create index idx_eval_runs_suite on eval_runs(suite_id, suite_version);
create index idx_eval_runs_started_at on eval_runs(started_at desc);
create index idx_eval_task_results_run on eval_task_results(eval_run_id);
create index idx_eval_task_results_passed on eval_task_results(eval_run_id, passed);

alter table eval_suites enable row level security;
alter table eval_runs enable row level security;
alter table eval_task_results enable row level security;

-- Eval harness runs in a service role context, not a user context. The RLS
-- policies here allow org members to read; writes are performed via the service
-- role key which bypasses RLS by Supabase convention.
create policy eval_suites_select on eval_suites
  for select using (true);

create policy eval_runs_select on eval_runs
  for select using (true);

create policy eval_task_results_select on eval_task_results
  for select using (
    exists (
      select 1 from eval_runs
      where eval_runs.id = eval_task_results.eval_run_id
    )
  );

commit;
