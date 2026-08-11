-- Feature: teachers can now record ḥalaqah (recitation circle) marks for
-- Marḥalah 1 too (previously only exercises + exam counted, per
-- 20250616000003_marhalah1_no_oral_scores.sql). Tadreeb stays excluded from
-- Marḥalah 1 -- only ḥalaqah was requested.
--
-- calculate_final_score: fold ḥalaqah into every marhalah's weighted score;
-- tadreeb remains marhalah <> 1 only.
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
  marhalah_num int;
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

  select number into marhalah_num
  from public.marhalahs
  where id = p_marhalah_id;

  if marhalah_num = 1 then
    total_weight := w.exercises + w.exam + w.halaqah;
  else
    total_weight := w.exercises + w.exam + w.halaqah + w.tadreeb;
  end if;

  if total_weight = 0 then
    return 0;
  end if;

  select coalesce(sum(score), 0), coalesce(sum(max_score), 0)
  into ex_score, ex_max
  from public.exercise_submissions es
  join public.exercises e on e.id = es.exercise_id
  where es.student_id = p_student_id
    and e.marhalah_id = p_marhalah_id;

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
  order by es.submitted_at desc
  limit 1;

  if exam_max > 0 then
    exam_pct := (exam_score / exam_max) * 100;
  end if;

  select * into manual
  from public.manual_scores
  where student_id = p_student_id
    and marhalah_id = p_marhalah_id
    and type = 'halaqah';

  if found and manual.max_score > 0 then
    halaqah_pct := (manual.score / manual.max_score) * 100;
  end if;

  if marhalah_num <> 1 then
    select * into manual
    from public.manual_scores
    where student_id = p_student_id
      and marhalah_id = p_marhalah_id
      and type = 'tadreeb';

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
  end if;

  return round(
    (
      exercise_pct * w.exercises
      + exam_pct * w.exam
      + halaqah_pct * w.halaqah
    )::numeric / total_weight,
    1
  );
end;
$$;

-- maybe_promote_student: ḥalaqah is now a promotion requirement for every
-- marhalah (including 1); tadreeb stays a requirement for marhalah <> 1 only.
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

  select count(distinct es.exercise_id)::int into v_submission_count
  from public.exercise_submissions es
  join public.exercises e on e.id = es.exercise_id
  where es.student_id = p_student_id
    and e.marhalah_id = v_marhalah_id
    and es.score is not null;

  if v_submission_count < v_exercise_count then
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

  if v_current > 1 then
    select exists (
      select 1 from public.manual_scores
      where student_id = p_student_id
        and marhalah_id = v_marhalah_id
        and type = 'tadreeb'
    ) into v_has_tadreeb;

    if not v_has_tadreeb then
      return false;
    end if;
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

  update public.profiles
  set current_marhalah = v_current + 1
  where id = p_student_id
    and current_marhalah = v_current;

  return found;
end;
$$;

-- manual_scores insert/update by a teacher/admin on Marhalah 1 now feeds
-- promotion, so make sure that write path re-checks promotion too (it
-- already does via the existing manual_scores_maybe_promote trigger from
-- 20260719160000 -- no trigger change needed here).
