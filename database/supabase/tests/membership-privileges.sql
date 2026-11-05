\set ON_ERROR_STOP on

-- Run only against a disposable, otherwise empty Postgres database.
do $$
begin
  if current_database() <> 'techtide_membership_test' then
    raise exception 'Refusing to run outside techtide_membership_test';
  end if;
end
$$;

\ir ../migrations/0000_auth_stub.sql
\ir ../migrations/0001_init.sql

-- Simulate inherited public API privileges before the hardening migration.
grant insert, update, delete on public.org_members to anon, authenticated;
\ir ../migrations/0007_protect_membership.sql

do $$
declare
  role_name text;
  operation text;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    foreach operation in array array['INSERT', 'UPDATE', 'DELETE'] loop
      if has_table_privilege(role_name, 'public.org_members', operation) then
        raise exception '% retains % on org_members', role_name, operation;
      end if;
    end loop;
  end loop;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'org_members' and policyname = 'org_members_insert') then
    raise exception 'Self-insert policy still exists';
  end if;
end
$$;
