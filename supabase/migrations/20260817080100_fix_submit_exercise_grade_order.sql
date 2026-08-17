-- Same bug class as 20260817080000_fix_submit_exam_grade_order.sql, but for
-- exercises: submit_exercise's INSERT into exercise_submissions fires
-- exercise_submissions_maybe_promote on ANY insert (not gated to a specific
-- column, unlike the exam trigger), invoking maybe_promote_student
-- synchronously. If the exam for this marhalah has already been submitted
-- and the student is failing, the fail branch deletes exercise_submissions
-- for the whole marhalah - including the row submit_exercise just inserted -
-- before submit_exercise's second loop inserts exercise_answer_grades rows
-- referencing that now-deleted id, violating
-- exercise_answer_grades_submission_id_fkey.
--
-- Fix: insert a placeholder exercise_submissions row first (not yet carrying
-- its final score), insert the exercise_answer_grades rows while that row is
-- guaranteed to still exist, then UPDATE the submission's score/max_score/
-- grading_status last. The trigger is retargeted to fire only on that final
-- UPDATE OF score (matching the exam trigger's shape), not on the initial
-- insert, so it only runs once grading is fully written.
--
-- Local variables are prefixed v_ throughout (the original function reused
-- bare max_score/grading_status names matching the table's own columns,
-- which is fine inside a plain VALUES(...) list but becomes a genuinely
-- ambiguous column reference in "update ... set max_score = max_score").
drop trigger if exists exercise_submissions_maybe_promote on public.exercise_submissions;
create trigger exercise_submissions_maybe_promote
after update of score on public.exercise_submissions
for each row
execute function public.trigger_maybe_promote_from_exercise();

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
  -- the promotion trigger (now gated on "update of score") does not fire
  -- here.
  insert into public.exercise_submissions (
    student_id,
    exercise_id,
    answers,
    score,
    max_score,
    grading_status
  )
  values (v_student_id, p_exercise_id, p_answers, 0, 0, 'pending_manual')
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
