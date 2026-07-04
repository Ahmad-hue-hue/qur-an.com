-- supabase-postgres-best-practices follow-up (teacher RLS + indexes)
-- - Wrap auth.uid() in (select ...) inside security definer helpers
-- - Merge duplicate permissive admin/teacher policies (lint 0006)
-- - Partial indexes for teacher gender/marhalah filters

-- ---------------------------------------------------------------------------
-- 1. RLS helper functions: cache auth.uid() per statement
-- ---------------------------------------------------------------------------
create or replace function public.is_teacher ()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'teacher'
  );
$$;

create or replace function public.teacher_can_access_student (p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles t
    join public.profiles s on s.id = p_student_id
    where t.id = (select auth.uid())
      and t.role = 'teacher'
      and s.role = 'student'
      and t.gender is not null
      and s.gender = t.gender
      and t.managed_marhalah is not null
      and s.current_marhalah = t.managed_marhalah
  );
$$;

create or replace function public.teacher_owns_marhalah_id (p_marhalah_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles t
    join public.marhalahs m on m.number = t.managed_marhalah
    where t.id = (select auth.uid())
      and t.role = 'teacher'
      and m.id = p_marhalah_id
  );
$$;

create or replace function public.set_managed_marhalah (p_marhalah smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then
    raise exception 'Teacher only';
  end if;
  if p_marhalah < 1 or p_marhalah > 4 then
    raise exception 'Invalid marhalah';
  end if;
  update public.profiles
  set managed_marhalah = p_marhalah
  where id = (select auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Teacher filter indexes (query-missing-indexes / partial indexes)
-- ---------------------------------------------------------------------------
create index if not exists profiles_students_gender_marhalah_idx
  on public.profiles (gender, current_marhalah)
  where role = 'student' and gender is not null;

create index if not exists profiles_teachers_gender_marhalah_idx
  on public.profiles (gender, managed_marhalah)
  where role = 'teacher' and gender is not null;

-- ---------------------------------------------------------------------------
-- 3. Merge duplicate permissive policies: admin OR teacher (lint 0006)
-- ---------------------------------------------------------------------------

-- Profiles UPDATE (teacher policy was redundant with own-row update)
drop policy if exists "profiles_update_teacher_managed_marhalah" on public.profiles;

-- Exercises
drop policy if exists "exercises_admin_insert" on public.exercises;
drop policy if exists "exercises_admin_update" on public.exercises;
drop policy if exists "exercises_admin_delete" on public.exercises;
drop policy if exists "exercises_teacher_insert" on public.exercises;
drop policy if exists "exercises_teacher_update" on public.exercises;
drop policy if exists "exercises_teacher_delete" on public.exercises;

create policy "exercises_staff_insert"
on public.exercises for insert to authenticated
with check (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and public.teacher_owns_marhalah_id(marhalah_id)
  )
);

create policy "exercises_staff_update"
on public.exercises for update to authenticated
using (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and public.teacher_owns_marhalah_id(marhalah_id)
  )
)
with check (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and public.teacher_owns_marhalah_id(marhalah_id)
  )
);

create policy "exercises_staff_delete"
on public.exercises for delete to authenticated
using (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and public.teacher_owns_marhalah_id(marhalah_id)
  )
);

-- Exams
drop policy if exists "exams_admin_insert" on public.exams;
drop policy if exists "exams_admin_update" on public.exams;
drop policy if exists "exams_admin_delete" on public.exams;
drop policy if exists "exams_teacher_insert" on public.exams;
drop policy if exists "exams_teacher_update" on public.exams;
drop policy if exists "exams_teacher_delete" on public.exams;

create policy "exams_staff_insert"
on public.exams for insert to authenticated
with check (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and public.teacher_owns_marhalah_id(marhalah_id)
  )
);

create policy "exams_staff_update"
on public.exams for update to authenticated
using (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and public.teacher_owns_marhalah_id(marhalah_id)
  )
)
with check (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and public.teacher_owns_marhalah_id(marhalah_id)
  )
);

create policy "exams_staff_delete"
on public.exams for delete to authenticated
using (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and public.teacher_owns_marhalah_id(marhalah_id)
  )
);

-- Questions
drop policy if exists "questions_admin_insert" on public.questions;
drop policy if exists "questions_admin_update" on public.questions;
drop policy if exists "questions_admin_delete" on public.questions;
drop policy if exists "questions_teacher_insert" on public.questions;
drop policy if exists "questions_teacher_update" on public.questions;
drop policy if exists "questions_teacher_delete" on public.questions;

