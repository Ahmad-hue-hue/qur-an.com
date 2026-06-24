-- Reliable role lookup for the signed-in user (bypasses RLS edge cases)

create or replace function public.get_my_role ()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

revoke all on function public.get_my_role () from public, anon;
grant execute on function public.get_my_role () to authenticated, service_role;
