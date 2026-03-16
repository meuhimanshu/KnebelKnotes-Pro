create or replace function public.get_category_treatment_rows(
  p_category_id uuid
)
returns table (
  id uuid,
  category_id uuid,
  drug_name text,
  medication_type text,
  frequency text,
  line_of_treatment integer,
  initiation_dose_mg integer,
  therapeutic_min_dose_mg integer,
  therapeutic_max_dose_mg integer,
  max_dose_mg integer,
  updated_at timestamptz,
  is_active boolean
)
language sql
security definer
set search_path = public
as $$
  select
    master.id,
    master.category_id,
    master.drug_name,
    master.medication_type,
    master.frequency,
    master.line_of_treatment,
    master.initiation_dose_mg,
    master.therapeutic_min_dose_mg,
    master.therapeutic_max_dose_mg,
    master.max_dose_mg,
    master.updated_at,
    master.is_active
  from public.antidepressant_master as master
  where master.category_id = p_category_id
    and master.is_active = true
  order by master.line_of_treatment asc, master.drug_name asc;
$$;

grant execute on function public.get_category_treatment_rows(uuid) to anon;
grant execute on function public.get_category_treatment_rows(uuid) to authenticated;
