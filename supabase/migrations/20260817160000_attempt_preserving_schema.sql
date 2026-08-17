-- Preserve failed-attempt data instead of deleting it, so students can
-- later review exactly what they answered on a failed attempt. Adds
-- attempt_number (which attempt this row belongs to) and is_current
-- (whether it's the live/active row for its key) to all four
-- attempt-scoped tables. Within a single marhalah's timeline,
-- attempt_number only advances when THAT marhalah fails, so is_current is
-- always correct for "this marhalah's latest attempt" - no need to
-- reference profiles.marhalah_attempt on reads, only on writes.
alter table public.exercise_submissions
  add column if not exists attempt_number smallint not null default 1,
  add column if not exists is_current boolean not null default true;

alter table public.exam_submissions
  add column if not exists attempt_number smallint not null default 1,
  add column if not exists is_current boolean not null default true;

alter table public.manual_scores
  add column if not exists attempt_number smallint not null default 1,
  add column if not exists is_current boolean not null default true;

alter table public.topic_completions
  add column if not exists attempt_number smallint not null default 1,
  add column if not exists is_current boolean not null default true;

-- Existing rows are, by definition, each key's only (current) row today.
update public.exercise_submissions es
set attempt_number = coalesce((select p.marhalah_attempt from public.profiles p where p.id = es.student_id), 1)
where attempt_number = 1;

update public.exam_submissions es
set attempt_number = coalesce((select p.marhalah_attempt from public.profiles p where p.id = es.student_id), 1)
where attempt_number = 1;

update public.manual_scores ms
set attempt_number = coalesce((select p.marhalah_attempt from public.profiles p where p.id = ms.student_id), 1)
where attempt_number = 1;

update public.topic_completions tc
set attempt_number = coalesce((select p.marhalah_attempt from public.profiles p where p.id = tc.student_id), 1)
where attempt_number = 1;

-- Replace the old (student, key) uniqueness with (student, key, attempt) so
-- multiple attempts can coexist, plus a partial unique index enforcing
-- "exactly one current row per key" at the DB level.
alter table public.exercise_submissions
  drop constraint if exists exercise_submissions_student_id_exercise_id_key,
  add constraint exercise_submissions_student_exercise_attempt_key
    unique (student_id, exercise_id, attempt_number);
create unique index if not exists exercise_submissions_current_key
  on public.exercise_submissions (student_id, exercise_id) where is_current;

alter table public.exam_submissions
  drop constraint if exists exam_submissions_student_id_exam_id_key,
  add constraint exam_submissions_student_exam_attempt_key
    unique (student_id, exam_id, attempt_number);
create unique index if not exists exam_submissions_current_key
  on public.exam_submissions (student_id, exam_id) where is_current;

alter table public.manual_scores
  drop constraint if exists manual_scores_student_id_marhalah_id_type_key,
  add constraint manual_scores_student_marhalah_type_attempt_key
    unique (student_id, marhalah_id, type, attempt_number);
create unique index if not exists manual_scores_current_key
  on public.manual_scores (student_id, marhalah_id, type) where is_current;

alter table public.topic_completions
  drop constraint if exists topic_completions_student_id_topic_id_key,
  add constraint topic_completions_student_topic_attempt_key
    unique (student_id, topic_id, attempt_number);
create unique index if not exists topic_completions_current_key
  on public.topic_completions (student_id, topic_id) where is_current;
