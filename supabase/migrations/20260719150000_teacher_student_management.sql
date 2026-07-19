-- Teachers may manage students of their own gender; admins retain full access.

create or replace function public.staff_assign_registration_number (
  p_student_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_teacher_gender text;
  v_student_gender text;
begin
  select role, gender
  into v_role, v_teacher_gender
  from public.profiles
  where id = auth.uid();

  if v_role = 'admin' then
    return public.assign_registration_number(p_student_id);
  end if;

  if v_role <> 'teacher' then
    raise exception 'Staff only';
  end if;

  select gender into v_student_gender
  from public.profiles
  where id = p_student_id
    and role = 'student';

  if v_student_gender is null or v_student_gender <> v_teacher_gender then
    raise exception 'Teachers can only manage students of their own gender';
  end if;

  return public.assign_registration_number(p_student_id);
end;
$$;

revoke all on function public.staff_assign_registration_number (uuid) from public, anon;
grant execute on function public.staff_assign_registration_number (uuid)
  to authenticated, service_role;
