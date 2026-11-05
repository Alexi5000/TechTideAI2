begin;

-- Memory has no tenant ownership model; it is service-only until one exists.
drop policy if exists mastra_messages_select on public.mastra_messages;
drop policy if exists mastra_messages_insert on public.mastra_messages;
drop policy if exists mastra_working_memory_all on public.mastra_working_memory;
revoke all privileges on table public.mastra_messages, public.mastra_working_memory from public, anon, authenticated;

-- Approval creation and decisions must pass through trusted server-side policy.
drop policy if exists approvals_insert on public.approvals;
drop policy if exists approvals_update on public.approvals;
revoke insert, update, delete on table public.approvals from public, anon, authenticated;

commit;
