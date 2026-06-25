-- supabase-postgres-best-practices follow-up
-- https://supabase.com/docs/guides/database/postgres/row-level-security

-- ---------------------------------------------------------------------------
-- 1. Immutable helpers: pin search_path (lint 0011)
-- ---------------------------------------------------------------------------
create or replace function public.normalize_mcq_answer (value text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(coalesce(value, ''));
$$;

-- ---------------------------------------------------------------------------
-- 2. Trigger-only function: not callable via PostgREST RPC (lint 0028)
-- ---------------------------------------------------------------------------
revoke all on function public.sync_profile_role_to_auth () from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. is_admin: RLS policies invoke it; block direct anon RPC (lint 0028)
-- ---------------------------------------------------------------------------
revoke all on function public.is_admin () from anon;

-- ---------------------------------------------------------------------------
-- 4. Public buckets: drop broad SELECT policies (lint 0025)
--    Direct object URLs still work; listing is not required.
-- ---------------------------------------------------------------------------
drop policy if exists "lesson_audio_public_read" on storage.objects;
drop policy if exists "lesson_pdfs_public_read" on storage.objects;

-- ---------------------------------------------------------------------------
-- 5. Registration number lookups
-- ---------------------------------------------------------------------------
create index if not exists profiles_registration_number_idx
  on public.profiles (registration_number)
  where registration_number is not null;

-- ---------------------------------------------------------------------------
-- 6. Split admin FOR ALL policies to avoid duplicate permissive SELECT
--    policies (lint 0006)
-- ---------------------------------------------------------------------------

-- Marhalahs
drop policy if exists "marhalahs_admin_all" on public.marhalahs;
create policy "marhalahs_admin_insert"
on public.marhalahs for insert to authenticated
with check ((select public.is_admin()));
create policy "marhalahs_admin_update"
on public.marhalahs for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "marhalahs_admin_delete"
on public.marhalahs for delete to authenticated
using ((select public.is_admin()));

-- Exercises
drop policy if exists "exercises_admin_all" on public.exercises;
create policy "exercises_admin_insert"
on public.exercises for insert to authenticated
with check ((select public.is_admin()));
create policy "exercises_admin_update"
on public.exercises for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "exercises_admin_delete"
on public.exercises for delete to authenticated
using ((select public.is_admin()));

-- Exams
drop policy if exists "exams_admin_all" on public.exams;
create policy "exams_admin_insert"
on public.exams for insert to authenticated
with check ((select public.is_admin()));
create policy "exams_admin_update"
on public.exams for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "exams_admin_delete"
on public.exams for delete to authenticated
using ((select public.is_admin()));

-- Questions
drop policy if exists "questions_admin_all" on public.questions;
create policy "questions_admin_insert"
on public.questions for insert to authenticated
with check ((select public.is_admin()));
create policy "questions_admin_update"
on public.questions for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "questions_admin_delete"
on public.questions for delete to authenticated
using ((select public.is_admin()));

-- Score weights
drop policy if exists "score_weights_admin" on public.score_weights;
create policy "score_weights_admin_insert"
on public.score_weights for insert to authenticated
with check ((select public.is_admin()));
create policy "score_weights_admin_update"
on public.score_weights for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "score_weights_admin_delete"
on public.score_weights for delete to authenticated
using ((select public.is_admin()));

-- Manual scores
drop policy if exists "manual_scores_admin_all" on public.manual_scores;
create policy "manual_scores_admin_insert"
on public.manual_scores for insert to authenticated
with check ((select public.is_admin()));
create policy "manual_scores_admin_update"
on public.manual_scores for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "manual_scores_admin_delete"
on public.manual_scores for delete to authenticated
using ((select public.is_admin()));

-- Exercise answer grades
drop policy if exists "exercise_answer_grades_admin_write" on public.exercise_answer_grades;
create policy "exercise_answer_grades_admin_insert"
on public.exercise_answer_grades for insert to authenticated
with check ((select public.is_admin()));
create policy "exercise_answer_grades_admin_update"
on public.exercise_answer_grades for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "exercise_answer_grades_admin_delete"
on public.exercise_answer_grades for delete to authenticated
using ((select public.is_admin()));

-- Exam answer grades
drop policy if exists "exam_answer_grades_admin_write" on public.exam_answer_grades;
create policy "exam_answer_grades_admin_insert"
on public.exam_answer_grades for insert to authenticated
with check ((select public.is_admin()));
create policy "exam_answer_grades_admin_update"
on public.exam_answer_grades for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "exam_answer_grades_admin_delete"
on public.exam_answer_grades for delete to authenticated
using ((select public.is_admin()));

-- Topics (admin write split; select stays on topics_select_published_or_admin)
drop policy if exists "topics_admin_all" on public.topics;
drop policy if exists "topics_insert_admin" on public.topics;
drop policy if exists "topics_update_admin" on public.topics;
drop policy if exists "topics_delete_admin" on public.topics;
create policy "topics_admin_insert"
on public.topics for insert to authenticated
with check ((select public.is_admin()));
create policy "topics_admin_update"
on public.topics for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "topics_admin_delete"
on public.topics for delete to authenticated
using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- 7. Registration assign: prefix filter uses registration_number index
-- ---------------------------------------------------------------------------
create or replace function public.assign_registration_number (p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  reg_no text;
  marhalah_num int;
  enrolled_at timestamptz;
  cohort_digit text;
  prefix text;
  seq_num int;
begin
  select registration_number, coalesce(current_marhalah, 1), created_at
  into reg_no, marhalah_num, enrolled_at
  from public.profiles
  where id = p_student_id;

  if reg_no is not null then
    return reg_no;
  end if;

  cohort_digit := right(
    to_char(extract(year from coalesce(enrolled_at, now()))::int, 'FM9999'),
    1
  );
  prefix := marhalah_num::text || '.' || cohort_digit || '.';

  select coalesce(
    max((regexp_match(registration_number, '\.(\d+)[A-Z]$'))[1]::int),
    0
  ) + 1
  into seq_num
  from public.profiles
  where registration_number like prefix || '%';

  reg_no := prefix || seq_num::text || 'A';

  update public.profiles
  set registration_number = reg_no
  where id = p_student_id;

  return reg_no;
end;
$$;
