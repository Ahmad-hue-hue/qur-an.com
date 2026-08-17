-- The marhalah exam is now the decisive event. Previously, once the exam was
-- submitted, a student still missing a halaqah or tadreeb mark stayed stuck
-- in limbo forever (function returned false, no state change) instead of
-- being resolved. Now: exam-not-submitted is the only "still working, stay
-- blocked" state. Once the exam is submitted, the student is either promoted
-- (everything complete + score meets threshold) or failed-and-reset
-- (anything missing or below threshold) immediately — matching the "restart
-- with new intake" policy for incomplete/failing students.
create or replace function public.maybe_promote_student (p_student_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current smallint;
  v_marhalah_id bigint;
  v_next record;
  v_exercise_count int;
  v_submission_count int;
  v_exercise_complete boolean;
  v_exam_done boolean;
  v_has_halaqah boolean;
  v_has_tadreeb boolean;
  v_attempt smallint;
  v_breakdown record;
  v_pass boolean;
begin
  if p_student_id is null then
    return false;
  end if;

  select current_marhalah, marhalah_attempt into v_current, v_attempt
  from public.profiles
  where id = p_student_id
    and role = 'student';

  if v_current is null or v_current >= 4 then
    return false;
  end if;

  select id into v_marhalah_id
  from public.marhalahs
  where number = v_current;

  if v_marhalah_id is null then
    return false;
  end if;

  select count(*)::int into v_exercise_count
  from public.exercises
  where marhalah_id = v_marhalah_id;

  if v_exercise_count = 0 then
    return false;
  end if;

  select exists (
    select 1
    from public.exam_submissions es
    join public.exams ex on ex.id = es.exam_id
    where es.student_id = p_student_id
      and ex.marhalah_id = v_marhalah_id
      and es.submitted_at is not null
  ) into v_exam_done;

  -- Still working through the stage: nothing to decide yet.
  if not v_exam_done then
    return false;
  end if;

  select * into v_next
  from public.marhalahs
  where number = v_current + 1;

  if v_next is null then
    return false;
  end if;

  select count(distinct es.exercise_id)::int into v_submission_count
  from public.exercise_submissions es
  join public.exercises e on e.id = es.exercise_id
  where es.student_id = p_student_id
    and e.marhalah_id = v_marhalah_id
    and es.score is not null;

  v_exercise_complete := v_submission_count >= v_exercise_count;

  select exists (
    select 1 from public.manual_scores
    where student_id = p_student_id
      and marhalah_id = v_marhalah_id
      and type = 'halaqah'
  ) into v_has_halaqah;

  select exists (
    select 1 from public.manual_scores
    where student_id = p_student_id
      and marhalah_id = v_marhalah_id
      and type = 'tadreeb'
  ) into v_has_tadreeb;

  select * into v_breakdown
  from public.calculate_final_score_breakdown(p_student_id, v_marhalah_id);

  v_pass := v_exercise_complete
    and v_has_halaqah
    and v_has_tadreeb
    and v_breakdown.final_score is not null
    and v_breakdown.final_score >= v_next.unlock_threshold;

  if v_pass then
    update public.profiles
    set current_marhalah = v_current + 1
    where id = p_student_id
      and current_marhalah = v_current;

    return found;
  end if;

  -- Fail: conclude this attempt, record it, and reset for a fresh attempt.
  insert into public.marhalah_attempt_history (
    student_id, marhalah_id, attempt_number,
    exercise_pct, exam_pct, halaqah_pct, tadreeb_pct, final_score, passed
  ) values (
    p_student_id, v_marhalah_id, v_attempt,
    v_breakdown.exercise_pct, v_breakdown.exam_pct,
    v_breakdown.halaqah_pct, v_breakdown.tadreeb_pct,
    v_breakdown.final_score, false
  );

  delete from public.exercise_submissions
  where student_id = p_student_id
    and exercise_id in (select id from public.exercises where marhalah_id = v_marhalah_id);

  delete from public.exam_submissions
  where student_id = p_student_id
    and exam_id in (select id from public.exams where marhalah_id = v_marhalah_id);

  delete from public.manual_scores
  where student_id = p_student_id
    and marhalah_id = v_marhalah_id;

  delete from public.topic_completions
  where student_id = p_student_id
    and topic_id in (select id from public.topics where marhalah_id = v_marhalah_id);

  update public.profiles
  set marhalah_attempt = marhalah_attempt + 1
  where id = p_student_id;

  return false;
end;
$$;

revoke all on function public.maybe_promote_student (uuid) from public, anon;
grant execute on function public.maybe_promote_student (uuid) to authenticated, service_role;
