-- Teacher role: gender-scoped student access, marhalah management, assessment grading

-- ---------------------------------------------------------------------------
-- Schema: role, gender, managed marhalah
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'admin', 'teacher'));

alter table public.profiles
  add column if not exists gender text check (gender in ('male', 'female'));

alter table public.profiles
  add column if not exists managed_marhalah smallint check (managed_marhalah between 1 and 4);

-- ---------------------------------------------------------------------------
-- Helpers
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
    where id = auth.uid() and role = 'teacher'
  );
$$;

revoke all on function public.is_teacher () from public, anon;
grant execute on function public.is_teacher () to authenticated, service_role;

create or replace function public.is_staff ()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_teacher();
$$;

revoke all on function public.is_staff () from public, anon;
grant execute on function public.is_staff () to authenticated, service_role;

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
    where t.id = auth.uid()
      and t.role = 'teacher'
      and s.role = 'student'
      and t.gender is not null
      and s.gender = t.gender
      and t.managed_marhalah is not null
      and s.current_marhalah = t.managed_marhalah
  );
$$;

revoke all on function public.teacher_can_access_student (uuid) from public, anon;
grant execute on function public.teacher_can_access_student (uuid) to authenticated, service_role;

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
    where t.id = auth.uid()
      and t.role = 'teacher'
      and m.id = p_marhalah_id
  );
$$;

revoke all on function public.teacher_owns_marhalah_id (bigint) from public, anon;
grant execute on function public.teacher_owns_marhalah_id (bigint) to authenticated, service_role;

create or replace function public.teacher_owns_exercise (p_exercise_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exercises e
    where e.id = p_exercise_id
      and public.teacher_owns_marhalah_id(e.marhalah_id)
  );
$$;

revoke all on function public.teacher_owns_exercise (bigint) from public, anon;
grant execute on function public.teacher_owns_exercise (bigint) to authenticated, service_role;

create or replace function public.teacher_owns_exam (p_exam_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exams e
    where e.id = p_exam_id
      and public.teacher_owns_marhalah_id(e.marhalah_id)
  );
$$;

revoke all on function public.teacher_owns_exam (bigint) from public, anon;
grant execute on function public.teacher_owns_exam (bigint) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Auth trigger: gender on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    phone,
    role,
    gender,
    managed_marhalah
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    nullif(new.raw_user_meta_data ->> 'gender', ''),
    nullif(new.raw_user_meta_data ->> 'managed_marhalah', '')::smallint
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Teacher: switch managed marhalah
-- ---------------------------------------------------------------------------
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

  if p_marhalah not between 1 and 4 then
    raise exception 'Invalid marhalah';
  end if;

  update public.profiles
  set managed_marhalah = p_marhalah
  where id = auth.uid();
end;
$$;

revoke all on function public.set_managed_marhalah (smallint) from public, anon;
grant execute on function public.set_managed_marhalah (smallint) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Profiles RLS: teachers read gender-matched students in their marhalah
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;

create policy "profiles_select_own_staff_or_teacher_students"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_admin())
  or (
    (select public.is_teacher())
    and role = 'student'
    and public.teacher_can_access_student(id)
  )
);

create policy "profiles_update_own_or_admin"
on public.profiles for update
to authenticated
using (id = (select auth.uid()) or (select public.is_admin()))
with check (id = (select auth.uid()) or (select public.is_admin()));

create policy "profiles_update_teacher_managed_marhalah"
on public.profiles for update
to authenticated
using (id = (select auth.uid()) and (select public.is_teacher()))
with check (id = (select auth.uid()) and (select public.is_teacher()));

-- ---------------------------------------------------------------------------
-- Assessment write access for teachers (managed marhalah only)
-- ---------------------------------------------------------------------------
create policy "exercises_teacher_insert"
on public.exercises for insert to authenticated
with check (
  (select public.is_teacher())
  and public.teacher_owns_marhalah_id(marhalah_id)
);

create policy "exercises_teacher_update"
on public.exercises for update to authenticated
using (
  (select public.is_teacher())
  and public.teacher_owns_marhalah_id(marhalah_id)
)
with check (
  (select public.is_teacher())
  and public.teacher_owns_marhalah_id(marhalah_id)
);

create policy "exercises_teacher_delete"
on public.exercises for delete to authenticated
using (
  (select public.is_teacher())
  and public.teacher_owns_marhalah_id(marhalah_id)
);

create policy "exams_teacher_insert"
on public.exams for insert to authenticated
with check (
  (select public.is_teacher())
  and public.teacher_owns_marhalah_id(marhalah_id)
);

create policy "exams_teacher_update"
on public.exams for update to authenticated
using (
  (select public.is_teacher())
  and public.teacher_owns_marhalah_id(marhalah_id)
)
with check (
  (select public.is_teacher())
  and public.teacher_owns_marhalah_id(marhalah_id)
);

