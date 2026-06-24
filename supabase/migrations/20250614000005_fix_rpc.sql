-- Fix RPC function bugs

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
      and public.question_requires_manual(type)
    order by "order"
  loop
    answer_text := coalesce(p_answers ->> q.id::text, '');
    insert into public.exercise_answer_grades (
      submission_id,
      question_id,
      answer_text,
      max_score
    )
    values (submission_id, q.id, answer_text, q.max_score);
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

create or replace function public.grade_exercise_answer (
  p_grade_id bigint,
  p_score numeric,
  p_feedback text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission_id bigint;
  v_exercise_id bigint;
  v_answers jsonb;
  q record;
  auto_score numeric := 0;
  manual_score numeric := 0;
  answer_text text;
  pending boolean := false;
  grading_status text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select g.submission_id, s.exercise_id, s.answers
  into v_submission_id, v_exercise_id, v_answers
  from public.exercise_answer_grades g
  join public.exercise_submissions s on s.id = g.submission_id
  where g.id = p_grade_id;

  if v_submission_id is null then
    raise exception 'Grade not found';
  end if;

  update public.exercise_answer_grades
  set score = p_score,
      feedback = coalesce(p_feedback, ''),
      graded_at = now()
  where id = p_grade_id;

  for q in
    select * from public.questions where exercise_id = v_exercise_id
  loop
    if public.question_requires_manual(q.type) then
      continue;
    end if;
    answer_text := coalesce(v_answers ->> q.id::text, '');
    if q.type = 'mcq' and answer_text = q.correct_answer then
      auto_score := auto_score + q.max_score;
    elsif q.type in ('true_false', 'fill_blank')
      and public.normalize_answer(answer_text) = public.normalize_answer(q.correct_answer) then
      auto_score := auto_score + q.max_score;
    end if;
  end loop;

  select coalesce(sum(score), 0),
         bool_or(score is null)
  into manual_score, pending
  from public.exercise_answer_grades
  where submission_id = v_submission_id;

  grading_status := case when pending then 'pending_manual' else 'complete' end;

  update public.exercise_submissions
  set score = auto_score + manual_score,
      grading_status = grading_status
  where id = v_submission_id;

  return jsonb_build_object('grading_status', grading_status);
end;
$$;
