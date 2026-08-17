-- Lets a student review exactly what they answered on a specific past
-- (or current) attempt of a marhalah: every exercise's answers/grades, the
-- exam's answers/grades, halaqah/tadreeb marks, and which topics were
-- completed. Scoped to attempt_number regardless of is_current, since the
-- whole point is looking at a specific numbered attempt on purpose.
create or replace function public.get_student_attempt_review (
  p_marhalah_number integer,
  p_attempt_number smallint
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_marhalah_id bigint;
  v_exercises jsonb;
  v_exam jsonb;
  v_halaqah jsonb;
  v_tadreeb jsonb;
  v_topics_total int;
  v_topics_completed int;
begin
  if v_student_id is null then
    raise exception 'Not authenticated';
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
        'id', e.id,
        'title', e.title,
        'score', es.score,
        'max_score', es.max_score,
        'submitted_at', es.submitted_at,
        'questions', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', q.id,
                'text', q.text,
                'arabic_text', q.arabic_text,
                'type', q.type,
                'options', q.options,
                'correct_answer', q.correct_answer,
                'order', q."order",
                'answer_text', g.answer_text,
                'score', g.score,
                'max_score', g.max_score,
                'feedback', g.feedback
              )
              order by q."order"
            ),
            '[]'::jsonb
          )
          from public.questions q
          left join public.exercise_answer_grades g
            on g.question_id = q.id and g.submission_id = es.id
          where q.exercise_id = e.id
        )
      )
      order by e.id
    ),
    '[]'::jsonb
  )
  into v_exercises
  from public.exercise_submissions es
  join public.exercises e on e.id = es.exercise_id
  where es.student_id = v_student_id
    and es.attempt_number = p_attempt_number
    and e.marhalah_id = v_marhalah_id;

  select jsonb_build_object(
    'id', ex.id,
    'title', ex.title,
    'score', es.score,
    'max_score', es.max_score,
    'submitted_at', es.submitted_at,
    'questions', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', q.id,
            'text', q.text,
            'arabic_text', q.arabic_text,
            'type', q.type,
            'options', q.options,
            'correct_answer', q.correct_answer,
            'order', q."order",
            'answer_text', g.answer_text,
            'score', g.score,
            'max_score', g.max_score,
            'feedback', g.feedback
          )
          order by q."order"
        ),
        '[]'::jsonb
      )
      from public.questions q
      left join public.exam_answer_grades g
        on g.question_id = q.id and g.submission_id = es.id
      where q.exam_id = ex.id
    )
  )
  into v_exam
  from public.exam_submissions es
  join public.exams ex on ex.id = es.exam_id
  where es.student_id = v_student_id
    and es.attempt_number = p_attempt_number
    and ex.marhalah_id = v_marhalah_id
  limit 1;

  select jsonb_build_object('score', score, 'max_score', max_score)
  into v_halaqah
  from public.manual_scores
  where student_id = v_student_id
    and marhalah_id = v_marhalah_id
    and type = 'halaqah'
    and attempt_number = p_attempt_number;

  select jsonb_build_object('score', score, 'max_score', max_score)
  into v_tadreeb
  from public.manual_scores
  where student_id = v_student_id
    and marhalah_id = v_marhalah_id
    and type = 'tadreeb'
    and attempt_number = p_attempt_number;

  select count(*) into v_topics_total
  from public.topics
  where marhalah_id = v_marhalah_id
    and is_published = true;

  select count(*) into v_topics_completed
  from public.topic_completions tc
  join public.topics t on t.id = tc.topic_id
  where tc.student_id = v_student_id
    and tc.attempt_number = p_attempt_number
    and t.marhalah_id = v_marhalah_id;

  return jsonb_build_object(
    'marhalah_number', p_marhalah_number,
    'attempt_number', p_attempt_number,
    'exercises', v_exercises,
    'exam', v_exam,
    'halaqah', v_halaqah,
    'tadreeb', v_tadreeb,
    'topics_total', v_topics_total,
    'topics_completed', v_topics_completed
  );
end;
$$;

revoke all on function public.get_student_attempt_review (integer, smallint) from public, anon;
grant execute on function public.get_student_attempt_review (integer, smallint) to authenticated, service_role;
