-- Auto-promote students when they complete all work and pass the next unlock threshold.

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

  if v_current > 1 then
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

    if not v_has_halaqah or not v_has_tadreeb then
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

revoke all on function public.maybe_promote_student (uuid) from public, anon;
grant execute on function public.maybe_promote_student (uuid) to authenticated, service_role;

create or replace function public.trigger_maybe_promote_from_exercise ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.maybe_promote_student(new.student_id);
  return new;
end;
$$;

create or replace function public.trigger_maybe_promote_from_exam ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.submitted_at is not null then
    perform public.maybe_promote_student(new.student_id);
  end if;
  return new;
end;
$$;

create or replace function public.trigger_maybe_promote_from_manual ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.maybe_promote_student(new.student_id);
  return new;
end;
$$;

drop trigger if exists exercise_submissions_maybe_promote on public.exercise_submissions;
create trigger exercise_submissions_maybe_promote
after insert or update of score on public.exercise_submissions
for each row
execute function public.trigger_maybe_promote_from_exercise();

drop trigger if exists exam_submissions_maybe_promote on public.exam_submissions;
create trigger exam_submissions_maybe_promote
after insert or update of submitted_at, score on public.exam_submissions
for each row
execute function public.trigger_maybe_promote_from_exam();

drop trigger if exists manual_scores_maybe_promote on public.manual_scores;
create trigger manual_scores_maybe_promote
after insert or update of score on public.manual_scores
for each row
execute function public.trigger_maybe_promote_from_manual();
