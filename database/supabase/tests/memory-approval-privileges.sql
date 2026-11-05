\set ON_ERROR_STOP on

do $$
begin
  if current_database() <> 'techtide_policy_test' then
    raise exception 'Refusing to run outside techtide_policy_test';
  end if;
end
$$;

\ir ../migrations/0000_auth_stub.sql
\ir ../migrations/0001_init.sql
\ir ../migrations/0005_mastra_memory.sql
\ir ../migrations/0006_approvals.sql

grant select, insert, update, delete on public.mastra_messages, public.mastra_working_memory to public, anon, authenticated;
grant insert, update, delete on public.approvals to public, anon, authenticated;
\ir ../migrations/0008_protect_memory_and_approvals.sql

do $$
declare
  role_name text;
  operation text;
  table_name text;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    foreach table_name in array array['public.mastra_messages', 'public.mastra_working_memory'] loop
      foreach operation in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
        if has_table_privilege(role_name, table_name, operation) then
          raise exception '% retains % on %', role_name, operation, table_name;
        end if;
      end loop;
    end loop;
    foreach operation in array array['INSERT', 'UPDATE', 'DELETE'] loop
      if has_table_privilege(role_name, 'public.approvals', operation) then
        raise exception '% retains % on approvals', role_name, operation;
      end if;
    end loop;
  end loop;
  if exists (select 1 from pg_policies where schemaname = 'public' and policyname in ('mastra_messages_select', 'mastra_messages_insert', 'mastra_working_memory_all', 'approvals_insert', 'approvals_update')) then
    raise exception 'Unsafe policy remains';
  end if;
end
$$;
