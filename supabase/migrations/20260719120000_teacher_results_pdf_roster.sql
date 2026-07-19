-- Teachers see their own-gender roster in the app, but print the complete
-- male and female register together for the official results document.

create or replace function public.get_teacher_marhalah_results_roster_pdf (
  p_marhalah_number integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'teacher'
  ) then
    raise exception 'Teacher only';
  end if;

  return public.get_marhalah_results_roster(p_marhalah_number);
end;
$$;

revoke all on function public.get_teacher_marhalah_results_roster_pdf (integer) from public, anon;
grant execute on function public.get_teacher_marhalah_results_roster_pdf (integer)
  to authenticated, service_role;
