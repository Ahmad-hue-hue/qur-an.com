-- Indexes and RLS performance (supabase-postgres-best-practices)
-- - Index all foreign key columns
-- - Wrap auth.uid() / helper calls in (select ...) for RLS policy caching

-- ---------------------------------------------------------------------------
-- Foreign key indexes
-- ---------------------------------------------------------------------------
create index if not exists topics_marhalah_id_idx on public.topics (marhalah_id);
create index if not exists topic_completions_student_id_idx on public.topic_completions (student_id);
create index if not exists topic_completions_topic_id_idx on public.topic_completions (topic_id);
create index if not exists exercises_marhalah_id_idx on public.exercises (marhalah_id);
create index if not exists exams_marhalah_id_idx on public.exams (marhalah_id);
create index if not exists questions_exercise_id_idx on public.questions (exercise_id);
create index if not exists questions_exam_id_idx on public.questions (exam_id);
create index if not exists exercise_submissions_student_id_idx on public.exercise_submissions (student_id);
create index if not exists exercise_submissions_exercise_id_idx on public.exercise_submissions (exercise_id);
create index if not exists exercise_answer_grades_submission_id_idx on public.exercise_answer_grades (submission_id);
create index if not exists exercise_answer_grades_question_id_idx on public.exercise_answer_grades (question_id);
create index if not exists exam_submissions_student_id_idx on public.exam_submissions (student_id);
create index if not exists exam_submissions_exam_id_idx on public.exam_submissions (exam_id);
create index if not exists manual_scores_student_id_idx on public.manual_scores (student_id);
create index if not exists manual_scores_marhalah_id_idx on public.manual_scores (marhalah_id);

-- RLS / lookup indexes
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_current_marhalah_idx on public.profiles (current_marhalah);
create index if not exists topics_published_marhalah_order_idx
  on public.topics (marhalah_id, "order")
  where is_published = true;

-- ---------------------------------------------------------------------------
-- RLS helper: cache auth.uid() and admin check per statement
-- ---------------------------------------------------------------------------
create or replace function public.is_admin ()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin () from public;
grant execute on function public.is_admin () to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Recreate RLS policies with (select ...) wrappers for performance
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
drop policy if exists "profiles_insert_admin" on public.profiles;
drop policy if exists "profiles_delete_admin" on public.profiles;

create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = (select auth.uid()) or (select public.is_admin()));

create policy "profiles_update_own_or_admin"
on public.profiles for update
using (id = (select auth.uid()) or (select public.is_admin()));

create policy "profiles_insert_admin"
on public.profiles for insert
with check ((select public.is_admin()));

create policy "profiles_delete_admin"
on public.profiles for delete
using ((select public.is_admin()));

drop policy if exists "marhalahs_admin_all" on public.marhalahs;
create policy "marhalahs_admin_all"
on public.marhalahs for all
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "topics_select_published_or_admin" on public.topics;
drop policy if exists "topics_admin_all" on public.topics;

create policy "topics_select_published_or_admin"
on public.topics for select
using (is_published = true or (select public.is_admin()));

create policy "topics_admin_all"
on public.topics for all
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "topic_completions_select_own_or_admin" on public.topic_completions;
drop policy if exists "topic_completions_insert_own" on public.topic_completions;

create policy "topic_completions_select_own_or_admin"
on public.topic_completions for select
using (student_id = (select auth.uid()) or (select public.is_admin()));

create policy "topic_completions_insert_own"
on public.topic_completions for insert
with check (student_id = (select auth.uid()));

drop policy if exists "score_weights_admin" on public.score_weights;
create policy "score_weights_admin"
on public.score_weights for all
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "exercises_admin_all" on public.exercises;
create policy "exercises_admin_all"
on public.exercises for all
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "exams_admin_all" on public.exams;
create policy "exams_admin_all"
on public.exams for all
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "questions_admin_all" on public.questions;
create policy "questions_admin_all"
on public.questions for all
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "exercise_submissions_select_own_or_admin" on public.exercise_submissions;
drop policy if exists "exercise_submissions_insert_own" on public.exercise_submissions;
drop policy if exists "exercise_submissions_update_admin" on public.exercise_submissions;

create policy "exercise_submissions_select_own_or_admin"
on public.exercise_submissions for select
using (student_id = (select auth.uid()) or (select public.is_admin()));

create policy "exercise_submissions_insert_own"
on public.exercise_submissions for insert
with check (student_id = (select auth.uid()));

create policy "exercise_submissions_update_admin"
on public.exercise_submissions for update
using ((select public.is_admin()));

drop policy if exists "exercise_answer_grades_select" on public.exercise_answer_grades;
drop policy if exists "exercise_answer_grades_admin_write" on public.exercise_answer_grades;

create policy "exercise_answer_grades_select"
on public.exercise_answer_grades for select
using (
  exists (
    select 1
    from public.exercise_submissions s
    where s.id = submission_id
      and (s.student_id = (select auth.uid()) or (select public.is_admin()))
  )
);

create policy "exercise_answer_grades_admin_write"
on public.exercise_answer_grades for all
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "exam_submissions_select_own_or_admin" on public.exam_submissions;
drop policy if exists "exam_submissions_insert_own" on public.exam_submissions;
drop policy if exists "exam_submissions_update_own" on public.exam_submissions;

create policy "exam_submissions_select_own_or_admin"
on public.exam_submissions for select
using (student_id = (select auth.uid()) or (select public.is_admin()));

create policy "exam_submissions_insert_own"
on public.exam_submissions for insert
with check (student_id = (select auth.uid()));

create policy "exam_submissions_update_own"
on public.exam_submissions for update
using (student_id = (select auth.uid()));

drop policy if exists "manual_scores_select_own_or_admin" on public.manual_scores;
drop policy if exists "manual_scores_admin_all" on public.manual_scores;

create policy "manual_scores_select_own_or_admin"
on public.manual_scores for select
using (student_id = (select auth.uid()) or (select public.is_admin()));

create policy "manual_scores_admin_all"
on public.manual_scores for all
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Storage policies
drop policy if exists "lesson_audio_admin_write" on storage.objects;
drop policy if exists "lesson_audio_admin_update" on storage.objects;
drop policy if exists "lesson_audio_admin_delete" on storage.objects;
drop policy if exists "lesson_pdfs_admin_write" on storage.objects;
drop policy if exists "lesson_pdfs_admin_update" on storage.objects;
drop policy if exists "lesson_pdfs_admin_delete" on storage.objects;

create policy "lesson_audio_admin_write"
on storage.objects for insert
with check (bucket_id = 'lesson-audio' and (select public.is_admin()));

create policy "lesson_audio_admin_update"
on storage.objects for update
using (bucket_id = 'lesson-audio' and (select public.is_admin()));

create policy "lesson_audio_admin_delete"
on storage.objects for delete
using (bucket_id = 'lesson-audio' and (select public.is_admin()));

create policy "lesson_pdfs_admin_write"
on storage.objects for insert
with check (bucket_id = 'lesson-pdfs' and (select public.is_admin()));

create policy "lesson_pdfs_admin_update"
on storage.objects for update
using (bucket_id = 'lesson-pdfs' and (select public.is_admin()));

create policy "lesson_pdfs_admin_delete"
on storage.objects for delete
using (bucket_id = 'lesson-pdfs' and (select public.is_admin()));
