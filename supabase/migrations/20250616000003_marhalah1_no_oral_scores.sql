-- Marḥalah 1: final score uses exercises + exam only (no ḥalaqah / tadreeb).

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
    total_weight := w.exercises + w.exam;
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

  if marhalah_num <> 1 then
    select * into manual
    from public.manual_scores
    where student_id = p_student_id
      and marhalah_id = p_marhalah_id
      and type = 'halaqah';

    if found and manual.max_score > 0 then
      halaqah_pct := (manual.score / manual.max_score) * 100;
    end if;

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
    )::numeric / total_weight,
    1
  );
end;
$$;
