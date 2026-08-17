-- Bug: submit_exam() updated exam_submissions.submitted_at (which fires the
-- exam_submissions_maybe_promote trigger, invoking maybe_promote_student
-- synchronously) BEFORE inserting the exam_answer_grades rows for that
-- submission. Since 20260817073100_marhalah_exam_decisive.sql made exam
-- submission the decisive event, any non-passing submission causes
-- maybe_promote_student's fail branch to delete the exam_submissions row
-- mid-transaction, so submit_exam's later exam_answer_grades inserts then
-- violate exam_answer_grades_submission_id_fkey (the row they reference was
-- just deleted). Fix: insert exam_answer_grades first, then update
-- exam_submissions (submitted_at) last, so the promotion/reset trigger only
-- fires after grading is fully written. If the attempt fails and gets reset,
-- the just-inserted exam_answer_grades rows are cleanly removed via
-- exam_answer_grades_submission_id_fkey's own "on delete cascade" when
-- exam_submissions is deleted - consistent either way.
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
  -- trigger, which may delete this exam_submissions row (cascading the
  -- exam_answer_grades rows just inserted) if the attempt fails.
  update public.exam_submissions
  set answers = p_answers,
      score = auto_score,
      max_score = v_max_score,
      grading_status = v_grading_status,
      submitted_at = now()
  where id = submission.id;

  return jsonb_build_object(
    'score', auto_score,
    'max_score', v_max_score,
    'grading_status', v_grading_status
  );
end;
$$;
