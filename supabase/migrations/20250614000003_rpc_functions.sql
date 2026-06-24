-- Business logic RPC functions

create or replace function public.normalize_answer (value text)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(value, '')));
$$;

create or replace function public.question_requires_manual (q_type text)
returns boolean
language sql
immutable
as $$
  select q_type in ('fill_gap', 'written');
$$;

create or replace function public.get_assessment_status (
  p_start timestamptz,
  p_end timestamptz,
  p_has_submitted boolean default false
)
returns text
language plpgsql
stable
as $$
begin
  if p_has_submitted then
    return 'completed';
  end if;
  if now() < p_start then
    return 'upcoming';
  end if;
  if now() > p_end then
    return 'expired';
  end if;
  return 'open';
end;
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
end;
$$;

create or replace function public.is_marhalah_unlocked (
  p_student_id uuid,
  p_marhalah_id bigint
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  m record;
  prev record;
  prev_score numeric;
begin
  select * into m from public.marhalahs where id = p_marhalah_id;
  if not found then
    return false;
  end if;
  if m.number = 1 then
    return true;
  end if;

  select * into prev from public.marhalahs where number = m.number - 1;
  if not found then
    return false;
  end if;

  prev_score := public.calculate_final_score(p_student_id, prev.id);
  return prev_score >= m.unlock_threshold;
end;
$$;

create or replace function public.assign_registration_number (p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  reg_no text;
  year_part text := to_char(now(), 'YYYY');
  seq_num int;
begin
  select registration_number into reg_no
  from public.profiles
  where id = p_student_id;

  if reg_no is not null then
    return reg_no;
  end if;

  select count(*) + 1 into seq_num
  from public.profiles
  where registration_number is not null;

  reg_no := format('TJW-%s-%s', year_part, lpad(seq_num::text, 3, '0'));

  update public.profiles
  set registration_number = reg_no
  where id = p_student_id;

  return reg_no;
end;
$$;

create or replace function public.submit_exercise (
  p_exercise_id bigint,
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
  q record;
  status_val text;
  auto_score numeric := 0;
  max_score numeric := 0;
  answer_text text;
  submission_id bigint;
  grading_status text := 'complete';
  has_manual boolean := false;
begin
  if v_student_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into ex from public.exercises where id = p_exercise_id;
  if not found then
    raise exception 'Exercise not found';
  end if;

  status_val := public.get_assessment_status(ex.start_date, ex.end_date, false);
  if status_val <> 'open' then
    raise exception 'Exercise is %', status_val;
  end if;

  if exists (
    select 1 from public.exercise_submissions
    where student_id = v_student_id and exercise_id = p_exercise_id
  ) then
    raise exception 'Already submitted';
  end if;

  for q in
    select * from public.questions
    where exercise_id = p_exercise_id
    order by "order"
  loop
    max_score := max_score + q.max_score;
    answer_text := coalesce(p_answers ->> q.id::text, p_answers ->> q.id::text, '');

    if public.question_requires_manual(q.type) then
      has_manual := true;
    elsif q.type = 'mcq' and answer_text = q.correct_answer then
      auto_score := auto_score + q.max_score;
    elsif q.type in ('true_false', 'fill_blank')
      and public.normalize_answer(answer_text) = public.normalize_answer(q.correct_answer) then
      auto_score := auto_score + q.max_score;
    end if;
  end loop;

  if has_manual then
    grading_status := 'pending_manual';
  end if;

  insert into public.exercise_submissions (
    student_id,
    exercise_id,
    answers,
    score,
    max_score,
    grading_status
  )
  values (v_student_id, p_exercise_id, p_answers, auto_score, max_score, grading_status)
  returning id into submission_id;

  for q in
    select * from public.questions
    where exercise_id = p_exercise_id
      and public.question_requires_manual(type)
    order by "order"
  loop
    answer_text := coalesce(p_answers ->> q.id::text, '');
    insert into public.exercise_answer_grades (
      submission_id,
      question_id,
      answer_text,
      max_score
    )
    values (submission_id, q.id, answer_text, q.max_score);
  end loop;

  update public.profiles
  set has_attempted_exercise = true
  where id = v_student_id
    and has_attempted_exercise = false;

  if found then
    perform public.assign_registration_number(v_student_id);
  end if;

  return jsonb_build_object(
    'score', auto_score,
    'max_score', max_score,
    'grading_status', grading_status
  );
end;
$$;

create or replace function public.grade_exercise_answer (
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
  g record;
  sub record;
  auto_score numeric := 0;
  manual_score numeric := 0;
  q record;
  answer_text text;
  pending boolean := false;
  grading_status text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select g.*, s.id as submission_id, s.student_id, s.exercise_id, s.answers
  into g
  from public.exercise_answer_grades g
  join public.exercise_submissions s on s.id = g.submission_id
  where g.id = p_grade_id;

  if not found then
    raise exception 'Grade not found';
  end if;

  update public.exercise_answer_grades
  set score = p_score,
      feedback = coalesce(p_feedback, ''),
      graded_at = now()
  where id = p_grade_id;

  for q in
    select * from public.questions where exercise_id = g.exercise_id
  loop
    if public.question_requires_manual(q.type) then
      continue;
    end if;
    answer_text := coalesce(g.answers ->> q.id::text, '');
    if q.type = 'mcq' and answer_text = q.correct_answer then
      auto_score := auto_score + q.max_score;
    elsif q.type in ('true_false', 'fill_blank')
      and public.normalize_answer(answer_text) = public.normalize_answer(q.correct_answer) then
      auto_score := auto_score + q.max_score;
    end if;
  end loop;

  select coalesce(sum(score), 0),
         bool_or(score is null)
  into manual_score, pending
  from public.exercise_answer_grades
  where submission_id = g.submission_id;

  grading_status := case when pending then 'pending_manual' else 'complete' end;

  update public.exercise_submissions
  set score = auto_score + manual_score,
      grading_status = grading_status
  where id = g.submission_id;

  return jsonb_build_object('grading_status', grading_status);
end;
$$;

grant execute on function public.submit_exercise (bigint, jsonb) to authenticated;
grant execute on function public.grade_exercise_answer (bigint, numeric, text) to authenticated;
grant execute on function public.assign_registration_number (uuid) to authenticated;
grant execute on function public.calculate_final_score (uuid, bigint) to authenticated;
grant execute on function public.is_marhalah_unlocked (uuid, bigint) to authenticated;
grant execute on function public.get_assessment_status (timestamptz, timestamptz, boolean) to authenticated;
