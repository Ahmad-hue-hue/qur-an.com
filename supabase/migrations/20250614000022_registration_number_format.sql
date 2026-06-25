-- Registration numbers: {marhalah}.{year_last_digit}.{sequence}{letter}
-- Example: 1.5.18A (Asmaa's format)

create or replace function public.assign_registration_number (p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  reg_no text;
  marhalah_num int;
  enrolled_at timestamptz;
  cohort_digit text;
  prefix text;
  prefix_pattern text;
  seq_num int;
begin
  select registration_number, coalesce(current_marhalah, 1), created_at
  into reg_no, marhalah_num, enrolled_at
  from public.profiles
  where id = p_student_id;

  if reg_no is not null then
    return reg_no;
  end if;

  cohort_digit := right(
    to_char(extract(year from coalesce(enrolled_at, now()))::int, 'FM9999'),
    1
  );
  prefix := marhalah_num::text || '.' || cohort_digit || '.';
  prefix_pattern := '^' || marhalah_num::text || '\.' || cohort_digit || '\.(\d+)[A-Z]$';

  select coalesce(max((regexp_match(registration_number, prefix_pattern))[1]::int), 0) + 1
  into seq_num
  from public.profiles
  where registration_number ~ prefix_pattern;

  reg_no := prefix || seq_num::text || 'A';

  update public.profiles
  set registration_number = reg_no
  where id = p_student_id;

  return reg_no;
end;
$$;

create or replace function public.admin_assign_registration_number (p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  return public.assign_registration_number(p_student_id);
end;
$$;

revoke all on function public.admin_assign_registration_number (uuid) from public, anon;
grant execute on function public.admin_assign_registration_number (uuid) to authenticated, service_role;
