-- Only MCQ and True/False are auto-graded. Fill blank, fill the gap, and written require manual grading.

create or replace function public.question_requires_manual (q_type text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select q_type in ('fill_blank', 'fill_gap', 'written');
$$;

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
    elsif q.type = 'mcq'
      and public.normalize_mcq_answer(answer_text) = public.normalize_mcq_answer(q.correct_answer) then
      auto_score := auto_score + q.max_score;
    elsif q.type = 'true_false'
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
    elsif q.type = 'mcq'
      and public.normalize_mcq_answer(answer_text) = public.normalize_mcq_answer(q.correct_answer) then
      insert into public.exercise_answer_grades (
        submission_id,
        question_id,
        answer_text,
        max_score,
        score,
        graded_at
      )
      values (submission_id, q.id, answer_text, q.max_score, q.max_score, now());
    elsif q.type = 'true_false'
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
  v_total_score numeric := 0;
  v_pending boolean := false;
  v_grading_status text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select g.submission_id, s.exercise_id
  into v_submission_id, v_exercise_id
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

  select bool_or(score is null)
  into v_pending
  from public.exercise_answer_grades
  where submission_id = v_submission_id;

  select coalesce(sum(score), 0)
  into v_total_score
  from public.exercise_answer_grades
  where submission_id = v_submission_id
    and score is not null;

  v_grading_status := case when v_pending then 'pending_manual' else 'complete' end;

  update public.exercise_submissions
  set score = v_total_score,
      grading_status = v_grading_status
  where id = v_submission_id;

  return jsonb_build_object('grading_status', v_grading_status);
end;
$$;

create or replace function public.submit_exam (
  p_exam_id bigint,
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
  profile record;
  q record;
  status_val text;
  submission record;
  auto_score numeric := 0;
  v_max_score numeric := 0;
  answer_text text;
  deadline timestamptz;
  v_grading_status text := 'complete';
  has_manual boolean := false;
begin
  if v_student_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into profile from public.profiles where id = v_student_id;
  if not found then
    raise exception 'Profile not found';
  end if;

  select * into ex from public.exams where id = p_exam_id;
  if not found then
    raise exception 'Exam not found';
  end if;

  if ex.marhalah_id <> (
    select id from public.marhalahs where number = profile.current_marhalah
  ) then
    raise exception 'This exam belongs to a different Marḥalah than your current stage.';
  end if;

  if not public.marhalah_topics_completed(v_student_id, ex.marhalah_id) then
    raise exception 'Complete all topics in this Marḥalah before taking the exam.';
  end if;

  select * into submission
  from public.exam_submissions
  where student_id = v_student_id
    and exam_id = p_exam_id;

  if not found then
    raise exception 'Start the exam before submitting';
  end if;

  if submission.submitted_at is not null then
    raise exception 'Already submitted';
  end if;

  status_val := public.get_assessment_status(ex.start_date, ex.end_date, false);
  if status_val <> 'open' then
    raise exception 'Exam is %', status_val;
  end if;

  deadline := submission.started_at + make_interval(mins => ex.duration_minutes);
  if now() > deadline then
    raise exception 'Exam time has expired';
  end if;

  for q in
    select * from public.questions
    where exam_id = p_exam_id
    order by "order"
  loop
    v_max_score := v_max_score + q.max_score;
    answer_text := coalesce(p_answers ->> q.id::text, '');

    if public.question_requires_manual(q.type) then
      has_manual := true;
    elsif q.type = 'mcq'
      and public.normalize_mcq_answer(answer_text) = public.normalize_mcq_answer(q.correct_answer) then
      auto_score := auto_score + q.max_score;
    elsif q.type = 'true_false'
      and public.normalize_answer(answer_text) = public.normalize_answer(q.correct_answer) then
      auto_score := auto_score + q.max_score;
    end if;
  end loop;

  if has_manual then
    v_grading_status := 'pending_manual';
  end if;

  update public.exam_submissions
  set answers = p_answers,
      score = auto_score,
      max_score = v_max_score,
      grading_status = v_grading_status,
      submitted_at = now()
  where id = submission.id;

  for q in
    select * from public.questions
    where exam_id = p_exam_id
    order by "order"
  loop
    answer_text := coalesce(p_answers ->> q.id::text, '');

    if public.question_requires_manual(q.type) then
      insert into public.exam_answer_grades (
        submission_id,
        question_id,
        answer_text,
        max_score,
        score
      )
      values (submission.id, q.id, answer_text, q.max_score, null);
    elsif q.type = 'mcq'
      and public.normalize_mcq_answer(answer_text) = public.normalize_mcq_answer(q.correct_answer) then
      insert into public.exam_answer_grades (
        submission_id,
        question_id,
        answer_text,
        max_score,
        score,
        graded_at
      )
      values (submission.id, q.id, answer_text, q.max_score, q.max_score, now());
    elsif q.type = 'true_false'
      and public.normalize_answer(answer_text) = public.normalize_answer(q.correct_answer) then
      insert into public.exam_answer_grades (
        submission_id,
        question_id,
        answer_text,
        max_score,
        score,
        graded_at
      )
      values (submission.id, q.id, answer_text, q.max_score, q.max_score, now());
    else
      insert into public.exam_answer_grades (
        submission_id,
        question_id,
        answer_text,
        max_score,
        score,
        graded_at
      )
      values (submission.id, q.id, answer_text, q.max_score, 0, now());
    end if;
  end loop;

  return jsonb_build_object(
    'score', auto_score,
    'max_score', v_max_score,
    'grading_status', v_grading_status
  );
end;
$$;

create or replace function public.grade_exam_answer (
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
  v_exam_id bigint;
  v_total_score numeric := 0;
  v_pending boolean := false;
  v_grading_status text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select g.submission_id, s.exam_id
  into v_submission_id, v_exam_id
  from public.exam_answer_grades g
  join public.exam_submissions s on s.id = g.submission_id
  where g.id = p_grade_id;

  if v_submission_id is null then
    raise exception 'Grade not found';
  end if;

  update public.exam_answer_grades
  set score = p_score,
      feedback = coalesce(p_feedback, ''),
      graded_at = now()
  where id = p_grade_id;

  select bool_or(score is null)
  into v_pending
  from public.exam_answer_grades
  where submission_id = v_submission_id;

  select coalesce(sum(score), 0)
  into v_total_score
  from public.exam_answer_grades
  where submission_id = v_submission_id
    and score is not null;

  v_grading_status := case when v_pending then 'pending_manual' else 'complete' end;

  update public.exam_submissions
  set score = v_total_score,
      grading_status = v_grading_status
  where id = v_submission_id;

  return jsonb_build_object('grading_status', v_grading_status);
end;
$$;

-- Move existing fill_blank auto-grades to pending manual review.
update public.exercise_answer_grades g
set score = null, graded_at = null, feedback = ''
from public.questions q
where q.id = g.question_id
  and q.type = 'fill_blank'
  and g.graded_at is not null;

update public.exam_answer_grades g
set score = null, graded_at = null, feedback = ''
from public.questions q
where q.id = g.question_id
  and q.type = 'fill_blank'
  and g.graded_at is not null;

update public.exercise_submissions s
set
  score = coalesce((
    select sum(g.score)
    from public.exercise_answer_grades g
    where g.submission_id = s.id
      and g.score is not null
  ), 0),
  grading_status = case
    when exists (
      select 1
      from public.exercise_answer_grades g
      where g.submission_id = s.id
        and g.score is null
    ) then 'pending_manual'
    else 'complete'
  end
where exists (
  select 1
  from public.exercise_answer_grades g
  join public.questions q on q.id = g.question_id
  where g.submission_id = s.id
    and q.type = 'fill_blank'
);

update public.exam_submissions s
set
  score = coalesce((
    select sum(g.score)
    from public.exam_answer_grades g
    where g.submission_id = s.id
      and g.score is not null
  ), 0),
  grading_status = case
    when exists (
      select 1
      from public.exam_answer_grades g
      where g.submission_id = s.id
        and g.score is null
    ) then 'pending_manual'
    else 'complete'
  end
where submitted_at is not null
  and exists (
    select 1
    from public.exam_answer_grades g
    join public.questions q on q.id = g.question_id
    where g.submission_id = s.id
      and q.type = 'fill_blank'
  );
