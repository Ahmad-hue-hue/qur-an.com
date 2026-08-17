-- Drop the legacy score-only fallback that let a student see next-marhalah
-- content purely because their previous-marhalah score crossed the unlock
-- threshold, even while halaqah/tadreeb/exercises were incomplete. Now that
-- maybe_promote_student() resolves pass/fail synchronously at exam
-- submission (see 20260817073100_marhalah_exam_decisive.sql), current_marhalah
-- is always authoritative, so access should be gated on it alone.
create or replace function public.is_marhalah_unlocked (
  p_student_id uuid,
  p_marhalah_id bigint
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  m record;
  assigned_number smallint;
begin
  select * into m from public.marhalahs where id = p_marhalah_id;
  if not found then
    return false;
  end if;

  select current_marhalah into assigned_number
  from public.profiles
  where id = p_student_id;

  -- Assigned stage and all previous stages are readable.
  if assigned_number is not null and m.number <= assigned_number then
    return true;
  end if;

  if m.number = 1 then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.is_marhalah_unlocked (uuid, bigint) to authenticated, service_role;
