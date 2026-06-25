-- Fix ambiguous column reference when PL/pgSQL variable names match table columns.

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
