-- Lesson unlock is per-topic (is_published). New lessons start locked.
-- Students may list topics in accessible marhalahs (including locked) via RPC.

alter table public.topics
  alter column is_published set default false;

create or replace function public.admin_create_topic (
  p_marhalah_id bigint,
  p_order smallint,
  p_title text,
  p_arabic_title text default '',
  p_content text default '',
  p_arabic_content text default '',
  p_examples text default '',
  p_audio_url text default null,
  p_pdf_url text default null,
  p_is_published boolean default false
)
returns public.topics
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.topics;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  insert into public.topics (
    marhalah_id,
    "order",
    title,
    arabic_title,
    content,
    arabic_content,
    examples,
    audio_url,
    pdf_url,
    is_published
  )
  values (
    p_marhalah_id,
    p_order,
    p_title,
    coalesce(p_arabic_title, ''),
    coalesce(p_content, ''),
    coalesce(p_arabic_content, ''),
    coalesce(p_examples, ''),
    p_audio_url,
    p_pdf_url,
    coalesce(p_is_published, false)
  )
  returning * into result;

  return result;
end;
$$;

create or replace function public.set_topic_unlocked (
  p_topic_id bigint,
  p_unlocked boolean
)
returns public.topics
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.topics;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  update public.topics
  set is_published = coalesce(p_unlocked, false)
  where id = p_topic_id
  returning * into result;

  if not found then
    raise exception 'Topic not found';
  end if;

  return result;
end;
$$;

revoke all on function public.set_topic_unlocked (bigint, boolean) from public, anon;
grant execute on function public.set_topic_unlocked (bigint, boolean) to authenticated, service_role;

-- List topics for a student marhalah (bypasses RLS so locked lessons can be shown).
create or replace function public.student_list_topics (p_marhalah_id bigint)
returns setof public.topics
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_assigned smallint;
  v_number smallint;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_marhalah_unlocked(v_uid, p_marhalah_id) then
    raise exception 'Marhalah is locked.';
  end if;

  select current_marhalah into v_assigned
  from public.profiles
  where id = v_uid;

  select number into v_number
  from public.marhalahs
  where id = p_marhalah_id;

  -- Previous stages: all lessons. Current stage: include locked so UI can show them.
  return query
  select t.*
  from public.topics t
  where t.marhalah_id = p_marhalah_id
  order by t."order";
end;
$$;

revoke all on function public.student_list_topics (bigint) from public, anon;
grant execute on function public.student_list_topics (bigint) to authenticated, service_role;

create or replace function public.student_get_topic (p_topic_id bigint)
returns public.topics
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_topic public.topics;
  v_assigned smallint;
  v_number smallint;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_topic from public.topics where id = p_topic_id;
  if not found then
    raise exception 'Topic not found';
  end if;

  if not public.is_marhalah_unlocked(v_uid, v_topic.marhalah_id) then
    raise exception 'This Marḥalah is locked.';
  end if;

  select current_marhalah into v_assigned
  from public.profiles
  where id = v_uid;

  select number into v_number
  from public.marhalahs
  where id = v_topic.marhalah_id;

  -- Current marhalah: only unlocked lessons are readable.
  if v_assigned is not null
     and v_number = v_assigned
     and v_topic.is_published is not true then
    raise exception 'This lesson is locked until an admin unlocks it.';
  end if;

  return v_topic;
end;
$$;

revoke all on function public.student_get_topic (bigint) from public, anon;
grant execute on function public.student_get_topic (bigint) to authenticated, service_role;
