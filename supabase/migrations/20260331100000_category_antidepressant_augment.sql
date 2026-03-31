alter table public.categories
  add column if not exists antidepressant_augment text;

update public.categories
set antidepressant_augment = reassessment
where antidepressant_augment is null
  and reassessment is not null;
