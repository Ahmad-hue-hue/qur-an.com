-- Add manually entered ḥalaqah and tadreeb marks to the raw-score register.

create or replace function public.get_marhalah_results_roster_with_manual_scores (
  p_marhalah_number integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_roster jsonb;
  v_rows jsonb;
begin
  v_roster := public.get_marhalah_results_roster(p_marhalah_number);

  select coalesce(
    jsonb_agg(
      row_data || jsonb_build_object(
        'halaqah_score', halaqah.score,
        'halaqah_max_score', halaqah.max_score,
        'tadreeb_score', tadreeb.score,
        'tadreeb_max_score', tadreeb.max_score
      )
    ),
    '[]'::jsonb
  )
  into v_rows
  from jsonb_array_elements(v_roster -> 'rows') as row_data
  left join lateral (
    select score, max_score
    from public.manual_scores
    where student_id = (row_data ->> 'student_id')::uuid
      and marhalah_id = (v_roster ->> 'marhalah_id')::bigint
      and type = 'halaqah'
  ) halaqah on true
  left join lateral (
    select score, max_score
    from public.manual_scores
    where student_id = (row_data ->> 'student_id')::uuid
      and marhalah_id = (v_roster ->> 'marhalah_id')::bigint
      and type = 'tadreeb'
  ) tadreeb on true;

  return jsonb_set(v_roster, '{rows}', v_rows);
end;
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
  where id = auth.uid() and role = 'teacher';

  if v_gender is null then
    raise exception 'Teacher only';
  end if;

  v_roster := public.get_marhalah_results_roster_with_manual_scores(
    p_marhalah_number
  );

  select coalesce(jsonb_agg(row_data), '[]'::jsonb)
  into v_rows
  from jsonb_array_elements(v_roster -> 'rows') as row_data
  join public.profiles student
    on student.id = (row_data ->> 'student_id')::uuid
  where student.gender = v_gender;

  return jsonb_set(v_roster, '{rows}', v_rows);
end;
$$;

create or replace function public.get_teacher_marhalah_results_roster_pdf (
  p_marhalah_number integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'teacher'
  ) then
    raise exception 'Teacher only';
  end if;

  return public.get_marhalah_results_roster_with_manual_scores(
    p_marhalah_number
  );
end;
$$;

revoke all on function public.get_marhalah_results_roster_with_manual_scores (integer) from public, anon;
revoke all on function public.get_teacher_marhalah_results_roster (integer) from public, anon;
revoke all on function public.get_teacher_marhalah_results_roster_pdf (integer) from public, anon;
grant execute on function public.get_marhalah_results_roster_with_manual_scores (integer)
  to authenticated, service_role;
grant execute on function public.get_teacher_marhalah_results_roster (integer)
  to authenticated, service_role;
grant execute on function public.get_teacher_marhalah_results_roster_pdf (integer)
  to authenticated, service_role;
