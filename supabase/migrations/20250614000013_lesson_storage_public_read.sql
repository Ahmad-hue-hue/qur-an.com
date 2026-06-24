-- Public read for lesson files (direct URL access; bucket is public)

drop policy if exists "lesson_audio_public_read" on storage.objects;
drop policy if exists "lesson_pdfs_public_read" on storage.objects;

create policy "lesson_audio_public_read"
on storage.objects for select
using (bucket_id = 'lesson-audio');

create policy "lesson_pdfs_public_read"
on storage.objects for select
using (bucket_id = 'lesson-pdfs');
