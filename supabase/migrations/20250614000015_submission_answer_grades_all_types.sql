-- Store per-question answer grades for all question types so admins can review
-- auto-graded and manual answers in one place.

create or replace function public.submit_exercise (
  p_exercise_id bigint,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  ex record;
  q record;
  status_val text;
  auto_score numeric := 0;
  max_score numeric := 0;
  answer_text text;
  submission_id bigint;
  grading_status text := 'complete';
  has_manual boolean := false;
  v_already_attempted boolean;
begin
  if v_student_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into ex from public.exercises where id = p_exercise_id;
  if not found then
    raise exception 'Exercise not found';
  end if;

  status_val := public.get_assessment_status(ex.start_date, ex.end_date, false);
  if status_val <> 'open' then
    raise exception 'Exercise is %', status_val;
  end if;

  if exists (
    select 1 from public.exercise_submissions
    where student_id = v_student_id and exercise_id = p_exercise_id
  ) then
    raise exception 'Already submitted';
  end if;

  for q in
    select * from public.questions
    where exercise_id = p_exercise_id
    order by "order"
  loop
    max_score := max_score + q.max_score;
    answer_text := coalesce(p_answers ->> q.id::text, '');

    if public.question_requires_manual(q.type) then
      has_manual := true;
    elsif q.type = 'mcq' and answer_text = q.correct_answer then
      auto_score := auto_score + q.max_score;
    elsif q.type in ('true_false', 'fill_blank')
      and public.normalize_answer(answer_text) = public.normalize_answer(q.correct_answer) then
      auto_score := auto_score + q.max_score;
    end if;
  end loop;

  if has_manual then
    grading_status := 'pending_manual';
  end if;

  insert into public.exercise_submissions (
    student_id,
    exercise_id,
    answers,
    score,
    max_score,
    grading_status
  )
  values (v_student_id, p_exercise_id, p_answers, auto_score, max_score, grading_status)
  returning id into submission_id;

  for q in
    select * from public.questions
    where exercise_id = p_exercise_id
    order by "order"
  loop
    answer_text := coalesce(p_answers ->> q.id::text, '');

    if public.question_requires_manual(q.type) then
      insert into public.exercise_answer_grades (
        submission_id,
        question_id,
        answer_text,
        max_score,
        score
      )
      values (submission_id, q.id, answer_text, q.max_score, null);
    elsif q.type = 'mcq' and answer_text = q.correct_answer then
      insert into public.exercise_answer_grades (
        submission_id,
        question_id,
        answer_text,
        max_score,
        score,
        graded_at
      )
      values (submission_id, q.id, answer_text, q.max_score, q.max_score, now());
    elsif q.type in ('true_false', 'fill_blank')
      and public.normalize_answer(answer_text) = public.normalize_answer(q.correct_answer) then
      insert into public.exercise_answer_grades (
        submission_id,
        question_id,
        answer_text,
        max_score,
        score,
        graded_at
      )
      values (submission_id, q.id, answer_text, q.max_score, q.max_score, now());
    else
      insert into public.exercise_answer_grades (
        submission_id,
        question_id,
        answer_text,
        max_score,
        score,
        graded_at
      )
      values (submission_id, q.id, answer_text, q.max_score, 0, now());
    end if;
  end loop;

  select has_attempted_exercise into v_already_attempted
  from public.profiles
  where id = v_student_id;

  update public.profiles
  set has_attempted_exercise = true
  where id = v_student_id;

  if not coalesce(v_already_attempted, false) then
    perform public.assign_registration_number(v_student_id);
  end if;

  return jsonb_build_object(
    'score', auto_score,
    'max_score', max_score,
    'grading_status', grading_status
  );
end;
$$;

-- Backfill existing submissions that only stored answers JSONB.
insert into public.exercise_answer_grades (
  submission_id,
  question_id,
  answer_text,
  max_score,
  score,
  graded_at
)
select
  es.id,
  q.id,
  coalesce(es.answers ->> q.id::text, ''),
  q.max_score,
  case
    when public.question_requires_manual(q.type) then null
    when q.type = 'mcq'
      and coalesce(es.answers ->> q.id::text, '') = q.correct_answer then q.max_score
    when q.type in ('true_false', 'fill_blank')
      and public.normalize_answer(coalesce(es.answers ->> q.id::text, ''))
        = public.normalize_answer(q.correct_answer) then q.max_score
  else 0
  end,
  case
    when public.question_requires_manual(q.type) then null
    else now()
  end
from public.exercise_submissions es
join public.questions q on q.exercise_id = es.exercise_id
where not exists (
  select 1
  from public.exercise_answer_grades g
  where g.submission_id = es.id
    and g.question_id = q.id
);
