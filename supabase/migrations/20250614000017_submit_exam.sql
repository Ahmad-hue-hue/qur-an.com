-- Student exam session start and submission with auto-grading.

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
      )
  );
$$;

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
  max_score numeric := 0;
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

  select coalesce(sum(max_score), 0) into max_score
  from public.questions
  where exam_id = p_exam_id;

  if max_score <= 0 then
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
    submission.submitted_at is not null
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
    values (v_student_id, p_exam_id, '{}'::jsonb, 0, max_score, now())
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

create or replace function public.submit_exam (
  p_exam_id bigint,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  ex record;
  profile record;
  q record;
  status_val text;
  submission record;
  auto_score numeric := 0;
  max_score numeric := 0;
  answer_text text;
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

  select * into submission
  from public.exam_submissions
  where student_id = v_student_id
    and exam_id = p_exam_id;

  if not found then
    raise exception 'Start the exam before submitting';
  end if;

  if submission.submitted_at is not null then
    raise exception 'Already submitted';
  end if;

  status_val := public.get_assessment_status(ex.start_date, ex.end_date, false);
  if status_val <> 'open' then
    raise exception 'Exam is %', status_val;
  end if;

  deadline := submission.started_at + make_interval(mins => ex.duration_minutes);
  if now() > deadline then
    raise exception 'Exam time has expired';
  end if;

  for q in
    select * from public.questions
    where exam_id = p_exam_id
    order by "order"
  loop
    max_score := max_score + q.max_score;
    answer_text := coalesce(p_answers ->> q.id::text, '');

    if public.question_requires_manual(q.type) then
      continue;
    elsif q.type = 'mcq'
      and public.normalize_mcq_answer(answer_text) = public.normalize_mcq_answer(q.correct_answer) then
      auto_score := auto_score + q.max_score;
    elsif q.type in ('true_false', 'fill_blank')
      and public.normalize_answer(answer_text) = public.normalize_answer(q.correct_answer) then
      auto_score := auto_score + q.max_score;
    end if;
  end loop;

  update public.exam_submissions
  set answers = p_answers,
      score = auto_score,
      max_score = max_score,
      submitted_at = now()
  where id = submission.id;

  return jsonb_build_object(
    'score', auto_score,
    'max_score', max_score
  );
end;
$$;

revoke all on function public.marhalah_topics_completed (uuid, bigint) from public, anon;
revoke all on function public.start_exam (bigint) from public, anon;
revoke all on function public.submit_exam (bigint, jsonb) from public, anon;

grant execute on function public.marhalah_topics_completed (uuid, bigint) to authenticated, service_role;
grant execute on function public.start_exam (bigint) to authenticated, service_role;
grant execute on function public.submit_exam (bigint, jsonb) to authenticated, service_role;
