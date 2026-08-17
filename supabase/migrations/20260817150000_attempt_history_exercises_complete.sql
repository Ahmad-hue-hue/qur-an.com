-- The "reason for failure" shown to students needs to distinguish
-- "exercises not fully submitted" from "score below the pass mark" - but
-- exercise_pct alone can't reveal that, since it's the average of only the
-- exercises that WERE submitted, not a completeness signal (a student who
-- submitted 9 of 11 exercises and scored 100% on those 9 still shows
-- exercise_pct = 100). maybe_promote_student already computes
-- v_exercise_complete as a real boolean before deciding pass/fail; store it
-- so the reason can be accurate instead of guessed from percentages.
alter table public.marhalah_attempt_history
  add column if not exists exercises_complete boolean;

-- Best-effort backfill for existing rows: a failed attempt with every
-- percentage above zero but still failing can only be explained by
-- incomplete exercises (the score/halaqah/tadreeb gates were all clearly
-- satisfied) - this exact signature is what the pre-fix orphaned-exercise
-- bug produced. Rows with a zero percentage already have a clear reason
-- regardless of this flag, so they're left null (unknown/not needed).
update public.marhalah_attempt_history
set exercises_complete = false
where passed = false
  and exercises_complete is null
  and coalesce(exercise_pct, 0) > 0
  and coalesce(halaqah_pct, 0) > 0
  and coalesce(tadreeb_pct, 0) > 0;

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

  v_exercise_complete := public.marhalah_exercises_completed(p_student_id, v_marhalah_id);

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
    perform public.reset_marhalah_progress(p_student_id, v_next.id);

    update public.profiles
    set current_marhalah = v_current + 1
    where id = p_student_id
      and current_marhalah = v_current;

    return found;
  end if;

  -- Fail: conclude this attempt, record it, and reset for a fresh attempt.
  insert into public.marhalah_attempt_history (
    student_id, marhalah_id, attempt_number,
    exercise_pct, exam_pct, halaqah_pct, tadreeb_pct, final_score, passed,
    exercises_complete
  ) values (
    p_student_id, v_marhalah_id, v_attempt,
    v_breakdown.exercise_pct, v_breakdown.exam_pct,
    v_breakdown.halaqah_pct, v_breakdown.tadreeb_pct,
    v_breakdown.final_score, false,
    v_exercise_complete
  );

  perform public.reset_marhalah_progress(p_student_id, v_marhalah_id);

  update public.profiles
  set marhalah_attempt = marhalah_attempt + 1
  where id = p_student_id;

  return false;
end;
$$;
