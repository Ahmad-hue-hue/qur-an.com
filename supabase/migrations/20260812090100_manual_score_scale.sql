-- Fix point scale: ḥalaqah is always out of 20, tadreeb is always out of 15.
-- manual_scores.max_score defaulted to 20 for both types, and the frontend
-- never overrode it for tadreeb, so tadreeb was effectively also out of 20.
-- Backfill existing rows, then add a check constraint so this can't drift
-- again from any future write path.

update public.manual_scores set max_score = 20 where type = 'halaqah' and max_score <> 20;
update public.manual_scores set max_score = 15 where type = 'tadreeb' and max_score <> 15;

alter table public.manual_scores drop constraint if exists manual_scores_max_score_by_type;
alter table public.manual_scores
  add constraint manual_scores_max_score_by_type
  check (
    (type = 'halaqah' and max_score = 20)
    or (type = 'tadreeb' and max_score = 15)
  );
