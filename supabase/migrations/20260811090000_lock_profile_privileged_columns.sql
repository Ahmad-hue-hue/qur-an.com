-- Security fix: profiles_update_own_or_admin (20250615000001) lets a student
-- update their own row with role/is_suspended set to anything, since RLS is
-- row-scoped, not column-scoped -- e.g. a student PATCHing their own profile
-- with {"role":"admin"}. sync_profile_role_to_auth then even propagates a
-- self-granted role into auth.users metadata.
--
-- Scope: only `role` and `is_suspended` are guarded here. Every other
-- privileged-looking column (current_marhalah, managed_marhalah,
-- registration_number, has_attempted_exercise) has a legitimate SECURITY
-- DEFINER RPC that updates it under a non-admin caller's own session
-- (assign_registration_number, set_managed_marhalah, maybe_promote_student,
-- the submit_exercise family) -- guarding those too would need a
-- session-local bypass per call site, which isn't safe to ship without a
-- live database to verify against. `role`/`is_suspended` have no such RPC
-- (verified: no `update public.profiles ... set role` or `set is_suspended`
-- anywhere in the migration history), so this is a pure hole-close.
--
-- RLS WITH CHECK can't diff OLD vs NEW, so this needs a trigger.

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is only non-null for a request carrying an end-user JWT (the
  -- PostgREST "authenticated" path this fix targets). Direct SQL (the
  -- dashboard/SQL editor admin-bootstrap flow in README.md) and
  -- service_role/backend calls have no such JWT and are trusted here.
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.is_suspended is distinct from old.is_suspended
  then
    raise exception 'Only an admin may change role or suspension status.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_columns on public.profiles;
create trigger protect_profile_privileged_columns
before update on public.profiles
for each row
execute function public.protect_profile_privileged_columns();
