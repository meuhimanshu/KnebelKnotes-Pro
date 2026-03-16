create or replace function public.search_treatment_medications(
  p_query text
)
returns table (
  drug_name text,
  category_id uuid,
  category_name text,
  category_short_code text,
  line_numbers integer[]
)
language sql
security definer
set search_path = public
as $$
  select
    master.drug_name,
    category.id as category_id,
    category.name as category_name,
    category.short_code as category_short_code,
    array_agg(distinct master.line_of_treatment order by master.line_of_treatment) as line_numbers
  from public.antidepressant_master as master
  join public.categories as category on category.id = master.category_id
  where master.is_active = true
    and trim(coalesce(p_query, '')) <> ''
    and master.drug_name ilike '%' || trim(p_query) || '%'
  group by master.drug_name, category.id, category.name, category.short_code
  order by lower(master.drug_name), category.name;
$$;

grant execute on function public.search_treatment_medications(text) to anon;
grant execute on function public.search_treatment_medications(text) to authenticated;
