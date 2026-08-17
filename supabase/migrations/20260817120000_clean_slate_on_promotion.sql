-- Systemic fix: students could have leftover exercise_submissions,
-- exam_submissions, manual_scores, or topic_completions rows for a
-- marhalah they hadn't actually reached yet (leftover seed/test data, or
-- data entered against the wrong marhalah_id). Since results for each
-- marhalah must be fully independent, any promotion - automatic
-- (maybe_promote_student) or staff-initiated (update-student edge
-- function) - now proactively wipes whatever pre-existing data sits in the
-- marhalah being entered, so every student always starts every stage from
-- a guaranteed-clean slate. This mirrors the failed-attempt reset that
-- already existed, just applied on the pass path too.
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
  delete from public.exercise_submissions
  where student_id = p_student_id
    and exercise_id in (select id from public.exercises where marhalah_id = p_marhalah_id);

  delete from public.exam_submissions
  where student_id = p_student_id
    and exam_id in (select id from public.exams where marhalah_id = p_marhalah_id);

  delete from public.manual_scores
  where student_id = p_student_id
    and marhalah_id = p_marhalah_id;

  delete from public.topic_completions
  where student_id = p_student_id
    and topic_id in (select id from public.topics where marhalah_id = p_marhalah_id);
end;
$$;

revoke all on function public.reset_marhalah_progress (uuid, bigint) from public, anon;
grant execute on function public.reset_marhalah_progress (uuid, bigint) to authenticated, service_role;

-- Redefine maybe_promote_student: reuse reset_marhalah_progress for the
-- fail branch (unchanged behaviour, just DRY), and call it on the NEW
-- marhalah before promoting on the pass branch, guaranteeing a clean start.
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
    exercise_pct, exam_pct, halaqah_pct, tadreeb_pct, final_score, passed
  ) values (
    p_student_id, v_marhalah_id, v_attempt,
    v_breakdown.exercise_pct, v_breakdown.exam_pct,
    v_breakdown.halaqah_pct, v_breakdown.tadreeb_pct,
    v_breakdown.final_score, false
  );

  perform public.reset_marhalah_progress(p_student_id, v_marhalah_id);

  update public.profiles
  set marhalah_attempt = marhalah_attempt + 1
  where id = p_student_id;

  return false;
end;
$$;

-- One-time cleanup: remove any currently-existing data for a marhalah
-- number strictly ahead of the student's actual current stage - this can
-- only be leftover/erroneous, never legitimate.
do $$
declare
  r record;
begin
  for r in
    select distinct p.id as student_id, m.id as marhalah_id
    from public.profiles p
    join public.marhalahs m on m.number > p.current_marhalah
    where p.role = 'student'
      and (
        exists (
          select 1 from public.exercise_submissions es
          join public.exercises e on e.id = es.exercise_id
          where es.student_id = p.id and e.marhalah_id = m.id
        )
        or exists (
          select 1 from public.exam_submissions es
          join public.exams ex on ex.id = es.exam_id
          where es.student_id = p.id and ex.marhalah_id = m.id
        )
        or exists (
          select 1 from public.manual_scores ms
          where ms.student_id = p.id and ms.marhalah_id = m.id
        )
        or exists (
          select 1 from public.topic_completions tc
          join public.topics t on t.id = tc.topic_id
          where tc.student_id = p.id and t.marhalah_id = m.id
        )
      )
  loop
    perform public.reset_marhalah_progress(r.student_id, r.marhalah_id);
  end loop;
end;
$$;

-- One-time cleanup: Asmaa's marhalah-2 halaqah/tadreeb rows (ids 1 and 2)
-- are dated 2026-07-19, a month before she was promoted into marhalah 2
-- today - leftover seed data predating her actual arrival at that stage,
-- not real marks. The "future marhalah" cleanup above can't catch this
-- specific case (marhalah 2 was her current stage by the time this runs),
-- so it's removed explicitly here.
delete from public.manual_scores
where id in (1, 2)
  and student_id = '13a83ddf-8335-4f29-9610-122cdf4ceefa'
  and marhalah_id = (select id from public.marhalahs where number = 2);
