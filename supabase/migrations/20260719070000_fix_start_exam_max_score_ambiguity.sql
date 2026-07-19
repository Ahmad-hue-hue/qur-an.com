-- Avoid a PL/pgSQL variable/column collision when starting an exam.

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
