-- Write paths: stamp attempt_number on new rows (from profiles.marhalah_attempt,
-- the only place this schema tracks "which attempt is active"), and scope
-- existing-row lookups to is_current = true so a fresh attempt after a
-- reset creates new rows instead of colliding with archived ones.

create or replace function public.start_exam (p_exam_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  ex record;
  profile record;
  status_val text;
  submission record;
  v_max_score numeric := 0;
  deadline timestamptz;
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

  if not public.marhalah_exercises_completed(v_student_id, ex.marhalah_id) then
    raise exception 'Complete all exercises in this Marḥalah before taking the exam.';
  end if;

  if ex.is_locked then
    raise exception 'This exam is locked. Ask your admin to open it.';
  end if;

  select coalesce(sum(q.max_score), 0)
  into v_max_score
  from public.questions q
  where q.exam_id = p_exam_id;

  if v_max_score <= 0 then
    raise exception 'This exam has no questions yet.';
  end if;

  select * into submission
  from public.exam_submissions
  where student_id = v_student_id
    and exam_id = p_exam_id
    and is_current = true;

  if found and submission.submitted_at is not null then
    raise exception 'Already submitted';
  end if;

  status_val := public.get_assessment_status(
    ex.start_date,
    ex.end_date,
    coalesce(submission.submitted_at is not null, false)
  );
  if status_val <> 'open' then
    raise exception 'Exam is %', status_val;
  end if;

  if not found then
    insert into public.exam_submissions (
      student_id,
      exam_id,
      answers,
      score,
      max_score,
      started_at,
      attempt_number
    )
    values (v_student_id, p_exam_id, '{}'::jsonb, 0, v_max_score, now(), profile.marhalah_attempt)
    returning * into submission;
  end if;

  deadline := submission.started_at + make_interval(mins => ex.duration_minutes);

  if now() > deadline then
    raise exception 'Exam time has expired';
  end if;

  return jsonb_build_object(
    'started_at', submission.started_at,
    'deadline_at', deadline,
    'remaining_seconds', greatest(0, floor(extract(epoch from (deadline - now()))))::int
  );
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
  v_attempt_before smallint;
  v_history record;
  v_current_after smallint;
  v_outcome text;
begin
  if v_student_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into profile from public.profiles where id = v_student_id;
  if not found then
    raise exception 'Profile not found';
  end if;

  v_attempt_before := profile.marhalah_attempt;

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
    and exam_id = p_exam_id
    and is_current = true;

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

  -- Write the per-question grades first, while the submission row is still
  -- guaranteed to exist (submitted_at not yet set, so the promotion/reset
  -- trigger hasn't fired for this submission).
  for q in
    select * from public.questions
    where exam_id = p_exam_id
    order by "order"
  loop
    answer_text := coalesce(p_answers ->> q.id::text, '');

    if public.question_requires_manual(q.type) then
      insert into public.exam_answer_grades (
        submission_id, question_id, answer_text, max_score, score
      )
      values (submission.id, q.id, answer_text, q.max_score, null);
    elsif q.type = 'mcq'
      and public.normalize_mcq_answer(answer_text) = public.normalize_mcq_answer(q.correct_answer) then
      insert into public.exam_answer_grades (
        submission_id, question_id, answer_text, max_score, score, graded_at
      )
      values (submission.id, q.id, answer_text, q.max_score, q.max_score, now());
    elsif q.type = 'true_false'
      and public.normalize_answer(answer_text) = public.normalize_answer(q.correct_answer) then
      insert into public.exam_answer_grades (
        submission_id, question_id, answer_text, max_score, score, graded_at
      )
      values (submission.id, q.id, answer_text, q.max_score, q.max_score, now());
    else
      insert into public.exam_answer_grades (
        submission_id, question_id, answer_text, max_score, score, graded_at
      )
      values (submission.id, q.id, answer_text, q.max_score, 0, now());
    end if;
  end loop;

  -- Mark the submission as submitted last - this fires the promotion/reset
  -- trigger, which may archive this exam_submissions row if the attempt
  -- fails (exam_answer_grades rows stay put either way now).
  update public.exam_submissions
  set answers = p_answers,
      score = auto_score,
      max_score = v_max_score,
      grading_status = v_grading_status,
      submitted_at = now()
  where id = submission.id;

  -- The promotion/reset trigger has now fired synchronously above. Work out
  -- what it decided so the student gets immediate, clear feedback instead
  -- of discovering a reset later on the results page.
  select current_marhalah into v_current_after
  from public.profiles
  where id = v_student_id;

  select * into v_history
  from public.marhalah_attempt_history
  where student_id = v_student_id
    and marhalah_id = ex.marhalah_id
    and attempt_number = v_attempt_before
  order by concluded_at desc
  limit 1;

  if found then
    v_outcome := 'reset';
  elsif v_current_after > profile.current_marhalah then
    v_outcome := 'passed';
  else
    v_outcome := 'pending';
  end if;

  return jsonb_build_object(
    'score', auto_score,
    'max_score', v_max_score,
    'grading_status', v_grading_status,
    'outcome', v_outcome,
    'final_score', v_history.final_score,
    'exercise_pct', v_history.exercise_pct,
    'halaqah_pct', v_history.halaqah_pct,
    'tadreeb_pct', v_history.tadreeb_pct,
    'exercises_complete', v_history.exercises_complete
  );
end;
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
  v_auto_score numeric := 0;
  v_max_score numeric := 0;
  answer_text text;
  v_submission_id bigint;
  v_grading_status text := 'complete';
  has_manual boolean := false;
  v_already_attempted boolean;
  v_attempt_number smallint;
begin
  if v_student_id is null then
    raise exception 'Not authenticated';
  end if;

  select marhalah_attempt into v_attempt_number
  from public.profiles
  where id = v_student_id;

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
    where student_id = v_student_id and exercise_id = p_exercise_id and is_current = true
  ) then
    raise exception 'Already submitted';
  end if;

  for q in
    select * from public.questions
    where exercise_id = p_exercise_id
    order by "order"
  loop
    v_max_score := v_max_score + q.max_score;
    answer_text := coalesce(p_answers ->> q.id::text, '');

    if public.question_requires_manual(q.type) then
      has_manual := true;
    elsif q.type = 'mcq'
      and public.normalize_mcq_answer(answer_text) = public.normalize_mcq_answer(q.correct_answer) then
      v_auto_score := v_auto_score + q.max_score;
    elsif q.type = 'true_false'
      and public.normalize_answer(answer_text) = public.normalize_answer(q.correct_answer) then
      v_auto_score := v_auto_score + q.max_score;
    end if;
  end loop;

  if has_manual then
    v_grading_status := 'pending_manual';
  end if;

  -- Placeholder insert: score/max_score/grading_status are not yet final, so
  -- the promotion trigger (gated on "update of score") does not fire here.
  insert into public.exercise_submissions (
    student_id,
    exercise_id,
    answers,
    score,
    max_score,
    grading_status,
    attempt_number
  )
  values (v_student_id, p_exercise_id, p_answers, 0, 0, 'pending_manual', v_attempt_number)
  returning id into v_submission_id;

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
      values (v_submission_id, q.id, answer_text, q.max_score, null);
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
      values (v_submission_id, q.id, answer_text, q.max_score, q.max_score, now());
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
      values (v_submission_id, q.id, answer_text, q.max_score, q.max_score, now());
    else
      insert into public.exercise_answer_grades (
        submission_id,
        question_id,
        answer_text,
        max_score,
        score,
        graded_at
      )
      values (v_submission_id, q.id, answer_text, q.max_score, 0, now());
    end if;
  end loop;

  -- Final write: sets the real score, firing the promotion trigger only now
  -- that every exercise_answer_grades row already exists.
  update public.exercise_submissions
  set score = v_auto_score,
      max_score = v_max_score,
      grading_status = v_grading_status
  where id = v_submission_id;

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
    'score', v_auto_score,
    'max_score', v_max_score,
    'grading_status', v_grading_status
  );
