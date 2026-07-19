-- A student can download only their own results in the register layout.

create or replace function public.get_student_marhalah_results_roster (
  p_marhalah_number integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_marhalah_id bigint;
  v_columns jsonb;
  v_row jsonb;
begin
  if not exists (
    select 1 from public.profiles
    where id = v_student_id
      and role = 'student'
      and current_marhalah = p_marhalah_number
  ) then
    raise exception 'Student only';
  end if;

  select id into v_marhalah_id
  from public.marhalahs
  where number = p_marhalah_number;

  if not found then
    raise exception 'Marḥalah not found';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'topic_id', t.id,
        'order', t."order",
        'title', t.title,
        'exercise_id', e.id
      )
      order by t."order"
    ),
    '[]'::jsonb
  )
  into v_columns
  from public.topics t
  join public.exercises e on e.topic_id = t.id
  where t.marhalah_id = v_marhalah_id;

  select jsonb_build_object(
    'student_id', p.id,
    'registration_number', p.registration_number,
    'lesson_scores', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'exercise_id', e.id,
            'topic_id', t.id,
            'score', es.score,
            'max_score', es.max_score
          )
          order by t."order"
        ),
        '[]'::jsonb
      )
      from public.topics t
      join public.exercises e on e.topic_id = t.id
      left join public.exercise_submissions es
        on es.exercise_id = e.id
       and es.student_id = p.id
       and es.submitted_at is not null
      where t.marhalah_id = v_marhalah_id
    ),
    'exam_score', exam.score,
    'exam_max_score', exam.max_score,
    'halaqah_score', halaqah.score,
    'halaqah_max_score', halaqah.max_score,
    'tadreeb_score', tadreeb.score,
    'tadreeb_max_score', tadreeb.max_score,
    'overall_percent', null
  )
  into v_row
  from public.profiles p
  left join lateral (
    select es.score, es.max_score
    from public.exam_submissions es
    join public.exams ex on ex.id = es.exam_id
    where es.student_id = p.id
      and ex.marhalah_id = v_marhalah_id
      and es.submitted_at is not null
    order by es.submitted_at desc
    limit 1
  ) exam on true
  left join public.manual_scores halaqah
    on halaqah.student_id = p.id
   and halaqah.marhalah_id = v_marhalah_id
   and halaqah.type = 'halaqah'
  left join public.manual_scores tadreeb
    on tadreeb.student_id = p.id
   and tadreeb.marhalah_id = v_marhalah_id
   and tadreeb.type = 'tadreeb'
  where p.id = v_student_id;

  return jsonb_build_object(
    'marhalah_number', p_marhalah_number,
    'marhalah_id', v_marhalah_id,
    'columns', v_columns,
    'rows', jsonb_build_array(v_row)
  );
end;
$$;

revoke all on function public.get_student_marhalah_results_roster (integer) from public, anon;
grant execute on function public.get_student_marhalah_results_roster (integer)
  to authenticated, service_role;
