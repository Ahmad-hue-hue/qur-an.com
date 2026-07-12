-- Allow admins to clear submissions when exercise/exam questions change
-- so students can answer the updated quiz.

create or replace function public.reset_exercise_submissions (p_exercise_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  delete from public.exercise_submissions
  where exercise_id = p_exercise_id;
end;
$$;

create or replace function public.reset_exam_submissions (p_exam_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  delete from public.exam_submissions
  where exam_id = p_exam_id;
end;
$$;

revoke all on function public.reset_exercise_submissions (bigint) from public, anon;
revoke all on function public.reset_exam_submissions (bigint) from public, anon;

grant execute on function public.reset_exercise_submissions (bigint) to authenticated, service_role;
grant execute on function public.reset_exam_submissions (bigint) to authenticated, service_role;
