-- Students assigned to a Marḥalah via profiles.current_marhalah can access that stage
-- even if they have not met the previous stage unlock score.

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
  prev record;
  prev_score numeric;
  assigned_number smallint;
begin
  select * into m from public.marhalahs where id = p_marhalah_id;
  if not found then
    return false;
  end if;

  select current_marhalah into assigned_number
  from public.profiles
  where id = p_student_id;

  if assigned_number is not null and m.number = assigned_number then
    return true;
  end if;

  if m.number = 1 then
    return true;
  end if;

  select * into prev from public.marhalahs where number = m.number - 1;
  if not found then
    return false;
  end if;

  prev_score := public.calculate_final_score(p_student_id, prev.id);
  return prev_score >= m.unlock_threshold;
end;
$$;

grant execute on function public.is_marhalah_unlocked (uuid, bigint) to authenticated, service_role;
