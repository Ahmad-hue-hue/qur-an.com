
-- RLS policies reference is_admin() even for anon role evaluation.
-- Safe to grant: returns false when auth.uid() is null.
grant execute on function public.is_admin () to anon;
