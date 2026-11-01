\set ON_ERROR_STOP on

-- Run only against a disposable, otherwise empty Postgres database.
do $$
begin
  if current_database() <> 'techtide_auth_stub_test' then
    raise exception 'Refusing to run outside techtide_auth_stub_test';
  end if;
end
$$;

create schema auth;
create function auth.uid() returns uuid language sql stable
as $$ select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid $$;

\ir ../migrations/0000_auth_stub.sql

do $$
begin
  if auth.uid() is distinct from 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid then
    raise exception 'Existing auth.uid() was replaced';
  end if;
end
$$;
