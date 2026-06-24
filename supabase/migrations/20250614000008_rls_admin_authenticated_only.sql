-- Admin RLS policies must target authenticated role only so anon
-- requests do not evaluate is_admin() (which anon cannot execute).

-- Marhalahs
drop policy if exists "marhalahs_admin_all" on public.marhalahs;
create policy "marhalahs_admin_all"
on public.marhalahs for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Topics
drop policy if exists "topics_admin_all" on public.topics;
create policy "topics_admin_all"
on public.topics for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Profiles (admin insert/delete)
drop policy if exists "profiles_insert_admin" on public.profiles;
drop policy if exists "profiles_delete_admin" on public.profiles;

create policy "profiles_insert_admin"
on public.profiles for insert
to authenticated
with check ((select public.is_admin()));

create policy "profiles_delete_admin"
on public.profiles for delete
to authenticated
using ((select public.is_admin()));

-- Score weights
drop policy if exists "score_weights_admin" on public.score_weights;
create policy "score_weights_admin"
on public.score_weights for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Exercises & exams
drop policy if exists "exercises_admin_all" on public.exercises;
create policy "exercises_admin_all"
on public.exercises for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "exams_admin_all" on public.exams;
create policy "exams_admin_all"
on public.exams for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Questions
drop policy if exists "questions_admin_all" on public.questions;
create policy "questions_admin_all"
on public.questions for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Submissions & grades
drop policy if exists "exercise_submissions_update_admin" on public.exercise_submissions;
create policy "exercise_submissions_update_admin"
on public.exercise_submissions for update
to authenticated
using ((select public.is_admin()));

drop policy if exists "exercise_answer_grades_admin_write" on public.exercise_answer_grades;
create policy "exercise_answer_grades_admin_write"
on public.exercise_answer_grades for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "manual_scores_admin_all" on public.manual_scores;
create policy "manual_scores_admin_all"
on public.manual_scores for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Storage admin policies
drop policy if exists "lesson_audio_admin_write" on storage.objects;
drop policy if exists "lesson_audio_admin_update" on storage.objects;
drop policy if exists "lesson_audio_admin_delete" on storage.objects;
drop policy if exists "lesson_pdfs_admin_write" on storage.objects;
drop policy if exists "lesson_pdfs_admin_update" on storage.objects;
drop policy if exists "lesson_pdfs_admin_delete" on storage.objects;

create policy "lesson_audio_admin_write"
on storage.objects for insert
to authenticated
with check (bucket_id = 'lesson-audio' and (select public.is_admin()));

create policy "lesson_audio_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'lesson-audio' and (select public.is_admin()));

create policy "lesson_audio_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'lesson-audio' and (select public.is_admin()));

create policy "lesson_pdfs_admin_write"
on storage.objects for insert
to authenticated
with check (bucket_id = 'lesson-pdfs' and (select public.is_admin()));

create policy "lesson_pdfs_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'lesson-pdfs' and (select public.is_admin()));

create policy "lesson_pdfs_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'lesson-pdfs' and (select public.is_admin()));
