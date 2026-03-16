alter table public.categories
  add column if not exists patient_education text;
