-- Give existing teacher accounts a native, confirmed phone identity.
-- Their legacy auth email remains only as historical identity data and is no
-- longer used by the application.

update auth.users as auth_user
set
  phone = '+' || profile.phone,
  phone_confirmed_at = coalesce(auth_user.phone_confirmed_at, now())
from public.profiles as profile
where profile.id = auth_user.id
  and profile.role = 'teacher'
  and profile.phone is not null
  and profile.phone <> '';

update public.profiles
set email = null
where role = 'teacher';
