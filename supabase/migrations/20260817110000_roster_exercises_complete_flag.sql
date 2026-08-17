-- Bug: the results roster (get_marhalah_results_roster) returns `columns`
-- as EVERY exercise ever created for the marhalah, with no filter for
-- permanently-expired/orphaned exercises. The frontend's formatTotal()
-- (frontend/components/shared/results-roster-table.tsx) independently
-- reimplements completeness by checking whether the student has a score
-- for every column, reproducing the exact "requires every exercise ever
-- created" bug already fixed server-side in marhalah_exercises_completed()
-- (20260817100000_fix_exercises_completed_expired.sql) for start_exam and
-- promotion. A student who has genuinely completed everything (including
-- being promoted out of the marhalah already) could still be shown
-- "Incomplete" in results tables because of a dead exercise nobody could
-- ever submit.
--
-- Fix: add an explicit `exercises_complete` boolean to each roster row,
-- computed via the same, already-correct marhalah_exercises_completed()
-- used by promotion - so the frontend can read one authoritative field
-- instead of recomputing (and getting wrong) completeness itself.
create or replace function public.get_marhalah_results_roster (p_marhalah_number integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_marhalah_id bigint;
  v_columns jsonb;
  v_rows jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_staff() then
    raise exception 'Staff only';
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

  select coalesce(
    jsonb_agg(student_row order by sort_key),
    '[]'::jsonb
  )
  into v_rows
  from (
    select
      lower(coalesce(p.registration_number, p.id::text)) as sort_key,
      jsonb_build_object(
        'student_id', p.id,
        'registration_number', p.registration_number,
        'exercises_complete', public.marhalah_exercises_completed(p.id, v_marhalah_id),
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
        'overall_percent', (
          case
            when exam.score is not null
              or exists (
                select 1
                from public.exercise_submissions es2
                join public.exercises e2 on e2.id = es2.exercise_id
                where es2.student_id = p.id
                  and e2.marhalah_id = v_marhalah_id
                  and es2.submitted_at is not null
              )
              or exists (
                select 1
                from public.manual_scores ms
                where ms.student_id = p.id
                  and ms.marhalah_id = v_marhalah_id
              )
            then round(public.calculate_final_score(p.id, v_marhalah_id)::numeric, 1)
            else null
          end
        )
      ) as student_row
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
    where p.role = 'student'
      and p.current_marhalah = p_marhalah_number
  ) roster;

  return jsonb_build_object(
    'marhalah_number', p_marhalah_number,
    'marhalah_id', v_marhalah_id,
    'columns', v_columns,
    'rows', v_rows
  );
end;
$$;

-- Same fix for the student-facing variant (an independent implementation,
-- not a wrapper around get_marhalah_results_roster above).
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
    'exercises_complete', public.marhalah_exercises_completed(p.id, v_marhalah_id),
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
