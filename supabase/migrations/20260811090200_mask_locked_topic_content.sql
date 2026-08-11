-- Security fix: student_list_topics (20250714210000) returns `t.*` for every
-- topic in the current marhalah, including ones with is_published = false.
-- The comment there says locked topics are included "so UI can show them",
-- and the sibling student_get_topic() correctly blocks reading full content
-- for a locked current-stage topic -- but student_list_topics never applied
-- that same gate, so calling the RPC directly (bypassing the UI) reveals the
-- full content/arabic_content/examples/audio_url/pdf_url of lessons an admin
-- hasn't unlocked yet.
--
-- Fix: keep returning a row per topic (so the UI can still render a locked
-- placeholder), but null out the content fields when the topic is in the
-- student's current marhalah and not yet published. Previous marhalahs are
-- unaffected (always fully unlocked, same as student_get_topic's logic).

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

  return query
  select
    t.id,
    t.marhalah_id,
    t."order",
    t.title,
    t.arabic_title,
    case
      when v_assigned is not null and v_number = v_assigned and t.is_published is not true
        then ''
      else t.content
    end as content,
    case
      when v_assigned is not null and v_number = v_assigned and t.is_published is not true
        then ''
      else t.arabic_content
    end as arabic_content,
    case
      when v_assigned is not null and v_number = v_assigned and t.is_published is not true
        then ''
      else t.examples
    end as examples,
    case
      when v_assigned is not null and v_number = v_assigned and t.is_published is not true
        then null
      else t.audio_url
    end as audio_url,
    case
      when v_assigned is not null and v_number = v_assigned and t.is_published is not true
        then null
      else t.pdf_url
    end as pdf_url,
    t.is_published
  from public.topics t
  where t.marhalah_id = p_marhalah_id
  order by t."order";
end;
$$;
