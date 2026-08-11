-- Feature: exams (including the final exam of a marhalah) stay locked
-- regardless of start_date/end_date until an admin explicitly opens them.
-- start_date/end_date still define the exam's scheduled window; is_locked
-- is an independent gate the admin controls on the day they actually want
-- to let students in.
--
-- Backfill: exams whose start_date has already passed are left unlocked so
-- exams that are already live or already finished aren't retroactively
-- locked out by this migration. Anything still in the future starts locked.
alter table public.exams
  add column if not exists is_locked boolean not null default true;

update public.exams set is_locked = false where start_date <= now();

create or replace function public.admin_set_exam_lock (
  p_exam_id bigint,
  p_locked boolean
)
returns public.exams
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.exams;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  update public.exams
  set is_locked = coalesce(p_locked, true)
  where id = p_exam_id
  returning * into result;

  if not found then
    raise exception 'Exam not found';
  end if;

  return result;
end;
$$;

revoke all on function public.admin_set_exam_lock (bigint, boolean) from public, anon;
grant execute on function public.admin_set_exam_lock (bigint, boolean) to authenticated, service_role;

-- start_exam: block entry while locked, on top of the existing date-window check.
create or replace function public.start_exam (p_exam_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  ex record;
  profile record;
  status_val text;
  submission record;
  v_max_score numeric := 0;
  deadline timestamptz;
begin
  if v_student_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into profile from public.profiles where id = v_student_id;
  if not found then
    raise exception 'Profile not found';
  end if;

  select * into ex from public.exams where id = p_exam_id;
  if not found then
    raise exception 'Exam not found';
  end if;

  if ex.marhalah_id <> (
    select id from public.marhalahs where number = profile.current_marhalah
  ) then
    raise exception 'This exam belongs to a different Marḥalah than your current stage.';
  end if;

  if not public.marhalah_topics_completed(v_student_id, ex.marhalah_id) then
    raise exception 'Complete all topics in this Marḥalah before taking the exam.';
  end if;

  if ex.is_locked then
    raise exception 'This exam is locked. Ask your admin to open it.';
  end if;

  select coalesce(sum(q.max_score), 0)
  into v_max_score
  from public.questions q
  where q.exam_id = p_exam_id;

  if v_max_score <= 0 then
    raise exception 'This exam has no questions yet.';
  end if;

  select * into submission
  from public.exam_submissions
  where student_id = v_student_id
    and exam_id = p_exam_id;

  if found and submission.submitted_at is not null then
    raise exception 'Already submitted';
  end if;

  status_val := public.get_assessment_status(
    ex.start_date,
    ex.end_date,
    coalesce(submission.submitted_at is not null, false)
  );
  if status_val <> 'open' then
    raise exception 'Exam is %', status_val;
  end if;

  if not found then
    insert into public.exam_submissions (
      student_id,
      exam_id,
      answers,
      score,
      max_score,
      started_at
    )
    values (v_student_id, p_exam_id, '{}'::jsonb, 0, v_max_score, now())
    returning * into submission;
  end if;

  deadline := submission.started_at + make_interval(mins => ex.duration_minutes);

  if now() > deadline then
    raise exception 'Exam time has expired';
  end if;

  return jsonb_build_object(
    'started_at', submission.started_at,
    'deadline_at', deadline,
    'remaining_seconds', greatest(0, floor(extract(epoch from (deadline - now()))))::int
  );
end;
$$;
