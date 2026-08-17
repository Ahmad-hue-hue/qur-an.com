-- Scope every "current state" read to is_current = true, since
-- exercise_submissions/exam_submissions/manual_scores/topic_completions can
-- now hold archived rows from past attempts (20260817160000,
-- 20260817160100). Without this filter, e.g. calculate_final_score's
-- "order by submitted_at desc limit 1" pick on exam_submissions could
-- select an OLD archived exam row over a newer in-progress (not yet
-- submitted, submitted_at null) current one - is_current must be checked
-- explicitly, not inferred from recency.
create or replace function public.marhalah_topics_completed (
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
    from public.topics t
    where t.marhalah_id = p_marhalah_id
      and t.is_published = true
      and not exists (
        select 1
        from public.topic_completions tc
        where tc.topic_id = t.id
          and tc.student_id = p_student_id
          and tc.is_current = true
      )
  );
$$;

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
          and es.is_current = true
      )
  );
$$;

create or replace function public.calculate_final_score (
  p_student_id uuid,
  p_marhalah_id bigint
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  w record;
  total_weight int;
  exercise_pct numeric := 0;
  exam_pct numeric := 0;
  halaqah_pct numeric := 0;
  tadreeb_pct numeric := 0;
  ex_score numeric;
  ex_max numeric;
  exam_score numeric;
  exam_max numeric;
  manual record;
begin
  select * into w from public.score_weights where id = 1;
  if not found then
    return 0;
  end if;

  total_weight := w.exercises + w.exam + w.halaqah + w.tadreeb;

  if total_weight = 0 then
    return 0;
  end if;

  select coalesce(sum(score), 0), coalesce(sum(max_score), 0)
  into ex_score, ex_max
  from public.exercise_submissions es
  join public.exercises e on e.id = es.exercise_id
  where es.student_id = p_student_id
    and e.marhalah_id = p_marhalah_id
    and es.is_current = true;

  if ex_max > 0 then
    exercise_pct := (ex_score / ex_max) * 100;
  end if;

  select es.score, es.max_score
  into exam_score, exam_max
  from public.exam_submissions es
  join public.exams ex on ex.id = es.exam_id
  where es.student_id = p_student_id
    and ex.marhalah_id = p_marhalah_id
    and es.submitted_at is not null
    and es.is_current = true
  order by es.submitted_at desc
  limit 1;

  if exam_max > 0 then
    exam_pct := (exam_score / exam_max) * 100;
  end if;

  select * into manual
  from public.manual_scores
  where student_id = p_student_id
    and marhalah_id = p_marhalah_id
    and type = 'halaqah'
    and is_current = true;

  if found and manual.max_score > 0 then
    halaqah_pct := (manual.score / manual.max_score) * 100;
  end if;

  select * into manual
  from public.manual_scores
  where student_id = p_student_id
    and marhalah_id = p_marhalah_id
    and type = 'tadreeb'
    and is_current = true;

  if found and manual.max_score > 0 then
    tadreeb_pct := (manual.score / manual.max_score) * 100;
  end if;

  return round(
    (
      exercise_pct * w.exercises
      + exam_pct * w.exam
      + halaqah_pct * w.halaqah
      + tadreeb_pct * w.tadreeb
    )::numeric / total_weight,
    1
  );
end;
$$;

create or replace function public.calculate_final_score_breakdown (
  p_student_id uuid,
  p_marhalah_id bigint
)
returns table (
  exercise_pct numeric,
  exam_pct numeric,
  halaqah_pct numeric,
  tadreeb_pct numeric,
  final_score numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  w record;
  total_weight int;
  v_exercise_pct numeric := 0;
  v_exam_pct numeric := 0;
  v_halaqah_pct numeric := 0;
  v_tadreeb_pct numeric := 0;
  ex_score numeric;
  ex_max numeric;
  exam_score numeric;
  exam_max numeric;
  manual record;
begin
  select * into w from public.score_weights where id = 1;
  if not found then
    return query select 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric;
    return;
  end if;

  total_weight := w.exercises + w.exam + w.halaqah + w.tadreeb;

  if total_weight = 0 then
    return query select 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric;
    return;
  end if;

  select coalesce(sum(score), 0), coalesce(sum(max_score), 0)
  into ex_score, ex_max
  from public.exercise_submissions es
  join public.exercises e on e.id = es.exercise_id
  where es.student_id = p_student_id
    and e.marhalah_id = p_marhalah_id
    and es.is_current = true;

  if ex_max > 0 then
    v_exercise_pct := (ex_score / ex_max) * 100;
  end if;

  select es.score, es.max_score
  into exam_score, exam_max
  from public.exam_submissions es
  join public.exams ex on ex.id = es.exam_id
  where es.student_id = p_student_id
    and ex.marhalah_id = p_marhalah_id
    and es.submitted_at is not null
    and es.is_current = true
  order by es.submitted_at desc
  limit 1;

  if exam_max > 0 then
    v_exam_pct := (exam_score / exam_max) * 100;
  end if;

  select * into manual
  from public.manual_scores
  where student_id = p_student_id
    and marhalah_id = p_marhalah_id
    and type = 'halaqah'
    and is_current = true;

  if found and manual.max_score > 0 then
    v_halaqah_pct := (manual.score / manual.max_score) * 100;
  end if;

  select * into manual
  from public.manual_scores
  where student_id = p_student_id
    and marhalah_id = p_marhalah_id
    and type = 'tadreeb'
    and is_current = true;

  if found and manual.max_score > 0 then
    v_tadreeb_pct := (manual.score / manual.max_score) * 100;
  end if;

  return query select
    v_exercise_pct,
    v_exam_pct,
    v_halaqah_pct,
    v_tadreeb_pct,
    round(
      (
        v_exercise_pct * w.exercises
        + v_exam_pct * w.exam
        + v_halaqah_pct * w.halaqah
        + v_tadreeb_pct * w.tadreeb
      )::numeric / total_weight,
      1
    );
end;
$$;

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
      and es.is_current = true
  ) into v_exam_done;

  if not v_exam_done then
    return false;
  end if;

  select exists (
    select 1 from public.manual_scores
    where student_id = p_student_id
      and marhalah_id = v_marhalah_id
      and type = 'halaqah'
      and is_current = true
  ) into v_has_halaqah;

  if not v_has_halaqah then
    return false;
  end if;

  select exists (
    select 1 from public.manual_scores
    where student_id = p_student_id
      and marhalah_id = v_marhalah_id
      and type = 'tadreeb'
      and is_current = true
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
      and es.is_current = true
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
      and is_current = true
  ) into v_has_halaqah;

  select exists (
    select 1 from public.manual_scores
    where student_id = p_student_id
      and marhalah_id = v_marhalah_id
      and type = 'tadreeb'
      and is_current = true
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
