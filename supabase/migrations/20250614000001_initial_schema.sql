-- Tajweed Platform — initial Supabase schema

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (linked to auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'admin')),
  first_name text not null default '',
  last_name text not null default '',
  phone text unique,
  registration_number text unique,
  is_suspended boolean not null default false,
  current_marhalah smallint not null default 1 check (current_marhalah between 1 and 4),
  has_attempted_exercise boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Courses
-- ---------------------------------------------------------------------------
create table public.marhalahs (
  id bigserial primary key,
  number smallint not null unique,
  title text not null,
  description text not null default '',
  unlock_threshold smallint not null default 0,
  "order" smallint not null default 0
);

create table public.topics (
  id bigserial primary key,
  marhalah_id bigint not null references public.marhalahs (id) on delete cascade,
  "order" smallint not null,
  title text not null,
  arabic_title text not null default '',
  content text not null default '',
  arabic_content text not null default '',
  examples text not null default '',
  audio_url text,
  pdf_url text,
  is_published boolean not null default true,
  unique (marhalah_id, "order")
);

create table public.topic_completions (
  id bigserial primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  topic_id bigint not null references public.topics (id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (student_id, topic_id)
);

-- ---------------------------------------------------------------------------
-- Assessments
-- ---------------------------------------------------------------------------
create table public.score_weights (
  id smallint primary key default 1 check (id = 1),
  exercises smallint not null default 30,
  exam smallint not null default 40,
  halaqah smallint not null default 15,
  tadreeb smallint not null default 15
);

create table public.exercises (
  id bigserial primary key,
  marhalah_id bigint not null references public.marhalahs (id) on delete cascade,
  title text not null,
  description text not null default '',
  start_date timestamptz not null,
  end_date timestamptz not null
);

create table public.exams (
  id bigserial primary key,
  marhalah_id bigint not null references public.marhalahs (id) on delete cascade,
  title text not null,
  description text not null default '',
  duration_minutes smallint not null default 60,
  start_date timestamptz not null,
  end_date timestamptz not null
);

create table public.questions (
  id bigserial primary key,
  exercise_id bigint references public.exercises (id) on delete cascade,
  exam_id bigint references public.exams (id) on delete cascade,
  type text not null check (
    type in ('mcq', 'fill_blank', 'true_false', 'fill_gap', 'written')
  ),
  text text not null,
  arabic_text text not null default '',
  options jsonb not null default '[]'::jsonb,
  correct_answer text not null default '',
  "order" smallint not null default 1,
  max_score smallint not null default 1,
  check (
    (exercise_id is not null and exam_id is null)
    or (exercise_id is null and exam_id is not null)
  )
);

create table public.exercise_submissions (
  id bigserial primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id bigint not null references public.exercises (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score numeric(6, 2) not null default 0,
  max_score numeric(6, 2) not null default 0,
  grading_status text not null default 'complete' check (
    grading_status in ('complete', 'pending_manual')
  ),
  submitted_at timestamptz not null default now(),
  unique (student_id, exercise_id)
);

create table public.exercise_answer_grades (
  id bigserial primary key,
  submission_id bigint not null references public.exercise_submissions (id) on delete cascade,
  question_id bigint not null references public.questions (id) on delete cascade,
  answer_text text not null default '',
  score numeric(6, 2),
  max_score numeric(6, 2) not null default 1,
  feedback text not null default '',
  graded_at timestamptz,
  unique (submission_id, question_id)
);

create table public.exam_submissions (
  id bigserial primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  exam_id bigint not null references public.exams (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score numeric(6, 2) not null default 0,
  max_score numeric(6, 2) not null default 0,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (student_id, exam_id)
);

create table public.manual_scores (
  id bigserial primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  marhalah_id bigint not null references public.marhalahs (id) on delete cascade,
  type text not null check (type in ('halaqah', 'tadreeb')),
  score numeric(6, 2) not null,
  max_score numeric(6, 2) not null default 20,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  unique (student_id, marhalah_id, type)
);

-- ---------------------------------------------------------------------------
-- Auth trigger: create profile on signup
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
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user ();

-- ---------------------------------------------------------------------------
-- RLS helpers
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
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.current_profile ()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.profiles
  where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.marhalahs enable row level security;
alter table public.topics enable row level security;
alter table public.topic_completions enable row level security;
alter table public.score_weights enable row level security;
alter table public.exercises enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.exercise_submissions enable row level security;
alter table public.exercise_answer_grades enable row level security;
alter table public.exam_submissions enable row level security;
alter table public.manual_scores enable row level security;

-- Profiles
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin"
on public.profiles for update
using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_admin"
on public.profiles for insert
with check (public.is_admin());

create policy "profiles_delete_admin"
on public.profiles for delete
using (public.is_admin());

-- Marhalahs: readable by authenticated users
create policy "marhalahs_select_authenticated"
on public.marhalahs for select
to authenticated
using (true);

create policy "marhalahs_admin_all"
on public.marhalahs for all
using (public.is_admin())
with check (public.is_admin());

-- Topics
create policy "topics_select_published_or_admin"
on public.topics for select
using (is_published = true or public.is_admin());

create policy "topics_admin_all"
on public.topics for all
using (public.is_admin())
with check (public.is_admin());

-- Topic completions
create policy "topic_completions_select_own_or_admin"
on public.topic_completions for select
using (student_id = auth.uid() or public.is_admin());

create policy "topic_completions_insert_own"
on public.topic_completions for insert
with check (student_id = auth.uid());

-- Score weights
create policy "score_weights_select_authenticated"
on public.score_weights for select
to authenticated
using (true);

create policy "score_weights_admin"
on public.score_weights for all
using (public.is_admin())
with check (public.is_admin());

-- Exercises & exams
create policy "exercises_select_authenticated"
on public.exercises for select
to authenticated
using (true);

create policy "exercises_admin_all"
on public.exercises for all
using (public.is_admin())
with check (public.is_admin());

create policy "exams_select_authenticated"
on public.exams for select
to authenticated
using (true);

create policy "exams_admin_all"
on public.exams for all
using (public.is_admin())
with check (public.is_admin());

-- Questions
create policy "questions_select_authenticated"
on public.questions for select
to authenticated
using (true);

create policy "questions_admin_all"
on public.questions for all
using (public.is_admin())
with check (public.is_admin());

-- Submissions
create policy "exercise_submissions_select_own_or_admin"
on public.exercise_submissions for select
using (student_id = auth.uid() or public.is_admin());

create policy "exercise_submissions_insert_own"
on public.exercise_submissions for insert
with check (student_id = auth.uid());

create policy "exercise_submissions_update_admin"
on public.exercise_submissions for update
using (public.is_admin());

-- Answer grades
create policy "exercise_answer_grades_select"
on public.exercise_answer_grades for select
using (
  exists (
    select 1
    from public.exercise_submissions s
    where s.id = submission_id
      and (s.student_id = auth.uid() or public.is_admin())
  )
);

create policy "exercise_answer_grades_admin_write"
on public.exercise_answer_grades for all
using (public.is_admin())
with check (public.is_admin());

-- Exam submissions
create policy "exam_submissions_select_own_or_admin"
on public.exam_submissions for select
using (student_id = auth.uid() or public.is_admin());

create policy "exam_submissions_insert_own"
on public.exam_submissions for insert
with check (student_id = auth.uid());

create policy "exam_submissions_update_own"
on public.exam_submissions for update
using (student_id = auth.uid());

-- Manual scores
create policy "manual_scores_select_own_or_admin"
on public.manual_scores for select
using (student_id = auth.uid() or public.is_admin());

create policy "manual_scores_admin_all"
on public.manual_scores for all
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('lesson-audio', 'lesson-audio', true),
  ('lesson-pdfs', 'lesson-pdfs', true)
on conflict (id) do nothing;

create policy "lesson_audio_public_read"
on storage.objects for select
using (bucket_id = 'lesson-audio');

create policy "lesson_audio_admin_write"
on storage.objects for insert
with check (bucket_id = 'lesson-audio' and public.is_admin());

create policy "lesson_audio_admin_update"
on storage.objects for update
using (bucket_id = 'lesson-audio' and public.is_admin());

create policy "lesson_audio_admin_delete"
on storage.objects for delete
using (bucket_id = 'lesson-audio' and public.is_admin());

create policy "lesson_pdfs_public_read"
on storage.objects for select
using (bucket_id = 'lesson-pdfs');

create policy "lesson_pdfs_admin_write"
on storage.objects for insert
with check (bucket_id = 'lesson-pdfs' and public.is_admin());

create policy "lesson_pdfs_admin_update"
on storage.objects for update
using (bucket_id = 'lesson-pdfs' and public.is_admin());

create policy "lesson_pdfs_admin_delete"
on storage.objects for delete
using (bucket_id = 'lesson-pdfs' and public.is_admin());
