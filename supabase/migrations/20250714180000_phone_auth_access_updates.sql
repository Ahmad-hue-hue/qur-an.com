-- Phone login resolver, lower-marhalah access, and teacher results across genders.

create or replace function public.normalize_phone_digits (p_phone text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
$$;

revoke all on function public.normalize_phone_digits (text) from public;
grant execute on function public.normalize_phone_digits (text) to anon, authenticated, service_role;

-- Resolve auth email for student/teacher phone login (admin keeps real email login).
create or replace function public.resolve_login_email_by_phone (p_phone text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_email text;
  v_role text;
begin
  v_phone := public.normalize_phone_digits(p_phone);
  if v_phone is null then
    return null;
  end if;

  select p.email, p.role
  into v_email, v_role
  from public.profiles p
  where p.phone = v_phone
    and p.role in ('student', 'teacher')
  order by case when p.role = 'teacher' then 0 else 1 end
  limit 1;

  if v_email is not null and length(trim(v_email)) > 0 then
    return lower(trim(v_email));
  end if;

  if v_role = 'teacher' then
    return v_phone || '@teachers.tajweed.local';
  end if;

  return v_phone || '@students.tajweed.local';
end;
$$;

revoke all on function public.resolve_login_email_by_phone (text) from public;
grant execute on function public.resolve_login_email_by_phone (text) to anon, authenticated, service_role;

-- Unlock assigned marhalah and all lower stages; keep score unlock for stages above.
create or replace function public.is_marhalah_unlocked (
  p_student_id uuid,
  p_marhalah_id bigint
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  m record;
  prev record;
  prev_score numeric;
  assigned_number smallint;
begin
  select * into m from public.marhalahs where id = p_marhalah_id;
  if not found then
    return false;
  end if;

  select current_marhalah into assigned_number
  from public.profiles
  where id = p_student_id;

  -- Assigned stage and all previous stages are readable.
  if assigned_number is not null and m.number <= assigned_number then
    return true;
  end if;

  if m.number = 1 then
    return true;
  end if;

  select * into prev from public.marhalahs where number = m.number - 1;
  if not found then
    return false;
  end if;

  prev_score := public.calculate_final_score(p_student_id, prev.id);
  return prev_score >= m.unlock_threshold;
end;
$$;

grant execute on function public.is_marhalah_unlocked (uuid, bigint) to authenticated, service_role;

-- Teachers can view all students (male and female) in their managed marhalah.
create or replace function public.teacher_can_access_student (p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles t
    join public.profiles s on s.id = p_student_id
    where t.id = auth.uid()
      and t.role = 'teacher'
      and s.role = 'student'
      and t.managed_marhalah is not null
      and s.current_marhalah = t.managed_marhalah
  );
$$;

revoke all on function public.teacher_can_access_student (uuid) from public, anon;
grant execute on function public.teacher_can_access_student (uuid) to authenticated, service_role;
