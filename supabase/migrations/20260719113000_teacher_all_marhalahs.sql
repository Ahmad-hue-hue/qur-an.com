-- Teachers can work across every Marḥalah. Gender remains the student-access boundary.

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
    where t.id = (select auth.uid())
      and t.role = 'teacher'
      and s.role = 'student'
      and t.gender is not null
      and s.gender = t.gender
  );
$$;

create or replace function public.teacher_owns_marhalah_id (p_marhalah_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles t
    join public.marhalahs m on m.id = p_marhalah_id
    where t.id = (select auth.uid())
      and t.role = 'teacher'
  );
$$;

create or replace function public.get_teacher_marhalah_results_roster (
  p_marhalah_number integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gender text;
  v_roster jsonb;
  v_rows jsonb;
begin
  select gender into v_gender
  from public.profiles
  where id = auth.uid()
    and role = 'teacher';

  if v_gender is null then
    raise exception 'Teacher only';
  end if;

  v_roster := public.get_marhalah_results_roster(p_marhalah_number);

  select coalesce(jsonb_agg(row_data), '[]'::jsonb)
  into v_rows
  from jsonb_array_elements(v_roster -> 'rows') as row_data
  join public.profiles student
    on student.id = (row_data ->> 'student_id')::uuid
  where student.gender = v_gender;

  return jsonb_set(v_roster, '{rows}', v_rows);
end;
$$;

revoke all on function public.get_teacher_marhalah_results_roster (integer)
from public, anon;
grant execute on function public.get_teacher_marhalah_results_roster (integer)
to authenticated, service_role;