end;
$$;

-- Replaces the direct client .upsert(onConflict:"student_id,marhalah_id,type")
-- on manual_scores, which would overwrite the previous attempt's mark in
-- place instead of preserving it. Archives any current row for this
-- (student, marhalah, type), then inserts a fresh one stamped with the
-- student's active attempt number.
create or replace function public.upsert_manual_score (
  p_student_id uuid,
  p_marhalah_id bigint,
  p_type text,
  p_score numeric,
  p_max_score numeric,
  p_notes text default ''
)
returns public.manual_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_number smallint;
  v_result public.manual_scores;
begin
  if not public.is_staff() then
    raise exception 'Staff only';
  end if;

  if p_type not in ('halaqah', 'tadreeb') then
    raise exception 'Invalid manual score type';
  end if;

  select marhalah_attempt into v_attempt_number
  from public.profiles
  where id = p_student_id and role = 'student';

  if v_attempt_number is null then
    raise exception 'Student not found';
  end if;

  -- Archive a stale current row only if it belongs to an OLDER attempt
  -- (shouldn't normally happen - reset_marhalah_progress archives on every
  -- attempt transition - but guards against it regardless). Editing the
  -- mark again within the SAME attempt must update in place, not insert a
  -- second row for that attempt (which would violate the unique
  -- constraint on (student_id, marhalah_id, type, attempt_number)).
  update public.manual_scores
  set is_current = false
  where student_id = p_student_id
    and marhalah_id = p_marhalah_id
    and type = p_type
    and is_current = true
    and attempt_number <> v_attempt_number;

  insert into public.manual_scores (
    student_id, marhalah_id, type, score, max_score, notes, attempt_number, is_current
  ) values (
    p_student_id, p_marhalah_id, p_type, p_score, p_max_score, coalesce(p_notes, ''), v_attempt_number, true
  )
  on conflict (student_id, marhalah_id, type, attempt_number)
  do update set
    score = excluded.score,
    max_score = excluded.max_score,
    notes = excluded.notes,
    updated_at = now(),
    is_current = true
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.upsert_manual_score (uuid, bigint, text, numeric, numeric, text) from public, anon;
grant execute on function public.upsert_manual_score (uuid, bigint, text, numeric, numeric, text) to authenticated, service_role;

-- Replaces the direct client insert into topic_completions
-- (frontend/lib/supabase/student.ts), so attempt_number is stamped
-- server-side rather than trusted from the client.
create or replace function public.mark_topic_complete (p_topic_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_attempt_number smallint;
begin
  if v_student_id is null then
    raise exception 'Not authenticated';
  end if;

  select marhalah_attempt into v_attempt_number
  from public.profiles
  where id = v_student_id;

  insert into public.topic_completions (student_id, topic_id, attempt_number)
  values (v_student_id, p_topic_id, v_attempt_number)
  on conflict (student_id, topic_id, attempt_number) do nothing;
end;
$$;

revoke all on function public.mark_topic_complete (bigint) from public, anon;
grant execute on function public.mark_topic_complete (bigint) to authenticated, service_role;
