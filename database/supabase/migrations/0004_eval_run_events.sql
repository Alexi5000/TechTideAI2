-- Migration 0004 — Run-event payload enrichment (Phase 2.1, evidence plane).
--
-- run_events existed in 0001 but was unused. We add structured columns so events
-- can be filtered/indexed without parsing the jsonb payload:
--   - event_type is already there
--   - correlation_id ties an event to a trace
--   - severity supports dashboards / alert routing
--   - occurred_at replaces created_at semantically (created_at = when the row
--     landed; occurred_at = when the event happened in the agent).

begin;

alter table run_events
  add column if not exists correlation_id uuid,
  add column if not exists severity text not null default 'info'
    check (severity in ('debug', 'info', 'warn', 'error', 'critical')),
  add column if not exists occurred_at timestamptz;

-- Backfill occurred_at from created_at for existing rows.
update run_events
  set occurred_at = created_at
  where occurred_at is null;

alter table run_events
  alter column occurred_at set not null,
  alter column occurred_at set default now();

create index if not exists idx_run_events_correlation_id on run_events(correlation_id);
create index if not exists idx_run_events_event_type on run_events(event_type);
create index if not exists idx_run_events_occurred_at on run_events(occurred_at desc);

commit;
