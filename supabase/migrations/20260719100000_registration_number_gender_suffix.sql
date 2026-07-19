-- Registration numbers use A for male students and B for female students.

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
  student_gender text;
  cohort_digit text;
  prefix text;
  seq_num int;
  suffix text;
begin
  select registration_number, coalesce(current_marhalah, 1), created_at, gender
  into reg_no, marhalah_num, enrolled_at, student_gender
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
  suffix := case when student_gender = 'female' then 'B' else 'A' end;

  select coalesce(
    max((regexp_match(registration_number, '\.(\d+)[A-Z]$'))[1]::int),
    0
  ) + 1
  into seq_num
  from public.profiles
  where registration_number like prefix || '%';

  reg_no := prefix || seq_num::text || suffix;

  update public.profiles
  set registration_number = reg_no
  where id = p_student_id;

  return reg_no;
end;
$$;
