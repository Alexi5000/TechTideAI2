-- Migration 0006 — Approval gate (Phase 3)
--
-- Stores human-in-the-loop approval requests. An approval is created when an
-- agent action is classified as external/destructive/billing. The run that
-- triggered it pauses until the approval is granted (run resumes) or denied
-- (run fails).

begin;

create type approval_status as enum ('pending', 'granted', 'denied', 'expired');
create type approval_risk_tier as enum ('read', 'write', 'external', 'destructive', 'billing');

create table approvals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  run_id uuid not null references runs(id) on delete cascade,
  agent_id text not null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  risk_tier approval_risk_tier not null,
  status approval_status not null default 'pending',
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text,
  rationale text,
  expires_at timestamptz not null,
  policy_version text not null default 'approval-policy-v1'
);

create index idx_approvals_org_status on approvals(org_id, status);
create index idx_approvals_run on approvals(run_id);
create index idx_approvals_pending_expires on approvals(expires_at) where status = 'pending';

alter table approvals enable row level security;

create policy approvals_select on approvals
  for select using (is_org_member(org_id));

create policy approvals_insert on approvals
  for insert with check (is_org_member(org_id));

create policy approvals_update on approvals
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));

commit;
