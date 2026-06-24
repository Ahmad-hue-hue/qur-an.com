-- Preserve existing audio/pdf URLs when admin update omits new file URLs

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
      audio_url = coalesce(p_audio_url, audio_url),
      pdf_url = coalesce(p_pdf_url, pdf_url),
      is_published = coalesce(p_is_published, is_published)
  where id = p_id
  returning * into result;

  if not found then
    raise exception 'Topic not found';
  end if;

  return result;
end;
$$;