create policy "questions_staff_insert"
on public.questions for insert to authenticated
with check (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and (
      (exercise_id is not null and public.teacher_owns_exercise(exercise_id))
      or (exam_id is not null and public.teacher_owns_exam(exam_id))
    )
  )
);

create policy "questions_staff_update"
on public.questions for update to authenticated
using (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and (
      (exercise_id is not null and public.teacher_owns_exercise(exercise_id))
      or (exam_id is not null and public.teacher_owns_exam(exam_id))
    )
  )
)
with check (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and (
      (exercise_id is not null and public.teacher_owns_exercise(exercise_id))
      or (exam_id is not null and public.teacher_owns_exam(exam_id))
    )
  )
);

create policy "questions_staff_delete"
on public.questions for delete to authenticated
using (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and (
      (exercise_id is not null and public.teacher_owns_exercise(exercise_id))
      or (exam_id is not null and public.teacher_owns_exam(exam_id))
    )
  )
);

-- Manual scores
drop policy if exists "manual_scores_admin_insert" on public.manual_scores;
drop policy if exists "manual_scores_admin_update" on public.manual_scores;
drop policy if exists "manual_scores_teacher_insert" on public.manual_scores;
drop policy if exists "manual_scores_teacher_update" on public.manual_scores;

create policy "manual_scores_staff_insert"
on public.manual_scores for insert to authenticated
with check (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and public.teacher_can_access_student(student_id)
    and exists (
      select 1 from public.marhalahs m
      where m.id = marhalah_id
        and public.teacher_owns_marhalah_id(m.id)
    )
  )
);

create policy "manual_scores_staff_update"
on public.manual_scores for update to authenticated
using (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and public.teacher_can_access_student(student_id)
    and exists (
      select 1 from public.marhalahs m
      where m.id = marhalah_id
        and public.teacher_owns_marhalah_id(m.id)
    )
  )
)
with check (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and public.teacher_can_access_student(student_id)
    and exists (
      select 1 from public.marhalahs m
      where m.id = marhalah_id
        and public.teacher_owns_marhalah_id(m.id)
    )
  )
);

-- Exercise answer grades
drop policy if exists "exercise_answer_grades_admin_insert" on public.exercise_answer_grades;
drop policy if exists "exercise_answer_grades_admin_update" on public.exercise_answer_grades;
drop policy if exists "exercise_answer_grades_teacher_insert" on public.exercise_answer_grades;
drop policy if exists "exercise_answer_grades_teacher_update" on public.exercise_answer_grades;

create policy "exercise_answer_grades_staff_insert"
on public.exercise_answer_grades for insert to authenticated
with check (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and exists (
      select 1
      from public.exercise_submissions s
      where s.id = submission_id
        and public.teacher_can_access_student(s.student_id)
    )
  )
);

create policy "exercise_answer_grades_staff_update"
on public.exercise_answer_grades for update to authenticated
using (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and exists (
      select 1
      from public.exercise_submissions s
      where s.id = submission_id
        and public.teacher_can_access_student(s.student_id)
    )
  )
)
with check (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and exists (
      select 1
      from public.exercise_submissions s
      where s.id = submission_id
        and public.teacher_can_access_student(s.student_id)
    )
  )
);

-- Exam answer grades
drop policy if exists "exam_answer_grades_admin_insert" on public.exam_answer_grades;
drop policy if exists "exam_answer_grades_admin_update" on public.exam_answer_grades;
drop policy if exists "exam_answer_grades_teacher_insert" on public.exam_answer_grades;
drop policy if exists "exam_answer_grades_teacher_update" on public.exam_answer_grades;

create policy "exam_answer_grades_staff_insert"
on public.exam_answer_grades for insert to authenticated
with check (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and exists (
      select 1
      from public.exam_submissions s
      where s.id = submission_id
        and public.teacher_can_access_student(s.student_id)
    )
  )
);

create policy "exam_answer_grades_staff_update"
on public.exam_answer_grades for update to authenticated
using (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and exists (
      select 1
      from public.exam_submissions s
      where s.id = submission_id
        and public.teacher_can_access_student(s.student_id)
    )
  )
)
with check (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and exists (
      select 1
      from public.exam_submissions s
      where s.id = submission_id
        and public.teacher_can_access_student(s.student_id)
    )
  )
);

-- Exam submissions UPDATE: include admin (was teacher-only)
drop policy if exists "exam_submissions_update_teacher" on public.exam_submissions;

create policy "exam_submissions_update_staff"
on public.exam_submissions for update to authenticated
using (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and public.teacher_can_access_student(student_id)
    and exists (
      select 1 from public.exams e
      where e.id = exam_id
        and public.teacher_owns_marhalah_id(e.marhalah_id)
    )
  )
);
