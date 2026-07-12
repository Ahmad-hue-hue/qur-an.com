-- Link lesson exercises to topics (one exercise per non-final lesson).

alter table public.exercises
  add column if not exists topic_id bigint references public.topics (id) on delete cascade;

create unique index if not exists exercises_topic_id_unique
  on public.exercises (topic_id)
  where topic_id is not null;

create unique index if not exists exams_marhalah_id_unique
  on public.exams (marhalah_id);
