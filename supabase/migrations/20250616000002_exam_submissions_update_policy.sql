-- Merge exam_submissions UPDATE policies (lint 0006)

drop policy if exists "exam_submissions_update_own" on public.exam_submissions;
drop policy if exists "exam_submissions_update_staff" on public.exam_submissions;

create policy "exam_submissions_update"
on public.exam_submissions for update to authenticated
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
)
with check (
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
