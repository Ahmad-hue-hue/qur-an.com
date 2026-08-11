-- Security fix: exercise_submissions_insert_own, exam_submissions_insert_own
-- (20250614000006), and exam_submissions_update (20250616000002) let a
-- student directly INSERT/UPDATE their own submission rows via PostgREST
-- with no constraint on score/max_score/grading_status/submitted_at -- only
-- `student_id = auth.uid()` is checked. A student could insert a row with
-- score = max_score, grading_status = 'complete', submitted_at = now(),
-- bypassing submit_exercise/start_exam/submit_exam entirely (window checks,
-- correctness grading, duplicate protection), and even trigger
-- maybe_promote_student's auto-promotion off a self-fabricated score.
--
-- Verified frontend/lib/supabase/student.ts never inserts/updates these
-- tables directly -- every write goes through the SECURITY DEFINER RPCs
-- (submit_exercise, start_exam, submit_exam), which bypass RLS and don't
-- need a client-facing grant. Dropping these policies removes the only
-- direct-write path without touching the RPCs.

drop policy if exists "exercise_submissions_insert_own" on public.exercise_submissions;
drop policy if exists "exam_submissions_insert_own" on public.exam_submissions;
drop policy if exists "exam_submissions_update" on public.exam_submissions;