create policy "exams_teacher_delete"
on public.exams for delete to authenticated
using (
  (select public.is_teacher())
  and public.teacher_owns_marhalah_id(marhalah_id)
);

create policy "questions_teacher_insert"
on public.questions for insert to authenticated
with check (
  (select public.is_teacher())
  and (
    (exercise_id is not null and public.teacher_owns_exercise(exercise_id))
    or (exam_id is not null and public.teacher_owns_exam(exam_id))
  )
);

create policy "questions_teacher_update"
on public.questions for update to authenticated
using (
  (select public.is_teacher())
  and (
    (exercise_id is not null and public.teacher_owns_exercise(exercise_id))
    or (exam_id is not null and public.teacher_owns_exam(exam_id))
  )
)
with check (
  (select public.is_teacher())
  and (
    (exercise_id is not null and public.teacher_owns_exercise(exercise_id))
    or (exam_id is not null and public.teacher_owns_exam(exam_id))
  )
);

create policy "questions_teacher_delete"
on public.questions for delete to authenticated
using (
  (select public.is_teacher())
  and (
    (exercise_id is not null and public.teacher_owns_exercise(exercise_id))
    or (exam_id is not null and public.teacher_owns_exam(exam_id))
  )
);

-- Submissions & grades
drop policy if exists "exercise_submissions_select_own_or_admin" on public.exercise_submissions;
create policy "exercise_submissions_select_own_staff_or_teacher"
on public.exercise_submissions for select to authenticated
using (
  student_id = (select auth.uid())
  or (select public.is_admin())
  or (
    (select public.is_teacher())
    and public.teacher_can_access_student(student_id)
    and exists (
      select 1 from public.exercises e
      where e.id = exercise_id
        and public.teacher_owns_marhalah_id(e.marhalah_id)
    )
  )
);

drop policy if exists "exercise_submissions_update_admin" on public.exercise_submissions;
create policy "exercise_submissions_update_staff"
on public.exercise_submissions for update to authenticated
using (
  (select public.is_admin())
  or (
    (select public.is_teacher())
    and public.teacher_can_access_student(student_id)
    and exists (
      select 1 from public.exercises e
      where e.id = exercise_id
        and public.teacher_owns_marhalah_id(e.marhalah_id)
    )
  )
);

drop policy if exists "exercise_answer_grades_select" on public.exercise_answer_grades;
create policy "exercise_answer_grades_select"
on public.exercise_answer_grades for select to authenticated
using (
  exists (
    select 1
    from public.exercise_submissions s
    where s.id = submission_id
      and (
        s.student_id = (select auth.uid())
        or (select public.is_admin())
        or (
          (select public.is_teacher())
          and public.teacher_can_access_student(s.student_id)
          and exists (
            select 1 from public.exercises e
            where e.id = s.exercise_id
              and public.teacher_owns_marhalah_id(e.marhalah_id)
          )
        )
      )
  )
);

create policy "exercise_answer_grades_teacher_insert"
on public.exercise_answer_grades for insert to authenticated
with check (
  (select public.is_teacher())
  and exists (
    select 1
    from public.exercise_submissions s
    where s.id = submission_id
      and public.teacher_can_access_student(s.student_id)
  )
);

create policy "exercise_answer_grades_teacher_update"
on public.exercise_answer_grades for update to authenticated
using (
  (select public.is_teacher())
  and exists (
    select 1
    from public.exercise_submissions s
    where s.id = submission_id
      and public.teacher_can_access_student(s.student_id)
  )
)
with check (
  (select public.is_teacher())
  and exists (
    select 1
    from public.exercise_submissions s
    where s.id = submission_id
      and public.teacher_can_access_student(s.student_id)
  )
);

