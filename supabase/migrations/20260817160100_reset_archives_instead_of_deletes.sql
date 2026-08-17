-- reset_marhalah_progress now archives (is_current = false) instead of
-- deleting, so a student's answers/marks survive across attempts. Same
-- signature, same callers (maybe_promote_student's pass and fail branches,
-- and the update-student edge function) - no other changes needed there.
create or replace function public.reset_marhalah_progress (
  p_student_id uuid,
  p_marhalah_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.exercise_submissions
  set is_current = false
  where student_id = p_student_id
    and is_current = true
    and exercise_id in (select id from public.exercises where marhalah_id = p_marhalah_id);

  update public.exam_submissions
  set is_current = false
  where student_id = p_student_id
    and is_current = true
    and exam_id in (select id from public.exams where marhalah_id = p_marhalah_id);

  update public.manual_scores
  set is_current = false
  where student_id = p_student_id
    and is_current = true
    and marhalah_id = p_marhalah_id;

  update public.topic_completions
  set is_current = false
  where student_id = p_student_id
    and is_current = true
    and topic_id in (select id from public.topics where marhalah_id = p_marhalah_id);
end;
$$;
