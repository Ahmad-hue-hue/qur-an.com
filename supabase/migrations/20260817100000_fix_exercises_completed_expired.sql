-- Critical fix: marhalah_exercises_completed() (20260817090000) required EVERY
-- exercise ever created for the marhalah to have a submission, with no
-- regard for whether that exercise's submission window is still open. Real
-- production data has orphaned/expired exercises (e.g. leftover test
-- content whose end_date passed months ago, with no way for any student to
-- ever submit them) - these permanently blocked every student in that
-- marhalah from ever reaching the exam, since an expired-and-unsubmitted
-- exercise can never be satisfied.
--
-- Fix: only require exercises that are currently open (or already
-- submitted - those are satisfied regardless of status) to be submitted.
-- Expired-and-never-submitted exercises are skipped (nothing the student
-- can still do about them); not-yet-open exercises aren't required until
-- they open either.
create or replace function public.marhalah_exercises_completed (
  p_student_id uuid,
  p_marhalah_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.exercises e
    where e.marhalah_id = p_marhalah_id
      and public.get_assessment_status(e.start_date, e.end_date, false) = 'open'
      and not exists (
        select 1
        from public.exercise_submissions es
        where es.exercise_id = e.id
          and es.student_id = p_student_id
          and es.score is not null
      )
  );
$$;

-- can_promote_student and maybe_promote_student had the same unfiltered
-- "every exercise ever created" comparison, which would equally block
-- promotion forever once a marhalah has any permanently-expired,
-- never-submitted exercise. Redefined to reuse marhalah_exercises_completed
-- for the actual completeness check, while keeping the separate
-- "no exercises configured yet" guard (that one intentionally blocks
-- promotion until an admin sets the marhalah up).
create or replace function public.can_promote_student (p_student_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_current smallint;
  v_marhalah_id bigint;
  v_next record;
  v_exercise_count int;
  v_exam_done boolean;
  v_has_halaqah boolean;
  v_has_tadreeb boolean;
  v_score numeric;
begin
  if p_student_id is null then
    return false;
  end if;

  select current_marhalah into v_current
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

  if not public.marhalah_exercises_completed(p_student_id, v_marhalah_id) then
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

  if not v_exam_done then
    return false;
  end if;

  select exists (
    select 1 from public.manual_scores
    where student_id = p_student_id
      and marhalah_id = v_marhalah_id
      and type = 'halaqah'
  ) into v_has_halaqah;

  if not v_has_halaqah then
    return false;
  end if;

  select exists (
    select 1 from public.manual_scores
    where student_id = p_student_id
      and marhalah_id = v_marhalah_id
      and type = 'tadreeb'
  ) into v_has_tadreeb;

  if not v_has_tadreeb then
    return false;
  end if;

  select * into v_next
  from public.marhalahs
  where number = v_current + 1;

  if not found then
    return false;
  end if;

  v_score := public.calculate_final_score(p_student_id, v_marhalah_id);
  if v_score is null or v_score < v_next.unlock_threshold then
    return false;
  end if;

  return true;
end;
$$;

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