drop policy if exists "exam_submissions_select_own_or_admin" on public.exam_submissions;
create policy "exam_submissions_select_own_staff_or_teacher"
on public.exam_submissions for select to authenticated
using (
  student_id = (select auth.uid())
  or (select public.is_admin())
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

create policy "exam_submissions_update_teacher"
on public.exam_submissions for update to authenticated
using (
  (select public.is_teacher())
  and public.teacher_can_access_student(student_id)
  and exists (
    select 1 from public.exams e
    where e.id = exam_id
      and public.teacher_owns_marhalah_id(e.marhalah_id)
  )
);

drop policy if exists "exam_answer_grades_select" on public.exam_answer_grades;
create policy "exam_answer_grades_select"
on public.exam_answer_grades for select to authenticated
using (
  exists (
    select 1
    from public.exam_submissions s
    where s.id = submission_id
      and (
        s.student_id = (select auth.uid())
        or (select public.is_admin())
        or (
          (select public.is_teacher())
          and public.teacher_can_access_student(s.student_id)
          and exists (
            select 1 from public.exams e
            where e.id = s.exam_id
              and public.teacher_owns_marhalah_id(e.marhalah_id)
          )
        )
      )
  )
);

create policy "exam_answer_grades_teacher_insert"
on public.exam_answer_grades for insert to authenticated
with check (
  (select public.is_teacher())
  and exists (
    select 1
    from public.exam_submissions s
    where s.id = submission_id
      and public.teacher_can_access_student(s.student_id)
  )
);

create policy "exam_answer_grades_teacher_update"
on public.exam_answer_grades for update to authenticated
using (
  (select public.is_teacher())
  and exists (
    select 1
    from public.exam_submissions s
    where s.id = submission_id
      and public.teacher_can_access_student(s.student_id)
  )
)
with check (
  (select public.is_teacher())
  and exists (
    select 1
    from public.exam_submissions s
    where s.id = submission_id
      and public.teacher_can_access_student(s.student_id)
  )
);

-- Manual scores (halaqah / tadreeb)
drop policy if exists "manual_scores_select_own_or_admin" on public.manual_scores;
create policy "manual_scores_select_own_staff_or_teacher"
on public.manual_scores for select to authenticated
using (
  student_id = (select auth.uid())
  or (select public.is_admin())
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

create policy "manual_scores_teacher_insert"
on public.manual_scores for insert to authenticated
with check (
  (select public.is_teacher())
  and public.teacher_can_access_student(student_id)
  and exists (
    select 1 from public.marhalahs m
    where m.id = marhalah_id
      and public.teacher_owns_marhalah_id(m.id)
  )
);

create policy "manual_scores_teacher_update"
on public.manual_scores for update to authenticated
using (
  (select public.is_teacher())
  and public.teacher_can_access_student(student_id)
  and exists (
    select 1 from public.marhalahs m
    where m.id = marhalah_id
      and public.teacher_owns_marhalah_id(m.id)
  )
)
with check (
  (select public.is_teacher())
  and public.teacher_can_access_student(student_id)
  and exists (
    select 1 from public.marhalahs m
    where m.id = marhalah_id
      and public.teacher_owns_marhalah_id(m.id)
  )
);

-- ---------------------------------------------------------------------------
-- Grading RPCs: allow teachers for their students
-- ---------------------------------------------------------------------------
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
  v_submission_id bigint;
  v_student_id uuid;
  v_total_score numeric := 0;
  v_pending boolean := false;
  v_grading_status text;
begin
  select g.submission_id, s.student_id
  into v_submission_id, v_student_id
  from public.exercise_answer_grades g
  join public.exercise_submissions s on s.id = g.submission_id
  where g.id = p_grade_id;

  if v_submission_id is null then
    raise exception 'Grade not found';
  end if;

  if not public.is_admin()
     and not (
       public.is_teacher()
       and public.teacher_can_access_student(v_student_id)
     ) then
    raise exception 'Not authorized to grade';
  end if;

  update public.exercise_answer_grades
  set score = p_score,
      feedback = coalesce(p_feedback, ''),
      graded_at = now()
  where id = p_grade_id;

  select bool_or(score is null)
  into v_pending
  from public.exercise_answer_grades
  where submission_id = v_submission_id;

  select coalesce(sum(score), 0)
  into v_total_score
  from public.exercise_answer_grades
  where submission_id = v_submission_id
    and score is not null;

  v_grading_status := case when v_pending then 'pending_manual' else 'complete' end;

  update public.exercise_submissions
  set score = v_total_score,
      grading_status = v_grading_status
  where id = v_submission_id;

  return jsonb_build_object('grading_status', v_grading_status);
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
  v_student_id uuid;
  v_total_score numeric := 0;
  v_pending boolean := false;
  v_grading_status text;
begin
  select g.submission_id, s.student_id
  into v_submission_id, v_student_id
  from public.exam_answer_grades g
  join public.exam_submissions s on s.id = g.submission_id
  where g.id = p_grade_id;

  if v_submission_id is null then
    raise exception 'Grade not found';
  end if;

  if not public.is_admin()
     and not (
       public.is_teacher()
       and public.teacher_can_access_student(v_student_id)
     ) then
    raise exception 'Not authorized to grade';
  end if;

  update public.exam_answer_grades
  set score = p_score,
      feedback = coalesce(p_feedback, ''),
      graded_at = now()
  where id = p_grade_id;

  select bool_or(score is null)
  into v_pending
  from public.exam_answer_grades
  where submission_id = v_submission_id;

  select coalesce(sum(score), 0)
  into v_total_score
  from public.exam_answer_grades
  where submission_id = v_submission_id
    and score is not null;

  v_grading_status := case when v_pending then 'pending_manual' else 'complete' end;

  update public.exam_submissions
  set score = v_total_score,
      grading_status = v_grading_status
  where id = v_submission_id;

  return jsonb_build_object('grading_status', v_grading_status);
end;
$$;
