-- 0009_protect_auth_uid.sql
-- Forward migration to ensure auth.uid() preserves real Supabase auth function
-- in environments where auth.uid() already exists or attaches real auth.

do $uid_guard$
begin
  if to_regprocedure('auth.uid()') is null then
    execute $definition$
      create function auth.uid()
      returns uuid
      language sql
      stable
      as 'select null::uuid'
    $definition$;
  end if;
end
$uid_guard$;
