begin;

-- Index on runs.status for filtering by status (queued, running, etc.)
create index if not exists idx_runs_status on runs(status);

-- Index on run_events.event_type for filtering by event type
create index if not exists idx_run_events_event_type on run_events(event_type);

-- Composite index for common query pattern: runs by org + status
create index if not exists idx_runs_org_status on runs(org_id, status);

commit;
