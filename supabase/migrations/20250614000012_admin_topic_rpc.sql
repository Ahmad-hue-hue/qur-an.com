-- Admin topic mutations via SECURITY DEFINER (reliable when JWT/session edge cases occur)

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
  p_is_published boolean default true
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
    coalesce(p_is_published, true)
  )
  returning * into result;

  return result;
end;
$$;

create or replace function public.admin_update_topic (
  p_id bigint,
  p_marhalah_id bigint,
  p_order smallint,
  p_title text,
  p_arabic_title text default '',
  p_content text default '',
  p_arabic_content text default '',
  p_examples text default '',
  p_audio_url text default null,
  p_pdf_url text default null,
  p_is_published boolean default true
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
  set marhalah_id = p_marhalah_id,
      "order" = p_order,
      title = p_title,
      arabic_title = coalesce(p_arabic_title, ''),
      content = coalesce(p_content, ''),
      arabic_content = coalesce(p_arabic_content, ''),
      examples = coalesce(p_examples, ''),
      audio_url = p_audio_url,
      pdf_url = p_pdf_url,
      is_published = coalesce(p_is_published, true)
  where id = p_id
  returning * into result;

  if not found then
    raise exception 'Topic not found';
  end if;

  return result;
end;
$$;

create or replace function public.admin_delete_topic (p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  delete from public.topics where id = p_id;

  if not found then
    raise exception 'Topic not found';
  end if;
end;
$$;

revoke all on function public.admin_create_topic (bigint, smallint, text, text, text, text, text, text, text, boolean) from public, anon;
revoke all on function public.admin_update_topic (bigint, bigint, smallint, text, text, text, text, text, text, text, boolean) from public, anon;
revoke all on function public.admin_delete_topic (bigint) from public, anon;

grant execute on function public.admin_create_topic (bigint, smallint, text, text, text, text, text, text, text, boolean) to authenticated, service_role;
grant execute on function public.admin_update_topic (bigint, bigint, smallint, text, text, text, text, text, text, text, boolean) to authenticated, service_role;
grant execute on function public.admin_delete_topic (bigint) to authenticated, service_role;

-- Explicit topic write policies (clearer than FOR ALL)
drop policy if exists "topics_admin_all" on public.topics;

create policy "topics_insert_admin"
on public.topics for insert
to authenticated
with check ((select public.is_admin()));

create policy "topics_update_admin"
on public.topics for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "topics_delete_admin"
on public.topics for delete
to authenticated
using ((select public.is_admin()));

-- Storage: admin read access for uploads
drop policy if exists "lesson_audio_admin_read" on storage.objects;
drop policy if exists "lesson_pdfs_admin_read" on storage.objects;

create policy "lesson_audio_admin_read"
on storage.objects for select
to authenticated
using (bucket_id = 'lesson-audio' and (select public.is_admin()));

create policy "lesson_pdfs_admin_read"
on storage.objects for select
to authenticated
using (bucket_id = 'lesson-pdfs' and (select public.is_admin()));
