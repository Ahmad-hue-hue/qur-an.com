-- Feature: a student who submits a marhalah's exam without meeting the full
-- pass criteria (all activities graded + score >= next stage's
-- unlock_threshold) is concluded as failed for that attempt. Their result is
-- recorded permanently in marhalah_attempt_history (so it stays visible even
-- after their working data is wiped), then their exercise/exam/manual-score/
-- topic-completion rows for that marhalah are cleared so they restart the
-- stage fresh on a new attempt. Students who are still missing an activity
-- are left untouched (unchanged behaviour: they just stay blocked).

-- ---------------------------------------------------------------------------
-- Attempt tracking
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column marhalah_attempt smallint not null default 1;

create table public.marhalah_attempt_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  marhalah_id bigint not null references public.marhalahs (id) on delete cascade,
  attempt_number smallint not null,
  exercise_pct numeric,
  exam_pct numeric,
  halaqah_pct numeric,
  tadreeb_pct numeric,
  final_score numeric,
  passed boolean not null default false,
  concluded_at timestamptz not null default now()
);

create index marhalah_attempt_history_student_idx
  on public.marhalah_attempt_history (student_id, marhalah_id);

alter table public.marhalah_attempt_history enable row level security;

create policy "marhalah_attempt_history_select_own_staff_or_teacher"
on public.marhalah_attempt_history for select to authenticated
using (
  student_id = (select auth.uid())
  or (select public.is_admin())
  or (
    (select public.is_teacher())
    and public.teacher_can_access_student(student_id)
    and public.teacher_owns_marhalah_id(marhalah_id)
  )
);

-- Only written by security-definer functions (maybe_promote_student), never
-- directly by clients.
revoke insert, update, delete on public.marhalah_attempt_history from authenticated, anon;

-- ---------------------------------------------------------------------------
-- calculate_final_score: return the per-component breakdown too, so the
-- failure path can snapshot it without recomputing each piece separately.
-- ---------------------------------------------------------------------------
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
    and e.marhalah_id = p_marhalah_id;

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
  order by es.submitted_at desc
  limit 1;

  if exam_max > 0 then
    v_exam_pct := (exam_score / exam_max) * 100;
  end if;

  select * into manual
  from public.manual_scores
  where student_id = p_student_id
    and marhalah_id = p_marhalah_id
    and type = 'halaqah';

  if found and manual.max_score > 0 then
    v_halaqah_pct := (manual.score / manual.max_score) * 100;
  end if;

  select * into manual
  from public.manual_scores
  where student_id = p_student_id
    and marhalah_id = p_marhalah_id
    and type = 'tadreeb';

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

revoke all on function public.calculate_final_score_breakdown (uuid, bigint) from public, anon;
grant execute on function public.calculate_final_score_breakdown (uuid, bigint) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- can_promote_student: pure eligibility check (completeness + passmark),
-- shared by maybe_promote_student and the update-student edge function so
-- manual staff promotion can't bypass the automatic rules.
-- ---------------------------------------------------------------------------
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

revoke all on function public.can_promote_student (uuid) from public, anon;
grant execute on function public.can_promote_student (uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- maybe_promote_student: same completeness gate as before, but now branches
-- three ways: promote / conclude-as-failed-and-reset / still-incomplete.
-- ---------------------------------------------------------------------------
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
  v_attempt smallint;
  v_breakdown record;
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

  select exists (
    select 1 from public.manual_scores
    where student_id = p_student_id
      and marhalah_id = v_marhalah_id
      and type = 'tadreeb'
  ) into v_has_tadreeb;

  if not v_has_tadreeb then
    return false;
  end if;

  -- Every required activity is in. Decide pass/fail.
  select * into v_next
  from public.marhalahs
  where number = v_current + 1;

  if v_next is null then
    return false;
  end if;

  select * into v_breakdown
  from public.calculate_final_score_breakdown(p_student_id, v_marhalah_id);

  if v_breakdown.final_score is not null
     and v_breakdown.final_score >= v_next.unlock_threshold then
    -- Pass: promote.
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
