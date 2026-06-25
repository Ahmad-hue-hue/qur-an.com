-- Per-answer exam grading (mirrors exercise_answer_grades) and admin manual review.

alter table public.exam_submissions
add column if not exists grading_status text not null default 'complete' check (
  grading_status in ('complete', 'pending_manual')
);

create table if not exists public.exam_answer_grades (
  id bigserial primary key,
  submission_id bigint not null references public.exam_submissions (id) on delete cascade,
  question_id bigint not null references public.questions (id) on delete cascade,
  answer_text text not null default '',
  score numeric(6, 2),
  max_score numeric(6, 2) not null default 1,
  feedback text not null default '',
  graded_at timestamptz,
  unique (submission_id, question_id)
);

alter table public.exam_answer_grades enable row level security;

create index if not exists exam_answer_grades_submission_id_idx
on public.exam_answer_grades (submission_id);

create index if not exists exam_answer_grades_question_id_idx
on public.exam_answer_grades (question_id);

create policy "exam_answer_grades_select"
on public.exam_answer_grades for select
using (
  exists (
    select 1
    from public.exam_submissions s
    where s.id = submission_id
      and (s.student_id = (select auth.uid()) or (select public.is_admin()))
  )
);

create policy "exam_answer_grades_admin_write"
on public.exam_answer_grades for all
using ((select public.is_admin()))
with check ((select public.is_admin()));

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
  grading_status text := 'complete';
  has_manual boolean := false;
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
      has_manual := true;
    elsif q.type = 'mcq'
      and public.normalize_mcq_answer(answer_text) = public.normalize_mcq_answer(q.correct_answer) then
      auto_score := auto_score + q.max_score;
    elsif q.type in ('true_false', 'fill_blank')
      and public.normalize_answer(answer_text) = public.normalize_answer(q.correct_answer) then
      auto_score := auto_score + q.max_score;
    end if;
  end loop;

  if has_manual then
    grading_status := 'pending_manual';
  end if;

  update public.exam_submissions
  set answers = p_answers,
      score = auto_score,
      max_score = max_score,
      grading_status = grading_status,
      submitted_at = now()
  where id = submission.id;

  for q in
    select * from public.questions
    where exam_id = p_exam_id
    order by "order"
  loop
    answer_text := coalesce(p_answers ->> q.id::text, '');

    if public.question_requires_manual(q.type) then
      insert into public.exam_answer_grades (
        submission_id,
        question_id,
        answer_text,
        max_score,
        score
      )
      values (submission.id, q.id, answer_text, q.max_score, null);
    elsif q.type = 'mcq'
      and public.normalize_mcq_answer(answer_text) = public.normalize_mcq_answer(q.correct_answer) then
      insert into public.exam_answer_grades (
        submission_id,
        question_id,
        answer_text,
        max_score,
        score,
        graded_at
      )
      values (submission.id, q.id, answer_text, q.max_score, q.max_score, now());
    elsif q.type in ('true_false', 'fill_blank')
      and public.normalize_answer(answer_text) = public.normalize_answer(q.correct_answer) then
      insert into public.exam_answer_grades (
        submission_id,
        question_id,
        answer_text,
        max_score,
        score,
        graded_at
      )
      values (submission.id, q.id, answer_text, q.max_score, q.max_score, now());
    else
      insert into public.exam_answer_grades (
        submission_id,
        question_id,
        answer_text,
        max_score,
        score,
        graded_at
      )
      values (submission.id, q.id, answer_text, q.max_score, 0, now());
    end if;
  end loop;

  return jsonb_build_object(
    'score', auto_score,
    'max_score', max_score,
    'grading_status', grading_status
  );
end;
$$;

create or replace function public.grade_exam_answer (
  p_grade_id bigint,
  p_score numeric,
  p_feedback text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission_id bigint;
  v_exam_id bigint;
  v_answers jsonb;
  q record;
  auto_score numeric := 0;
  manual_score numeric := 0;
  answer_text text;
  pending boolean := false;
  grading_status text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select g.submission_id, s.exam_id, s.answers
  into v_submission_id, v_exam_id, v_answers
  from public.exam_answer_grades g
  join public.exam_submissions s on s.id = g.submission_id
  where g.id = p_grade_id;

  if v_submission_id is null then
    raise exception 'Grade not found';
  end if;

  update public.exam_answer_grades
  set score = p_score,
      feedback = coalesce(p_feedback, ''),
      graded_at = now()
  where id = p_grade_id;

  for q in
    select * from public.questions where exam_id = v_exam_id
  loop
    if public.question_requires_manual(q.type) then
      continue;
    end if;
    answer_text := coalesce(v_answers ->> q.id::text, '');
    if q.type = 'mcq'
      and public.normalize_mcq_answer(answer_text) = public.normalize_mcq_answer(q.correct_answer) then
      auto_score := auto_score + q.max_score;
    elsif q.type in ('true_false', 'fill_blank')
      and public.normalize_answer(answer_text) = public.normalize_answer(q.correct_answer) then
      auto_score := auto_score + q.max_score;
    end if;
  end loop;

  select coalesce(sum(score), 0),
         bool_or(score is null)
  into manual_score, pending
  from public.exam_answer_grades
  where submission_id = v_submission_id;

  grading_status := case when pending then 'pending_manual' else 'complete' end;

  update public.exam_submissions
  set score = auto_score + manual_score,
      grading_status = grading_status
  where id = v_submission_id;

  return jsonb_build_object('grading_status', grading_status);
end;
$$;

revoke all on function public.grade_exam_answer (bigint, numeric, text) from public, anon;
grant execute on function public.grade_exam_answer (bigint, numeric, text) to authenticated, service_role;

-- Backfill per-answer grades for exams submitted before this migration.
insert into public.exam_answer_grades (
  submission_id,
  question_id,
  answer_text,
  max_score,
  score,
  graded_at
)
select
  s.id,
  q.id,
  coalesce(s.answers ->> q.id::text, ''),
  q.max_score,
  case
    when public.question_requires_manual(q.type) then null
    when q.type = 'mcq'
      and public.normalize_mcq_answer(coalesce(s.answers ->> q.id::text, ''))
        = public.normalize_mcq_answer(q.correct_answer) then q.max_score
    when q.type in ('true_false', 'fill_blank')
      and public.normalize_answer(coalesce(s.answers ->> q.id::text, ''))
        = public.normalize_answer(q.correct_answer) then q.max_score
  else 0
  end,
  case when public.question_requires_manual(q.type) then null else now() end
from public.exam_submissions s
join public.questions q on q.exam_id = s.exam_id
where s.submitted_at is not null
  and not exists (
    select 1
    from public.exam_answer_grades g
    where g.submission_id = s.id
      and g.question_id = q.id
  );

update public.exam_submissions s
set grading_status = 'pending_manual'
where s.submitted_at is not null
  and exists (
    select 1
    from public.exam_answer_grades g
    where g.submission_id = s.id
      and g.score is null
  );
