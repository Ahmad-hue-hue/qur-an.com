-- Security hardening: function search_path, RPC grants, storage listing

-- ---------------------------------------------------------------------------
-- Fix mutable search_path on helper functions
-- ---------------------------------------------------------------------------
create or replace function public.normalize_answer (value text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(trim(coalesce(value, '')));
$$;

create or replace function public.question_requires_manual (q_type text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select q_type in ('fill_gap', 'written');
$$;

create or replace function public.get_assessment_status (
  p_start timestamptz,
  p_end timestamptz,
  p_has_submitted boolean default false
)
returns text
language plpgsql
stable
set search_path = public
as $$
begin
  if p_has_submitted then
    return 'completed';
  end if;
  if now() < p_start then
    return 'upcoming';
  end if;
  if now() > p_end then
    return 'expired';
  end if;
  return 'open';
end;
$$;

-- ---------------------------------------------------------------------------
-- Lock down RPC execute permissions (revoke from anon/public)
-- ---------------------------------------------------------------------------
revoke all on function public.normalize_answer (text) from public, anon;
revoke all on function public.question_requires_manual (text) from public, anon;
revoke all on function public.get_assessment_status (timestamptz, timestamptz, boolean) from public, anon;
revoke all on function public.handle_new_user () from public, anon, authenticated;
revoke all on function public.assign_registration_number (uuid) from public, anon, authenticated;
revoke all on function public.is_admin () from public, anon;
revoke all on function public.current_profile () from public, anon, authenticated;
revoke all on function public.submit_exercise (bigint, jsonb) from public, anon;
revoke all on function public.grade_exercise_answer (bigint, numeric, text) from public, anon;
revoke all on function public.calculate_final_score (uuid, bigint) from public, anon;
revoke all on function public.is_marhalah_unlocked (uuid, bigint) from public, anon;

grant execute on function public.normalize_answer (text) to authenticated, service_role;
grant execute on function public.question_requires_manual (text) to authenticated, service_role;
grant execute on function public.get_assessment_status (timestamptz, timestamptz, boolean) to authenticated, service_role;
grant execute on function public.handle_new_user () to service_role;
grant execute on function public.assign_registration_number (uuid) to service_role;
grant execute on function public.is_admin () to authenticated, service_role;
grant execute on function public.submit_exercise (bigint, jsonb) to authenticated, service_role;
grant execute on function public.grade_exercise_answer (bigint, numeric, text) to authenticated, service_role;
grant execute on function public.calculate_final_score (uuid, bigint) to authenticated, service_role;
grant execute on function public.is_marhalah_unlocked (uuid, bigint) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Public buckets: drop broad SELECT policies (prevents listing; direct URLs still work)
-- ---------------------------------------------------------------------------
drop policy if exists "lesson_audio_public_read" on storage.objects;
drop policy if exists "lesson_pdfs_public_read" on storage.objects;
