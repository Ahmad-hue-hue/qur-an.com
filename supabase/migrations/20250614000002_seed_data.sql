insert into public.marhalahs (number, title, description, unlock_threshold, "order")
values
  (1, 'Marḥalah 1', '', 0, 1),
  (2, 'Marḥalah 2', '', 50, 2),
  (3, 'Marḥalah 3', '', 60, 3),
  (4, 'Marḥalah 4', '', 60, 4)
on conflict (number) do nothing;

insert into public.score_weights (id, exercises, exam, halaqah, tadreeb)
values (1, 30, 40, 15, 15)
on conflict (id) do nothing;
