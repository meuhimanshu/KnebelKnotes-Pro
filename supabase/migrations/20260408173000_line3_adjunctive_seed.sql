do $$
declare
  v_category_id uuid;
begin
  select category.id
  into v_category_id
  from public.categories as category
  where lower(btrim(category.name)) = 'depression'
     or category.short_code = 'QAZ4C'
  order by case
    when lower(btrim(category.name)) = 'depression' then 0
    when category.short_code = 'QAZ4C' then 1
    else 2
  end,
  category.id
  limit 1;

  if not found then
    raise exception 'Depression category was not found. Expected categories.name = ''Depression'' or short_code = ''QAZ4C''.';
  end if;

  with source (
    line_of_treatment,
    medication_type,
    drug_name,
    frequency,
    tolerability_less,
    tolerability_more,
    safety,
    cost,
    initiation_dose_display,
    therapeutic_range_display,
    max_dose_display,
    initiation_dose_mg,
    therapeutic_min_dose_mg,
    therapeutic_max_dose_mg,
    max_dose_mg
  ) as (
    values
      (
        3,
        'adjunctive',
        'Other antidepressants, including TCAs',
        null,
        null,
        null,
        'QT prolongation',
        'low',
        '25 mg',
        'Varies',
        'Varies',
        null,
        null,
        null,
        null
      ),
      (
        3,
        'adjunctive',
        'Stimulants',
        null,
        '↓ appetite',
        '↑ activating',
        'risk of high BP',
        'moderate',
        '5 mg',
        'Varies',
        'Varies',
        null,
        null,
        null,
        null
      ),
      (
        3,
        'adjunctive',
        'Lamotrigine',
        null,
        null,
        'Diplopia',
        'risk of Stevens-Johnson syndrome',
        'low',
        null,
        null,
        null,
        25::numeric,
        100::numeric,
        200::numeric,
        400::numeric
      ),
      (
        3,
        'adjunctive',
        'Non-IV racemic ketamine',
        null,
        null,
        null,
        'risk of high BP',
        'high',
        '50 mg',
        'Varies',
        'Varies',
        null,
        null,
        null,
        null
      ),
      (
        3,
        'adjunctive',
        'Pramipexole',
        null,
        '↓ weight gain',
        '↑ dyskinesias; ↑ impulsivity',
        null,
        'moderate',
        null,
        '0.5-2 mg BID',
        null,
        0.125::numeric,
        0.5::numeric,
        2::numeric,
        5::numeric
      ),
      (
        3,
        'adjunctive',
        'Ziprasidone',
        null,
        '↓ weight gain',
        null,
        'QT prolongation',
        'low',
        null,
        '40-80 mg BID',
        null,
        20::numeric,
        40::numeric,
        80::numeric,
        160::numeric
      )
  )
  update public.antidepressant_master as target
  set
    frequency = source.frequency,
    tolerability_less = source.tolerability_less,
    tolerability_more = source.tolerability_more,
    safety = source.safety,
    cost = source.cost,
    initiation_dose_display = source.initiation_dose_display,
    therapeutic_range_display = source.therapeutic_range_display,
    max_dose_display = source.max_dose_display,
    initiation_dose_mg = source.initiation_dose_mg,
    therapeutic_min_dose_mg = source.therapeutic_min_dose_mg,
    therapeutic_max_dose_mg = source.therapeutic_max_dose_mg,
    max_dose_mg = source.max_dose_mg,
    is_active = true
  from source
  where target.category_id = v_category_id
    and target.line_of_treatment = source.line_of_treatment
    and target.medication_type = source.medication_type
    and target.drug_name = source.drug_name;

  with source (
    line_of_treatment,
    medication_type,
    drug_name,
    frequency,
    tolerability_less,
    tolerability_more,
    safety,
    cost,
    initiation_dose_display,
    therapeutic_range_display,
    max_dose_display,
    initiation_dose_mg,
    therapeutic_min_dose_mg,
    therapeutic_max_dose_mg,
    max_dose_mg
  ) as (
    values
      (
        3,
        'adjunctive',
        'Other antidepressants, including TCAs',
        null,
        null,
        null,
        'QT prolongation',
        'low',
        '25 mg',
        'Varies',
        'Varies',
        null,
        null,
        null,
        null
      ),
      (
        3,
        'adjunctive',
        'Stimulants',
        null,
        '↓ appetite',
        '↑ activating',
        'risk of high BP',
        'moderate',
        '5 mg',
        'Varies',
        'Varies',
        null,
        null,
        null,
        null
      ),
      (
        3,
        'adjunctive',
        'Lamotrigine',
        null,
        null,
        'Diplopia',
        'risk of Stevens-Johnson syndrome',
        'low',
        null,
        null,
        null,
        25::numeric,
        100::numeric,
        200::numeric,
        400::numeric
      ),
      (
        3,
        'adjunctive',
        'Non-IV racemic ketamine',
        null,
        null,
        null,
        'risk of high BP',
        'high',
        '50 mg',
        'Varies',
        'Varies',
        null,
        null,
        null,
        null
      ),
      (
        3,
        'adjunctive',
        'Pramipexole',
        null,
        '↓ weight gain',
        '↑ dyskinesias; ↑ impulsivity',
        null,
        'moderate',
        null,
        '0.5-2 mg BID',
        null,
        0.125::numeric,
        0.5::numeric,
        2::numeric,
        5::numeric
      ),
      (
        3,
        'adjunctive',
        'Ziprasidone',
        null,
        '↓ weight gain',
        null,
        'QT prolongation',
        'low',
        null,
        '40-80 mg BID',
        null,
        20::numeric,
        40::numeric,
        80::numeric,
        160::numeric
      )
  )
  insert into public.antidepressant_master (
    category_id,
    drug_name,
    medication_type,
    frequency,
    tolerability_less,
    tolerability_more,
    safety,
    cost,
    line_of_treatment,
    initiation_dose_display,
    therapeutic_range_display,
    max_dose_display,
    initiation_dose_mg,
    therapeutic_min_dose_mg,
    therapeutic_max_dose_mg,
    max_dose_mg,
    is_active
  )
  select
    v_category_id,
    source.drug_name,
    source.medication_type,
    source.frequency,
    source.tolerability_less,
    source.tolerability_more,
    source.safety,
    source.cost,
    source.line_of_treatment,
    source.initiation_dose_display,
    source.therapeutic_range_display,
    source.max_dose_display,
    source.initiation_dose_mg,
    source.therapeutic_min_dose_mg,
    source.therapeutic_max_dose_mg,
    source.max_dose_mg,
    true
  from source
  where not exists (
    select 1
    from public.antidepressant_master as target
    where target.category_id = v_category_id
      and target.line_of_treatment = source.line_of_treatment
      and target.medication_type = source.medication_type
      and target.drug_name = source.drug_name
  );
end;
$$;
