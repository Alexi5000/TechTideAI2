begin;

-- Membership grants must be controlled by trusted server-side provisioning.
drop policy if exists org_members_insert on public.org_members;
revoke insert, update, delete on table public.org_members from public, anon, authenticated;

commit;
