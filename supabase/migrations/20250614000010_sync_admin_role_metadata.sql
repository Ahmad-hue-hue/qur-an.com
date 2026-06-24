-- Keep auth.users metadata role in sync when profile role changes (e.g. admin promotion)

create or replace function public.sync_profile_role_to_auth ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.role is distinct from old.role then
    update auth.users
    set raw_user_meta_data =
      coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role)
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_role_change on public.profiles;
create trigger on_profile_role_change
after insert or update of role on public.profiles
for each row
execute function public.sync_profile_role_to_auth ();

-- Backfill existing admins
update auth.users u
set raw_user_meta_data =
  coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
from public.profiles p
where p.id = u.id
  and p.role = 'admin';
