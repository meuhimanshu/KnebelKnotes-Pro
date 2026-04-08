alter table public.antidepressant_master
  add column if not exists therapeutic_range_display text,
  add column if not exists max_dose_display text;

create or replace function public.antidepressant_snapshot(
  p_drug_name text,
  p_medication_type text,
  p_frequency text,
  p_tolerability_less text,
  p_tolerability_more text,
  p_safety text,
  p_cost text,
  p_line_of_treatment integer,
  p_initiation_dose_display text,
  p_therapeutic_range_display text,
  p_max_dose_display text,
  p_initiation_dose_mg numeric,
  p_therapeutic_min_dose_mg numeric,
  p_therapeutic_max_dose_mg numeric,
  p_max_dose_mg numeric,
  p_is_active boolean
)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'drug_name', trim(p_drug_name),
    'medication_type', trim(p_medication_type),
    'frequency', nullif(trim(coalesce(p_frequency, '')), ''),
    'tolerability_less', nullif(trim(coalesce(p_tolerability_less, '')), ''),
    'tolerability_more', nullif(trim(coalesce(p_tolerability_more, '')), ''),
    'safety', nullif(trim(coalesce(p_safety, '')), ''),
    'cost', nullif(trim(coalesce(p_cost, '')), ''),
    'line_of_treatment', p_line_of_treatment,
    'initiation_dose_display', nullif(trim(coalesce(p_initiation_dose_display, '')), ''),
    'therapeutic_range_display', nullif(trim(coalesce(p_therapeutic_range_display, '')), ''),
    'max_dose_display', nullif(trim(coalesce(p_max_dose_display, '')), ''),
    'initiation_dose_mg', p_initiation_dose_mg,
    'therapeutic_min_dose_mg', p_therapeutic_min_dose_mg,
    'therapeutic_max_dose_mg', p_therapeutic_max_dose_mg,
    'max_dose_mg', p_max_dose_mg,
    'is_active', p_is_active
  );
$$;

drop function if exists public.get_category_treatment_rows(uuid);

create or replace function public.get_category_treatment_rows(
  p_category_id uuid
)
returns table (
  id uuid,
  category_id uuid,
  drug_name text,
  medication_type text,
  frequency text,
  tolerability_less text,
  tolerability_more text,
  safety text,
  cost text,
  line_of_treatment integer,
  initiation_dose_display text,
  therapeutic_range_display text,
  max_dose_display text,
  initiation_dose_mg numeric,
  therapeutic_min_dose_mg numeric,
  therapeutic_max_dose_mg numeric,
  max_dose_mg numeric,
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
    master.tolerability_less,
    master.tolerability_more,
    master.safety,
    master.cost,
    master.line_of_treatment,
    master.initiation_dose_display,
    master.therapeutic_range_display,
    master.max_dose_display,
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

drop function if exists public.create_antidepressant_with_audit(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text
);

create or replace function public.create_antidepressant_with_audit(
  p_category_id uuid,
  p_drug_name text,
  p_medication_type text,
  p_frequency text,
  p_tolerability_less text,
  p_tolerability_more text,
  p_safety text,
  p_cost text,
  p_line_of_treatment integer,
  p_initiation_dose_display text,
  p_therapeutic_range_display text,
  p_max_dose_display text,
  p_initiation_dose_mg numeric,
  p_therapeutic_min_dose_mg numeric,
  p_therapeutic_max_dose_mg numeric,
  p_max_dose_mg numeric,
  p_change_reason text
)
returns public.antidepressant_master
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created public.antidepressant_master%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_treatment_admin() then
    raise exception 'Only super admins can create antidepressant master data';
  end if;

  if trim(coalesce(p_medication_type, '')) = '' then
    raise exception 'Medication type is required';
  end if;

  if trim(coalesce(p_change_reason, '')) = '' then
    raise exception 'Change reason is required';
  end if;

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
    max_dose_mg
  )
  values (
    p_category_id,
    trim(p_drug_name),
    trim(p_medication_type),
    nullif(trim(coalesce(p_frequency, '')), ''),
    nullif(trim(coalesce(p_tolerability_less, '')), ''),
    nullif(trim(coalesce(p_tolerability_more, '')), ''),
    nullif(trim(coalesce(p_safety, '')), ''),
    nullif(trim(coalesce(p_cost, '')), ''),
    p_line_of_treatment,
    nullif(trim(coalesce(p_initiation_dose_display, '')), ''),
    nullif(trim(coalesce(p_therapeutic_range_display, '')), ''),
    nullif(trim(coalesce(p_max_dose_display, '')), ''),
    p_initiation_dose_mg,
    p_therapeutic_min_dose_mg,
    p_therapeutic_max_dose_mg,
    p_max_dose_mg
  )
  returning *
  into v_created;

  insert into public.edit_audit_log (
    drug_id,
    changed_by_user_id,
    previous_data,
    new_data,
    change_reason
  )
  values (
    v_created.id,
    auth.uid(),
    '{}'::jsonb,
    public.antidepressant_snapshot(
      v_created.drug_name,
      v_created.medication_type,
      v_created.frequency,
      v_created.tolerability_less,
      v_created.tolerability_more,
      v_created.safety,
      v_created.cost,
      v_created.line_of_treatment,
      v_created.initiation_dose_display,
      v_created.therapeutic_range_display,
      v_created.max_dose_display,
      v_created.initiation_dose_mg,
      v_created.therapeutic_min_dose_mg,
      v_created.therapeutic_max_dose_mg,
      v_created.max_dose_mg,
      v_created.is_active
    ),
    trim(p_change_reason)
  );

  return v_created;
end;
$$;

drop function if exists public.update_antidepressant_with_audit(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text
);

create or replace function public.update_antidepressant_with_audit(
  p_drug_id uuid,
  p_drug_name text,
  p_medication_type text,
  p_frequency text,
  p_tolerability_less text,
  p_tolerability_more text,
  p_safety text,
  p_cost text,
  p_line_of_treatment integer,
  p_initiation_dose_display text,
  p_therapeutic_range_display text,
  p_max_dose_display text,
  p_initiation_dose_mg numeric,
  p_therapeutic_min_dose_mg numeric,
  p_therapeutic_max_dose_mg numeric,
  p_max_dose_mg numeric,
  p_change_reason text
)
returns public.antidepressant_master
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous public.antidepressant_master%rowtype;
  v_updated public.antidepressant_master%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_treatment_admin() then
    raise exception 'Only super admins can update antidepressant master data';
  end if;

  if trim(coalesce(p_medication_type, '')) = '' then
    raise exception 'Medication type is required';
  end if;

  if trim(coalesce(p_change_reason, '')) = '' then
    raise exception 'Change reason is required';
  end if;

  select *
  into v_previous
  from public.antidepressant_master
  where id = p_drug_id
  for update;

  if not found then
    raise exception 'Drug entry not found';
  end if;

  if not v_previous.is_active then
    raise exception 'Drug entry is already deleted';
  end if;

  update public.antidepressant_master
  set
    drug_name = trim(p_drug_name),
    medication_type = trim(p_medication_type),
    frequency = nullif(trim(coalesce(p_frequency, '')), ''),
    tolerability_less = nullif(trim(coalesce(p_tolerability_less, '')), ''),
    tolerability_more = nullif(trim(coalesce(p_tolerability_more, '')), ''),
    safety = nullif(trim(coalesce(p_safety, '')), ''),
    cost = nullif(trim(coalesce(p_cost, '')), ''),
    line_of_treatment = p_line_of_treatment,
    initiation_dose_display = nullif(trim(coalesce(p_initiation_dose_display, '')), ''),
    therapeutic_range_display = nullif(trim(coalesce(p_therapeutic_range_display, '')), ''),
    max_dose_display = nullif(trim(coalesce(p_max_dose_display, '')), ''),
    initiation_dose_mg = p_initiation_dose_mg,
    therapeutic_min_dose_mg = p_therapeutic_min_dose_mg,
    therapeutic_max_dose_mg = p_therapeutic_max_dose_mg,
    max_dose_mg = p_max_dose_mg
  where id = p_drug_id
  returning *
  into v_updated;

  insert into public.edit_audit_log (
    drug_id,
    changed_by_user_id,
    previous_data,
    new_data,
    change_reason
  )
  values (
    p_drug_id,
    auth.uid(),
    public.antidepressant_snapshot(
      v_previous.drug_name,
      v_previous.medication_type,
      v_previous.frequency,
      v_previous.tolerability_less,
      v_previous.tolerability_more,
      v_previous.safety,
      v_previous.cost,
      v_previous.line_of_treatment,
      v_previous.initiation_dose_display,
      v_previous.therapeutic_range_display,
      v_previous.max_dose_display,
      v_previous.initiation_dose_mg,
      v_previous.therapeutic_min_dose_mg,
      v_previous.therapeutic_max_dose_mg,
      v_previous.max_dose_mg,
      v_previous.is_active
    ),
    public.antidepressant_snapshot(
      v_updated.drug_name,
      v_updated.medication_type,
      v_updated.frequency,
      v_updated.tolerability_less,
      v_updated.tolerability_more,
      v_updated.safety,
      v_updated.cost,
      v_updated.line_of_treatment,
      v_updated.initiation_dose_display,
      v_updated.therapeutic_range_display,
      v_updated.max_dose_display,
      v_updated.initiation_dose_mg,
      v_updated.therapeutic_min_dose_mg,
      v_updated.therapeutic_max_dose_mg,
      v_updated.max_dose_mg,
      v_updated.is_active
    ),
    trim(p_change_reason)
  );

  return v_updated;
end;
$$;

drop function if exists public.submit_antidepressant_pending_edit(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text
);

create or replace function public.submit_antidepressant_pending_edit(
  p_drug_id uuid,
  p_drug_name text,
  p_medication_type text,
  p_frequency text,
  p_tolerability_less text,
  p_tolerability_more text,
  p_safety text,
  p_cost text,
  p_line_of_treatment integer,
  p_initiation_dose_display text,
  p_therapeutic_range_display text,
  p_max_dose_display text,
  p_initiation_dose_mg numeric,
  p_therapeutic_min_dose_mg numeric,
  p_therapeutic_max_dose_mg numeric,
  p_max_dose_mg numeric,
  p_change_reason text
)
returns public.pending_antidepressant_edits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous public.antidepressant_master%rowtype;
  v_pending public.pending_antidepressant_edits%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_treatment_editor() then
    raise exception 'Only treatment editors can submit change proposals';
  end if;

  if trim(coalesce(p_medication_type, '')) = '' then
    raise exception 'Medication type is required';
  end if;

  if trim(coalesce(p_change_reason, '')) = '' then
    raise exception 'Change reason is required';
  end if;

  select *
  into v_previous
  from public.antidepressant_master
  where id = p_drug_id;

  if not found then
    raise exception 'Drug entry not found';
  end if;

  if not v_previous.is_active then
    raise exception 'Drug entry is already deleted';
  end if;

  insert into public.pending_antidepressant_edits (
    drug_id,
    category_id,
    proposed_by_user_id,
    previous_data,
    proposed_data,
    change_reason
  )
  values (
    p_drug_id,
    v_previous.category_id,
    auth.uid(),
    public.antidepressant_snapshot(
      v_previous.drug_name,
      v_previous.medication_type,
      v_previous.frequency,
      v_previous.tolerability_less,
      v_previous.tolerability_more,
      v_previous.safety,
      v_previous.cost,
      v_previous.line_of_treatment,
      v_previous.initiation_dose_display,
      v_previous.therapeutic_range_display,
      v_previous.max_dose_display,
      v_previous.initiation_dose_mg,
      v_previous.therapeutic_min_dose_mg,
      v_previous.therapeutic_max_dose_mg,
      v_previous.max_dose_mg,
      v_previous.is_active
    ),
    public.antidepressant_snapshot(
      p_drug_name,
      p_medication_type,
      p_frequency,
      p_tolerability_less,
      p_tolerability_more,
      p_safety,
      p_cost,
      p_line_of_treatment,
      p_initiation_dose_display,
      p_therapeutic_range_display,
      p_max_dose_display,
      p_initiation_dose_mg,
      p_therapeutic_min_dose_mg,
      p_therapeutic_max_dose_mg,
      p_max_dose_mg,
      v_previous.is_active
    ),
    trim(p_change_reason)
  )
  returning *
  into v_pending;

  return v_pending;
end;
$$;

drop function if exists public.submit_antidepressant_pending_add(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text
);

create or replace function public.submit_antidepressant_pending_add(
  p_category_id uuid,
  p_drug_name text,
  p_medication_type text,
  p_frequency text,
  p_tolerability_less text,
  p_tolerability_more text,
  p_safety text,
  p_cost text,
  p_line_of_treatment integer,
  p_initiation_dose_display text,
  p_therapeutic_range_display text,
  p_max_dose_display text,
  p_initiation_dose_mg numeric,
  p_therapeutic_min_dose_mg numeric,
  p_therapeutic_max_dose_mg numeric,
  p_max_dose_mg numeric,
  p_change_reason text
)
returns public.pending_antidepressant_edits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending public.pending_antidepressant_edits%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_treatment_editor() then
    raise exception 'Only treatment editors can submit change proposals';
  end if;

  if trim(coalesce(p_medication_type, '')) = '' then
    raise exception 'Medication type is required';
  end if;

  if trim(coalesce(p_change_reason, '')) = '' then
    raise exception 'Change reason is required';
  end if;

  insert into public.pending_antidepressant_edits (
    drug_id,
    category_id,
    proposed_by_user_id,
    previous_data,
    proposed_data,
    change_reason
  )
  values (
    null,
    p_category_id,
    auth.uid(),
    '{}'::jsonb,
    public.antidepressant_snapshot(
      p_drug_name,
      p_medication_type,
      p_frequency,
      p_tolerability_less,
      p_tolerability_more,
      p_safety,
      p_cost,
      p_line_of_treatment,
      p_initiation_dose_display,
      p_therapeutic_range_display,
      p_max_dose_display,
      p_initiation_dose_mg,
      p_therapeutic_min_dose_mg,
      p_therapeutic_max_dose_mg,
      p_max_dose_mg,
      true
    ),
    trim(p_change_reason)
  )
  returning *
  into v_pending;

  return v_pending;
end;
$$;

create or replace function public.approve_antidepressant_pending_edit(
  p_pending_edit_id uuid,
  p_review_note text default null
)
returns public.antidepressant_master
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending public.pending_antidepressant_edits%rowtype;
  v_previous public.antidepressant_master%rowtype;
  v_updated public.antidepressant_master%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_treatment_admin() then
    raise exception 'Only super admins can approve pending edits';
  end if;

  select *
  into v_pending
  from public.pending_antidepressant_edits
  where id = p_pending_edit_id
  for update;

  if not found then
    raise exception 'Pending edit not found';
  end if;

  if v_pending.status <> 'pending' then
    raise exception 'Pending edit has already been reviewed';
  end if;

  if v_pending.drug_id is null then
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
    values (
      v_pending.category_id,
      trim(v_pending.proposed_data ->> 'drug_name'),
      trim(v_pending.proposed_data ->> 'medication_type'),
      nullif(trim(coalesce(v_pending.proposed_data ->> 'frequency', '')), ''),
      nullif(trim(coalesce(v_pending.proposed_data ->> 'tolerability_less', '')), ''),
      nullif(trim(coalesce(v_pending.proposed_data ->> 'tolerability_more', '')), ''),
      nullif(trim(coalesce(v_pending.proposed_data ->> 'safety', '')), ''),
      nullif(trim(coalesce(v_pending.proposed_data ->> 'cost', '')), ''),
      (v_pending.proposed_data ->> 'line_of_treatment')::integer,
      nullif(trim(coalesce(v_pending.proposed_data ->> 'initiation_dose_display', '')), ''),
      nullif(trim(coalesce(v_pending.proposed_data ->> 'therapeutic_range_display', '')), ''),
      nullif(trim(coalesce(v_pending.proposed_data ->> 'max_dose_display', '')), ''),
      (v_pending.proposed_data ->> 'initiation_dose_mg')::numeric,
      (v_pending.proposed_data ->> 'therapeutic_min_dose_mg')::numeric,
      (v_pending.proposed_data ->> 'therapeutic_max_dose_mg')::numeric,
      (v_pending.proposed_data ->> 'max_dose_mg')::numeric,
      coalesce((v_pending.proposed_data ->> 'is_active')::boolean, true)
    )
    returning *
    into v_updated;

    insert into public.edit_audit_log (
      drug_id,
      changed_by_user_id,
      previous_data,
      new_data,
      change_reason
    )
    values (
      v_updated.id,
      auth.uid(),
      '{}'::jsonb,
      public.antidepressant_snapshot(
        v_updated.drug_name,
        v_updated.medication_type,
        v_updated.frequency,
        v_updated.tolerability_less,
        v_updated.tolerability_more,
        v_updated.safety,
        v_updated.cost,
        v_updated.line_of_treatment,
        v_updated.initiation_dose_display,
        v_updated.therapeutic_range_display,
        v_updated.max_dose_display,
        v_updated.initiation_dose_mg,
        v_updated.therapeutic_min_dose_mg,
        v_updated.therapeutic_max_dose_mg,
        v_updated.max_dose_mg,
        v_updated.is_active
      ),
      trim(v_pending.change_reason)
    );
  else
    select *
    into v_previous
    from public.antidepressant_master
    where id = v_pending.drug_id
    for update;

    if not found then
      raise exception 'Drug entry not found';
    end if;

    update public.antidepressant_master
    set
      drug_name = trim(v_pending.proposed_data ->> 'drug_name'),
      medication_type = trim(coalesce(v_pending.proposed_data ->> 'medication_type', v_previous.medication_type)),
      frequency = nullif(trim(coalesce(v_pending.proposed_data ->> 'frequency', v_previous.frequency, '')), ''),
      tolerability_less = nullif(trim(coalesce(v_pending.proposed_data ->> 'tolerability_less', v_previous.tolerability_less, '')), ''),
      tolerability_more = nullif(trim(coalesce(v_pending.proposed_data ->> 'tolerability_more', v_previous.tolerability_more, '')), ''),
      safety = nullif(trim(coalesce(v_pending.proposed_data ->> 'safety', v_previous.safety, '')), ''),
      cost = nullif(trim(coalesce(v_pending.proposed_data ->> 'cost', v_previous.cost, '')), ''),
      line_of_treatment = (v_pending.proposed_data ->> 'line_of_treatment')::integer,
      initiation_dose_display = nullif(trim(coalesce(v_pending.proposed_data ->> 'initiation_dose_display', v_previous.initiation_dose_display, '')), ''),
      therapeutic_range_display = nullif(trim(coalesce(v_pending.proposed_data ->> 'therapeutic_range_display', v_previous.therapeutic_range_display, '')), ''),
      max_dose_display = nullif(trim(coalesce(v_pending.proposed_data ->> 'max_dose_display', v_previous.max_dose_display, '')), ''),
      initiation_dose_mg = (v_pending.proposed_data ->> 'initiation_dose_mg')::numeric,
      therapeutic_min_dose_mg = (v_pending.proposed_data ->> 'therapeutic_min_dose_mg')::numeric,
      therapeutic_max_dose_mg = (v_pending.proposed_data ->> 'therapeutic_max_dose_mg')::numeric,
      max_dose_mg = (v_pending.proposed_data ->> 'max_dose_mg')::numeric,
      is_active = coalesce((v_pending.proposed_data ->> 'is_active')::boolean, v_previous.is_active)
    where id = v_pending.drug_id
    returning *
    into v_updated;

    insert into public.edit_audit_log (
      drug_id,
      changed_by_user_id,
      previous_data,
      new_data,
      change_reason
    )
    values (
      v_pending.drug_id,
      auth.uid(),
      public.antidepressant_snapshot(
        v_previous.drug_name,
        v_previous.medication_type,
        v_previous.frequency,
        v_previous.tolerability_less,
        v_previous.tolerability_more,
        v_previous.safety,
        v_previous.cost,
        v_previous.line_of_treatment,
        v_previous.initiation_dose_display,
        v_previous.therapeutic_range_display,
        v_previous.max_dose_display,
        v_previous.initiation_dose_mg,
        v_previous.therapeutic_min_dose_mg,
        v_previous.therapeutic_max_dose_mg,
        v_previous.max_dose_mg,
        v_previous.is_active
      ),
      public.antidepressant_snapshot(
        v_updated.drug_name,
        v_updated.medication_type,
        v_updated.frequency,
        v_updated.tolerability_less,
        v_updated.tolerability_more,
        v_updated.safety,
        v_updated.cost,
        v_updated.line_of_treatment,
        v_updated.initiation_dose_display,
        v_updated.therapeutic_range_display,
        v_updated.max_dose_display,
        v_updated.initiation_dose_mg,
        v_updated.therapeutic_min_dose_mg,
        v_updated.therapeutic_max_dose_mg,
        v_updated.max_dose_mg,
        v_updated.is_active
      ),
      trim(v_pending.change_reason)
    );
  end if;

  update public.pending_antidepressant_edits
  set
    drug_id = coalesce(v_pending.drug_id, v_updated.id),
    status = 'approved',
    review_note = nullif(trim(coalesce(p_review_note, '')), ''),
    reviewed_by_user_id = auth.uid(),
    reviewed_at = timezone('utc', now())
  where id = v_pending.id;

  return v_updated;
end;
$$;

create or replace function public.delete_antidepressant_with_audit(
  p_drug_id uuid,
  p_change_reason text
)
returns public.antidepressant_master
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous public.antidepressant_master%rowtype;
  v_deleted public.antidepressant_master%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_treatment_admin() then
    raise exception 'Only super admins can delete antidepressant master data';
  end if;

  if trim(coalesce(p_change_reason, '')) = '' then
    raise exception 'Change reason is required';
  end if;

  select *
  into v_previous
  from public.antidepressant_master
  where id = p_drug_id
  for update;

  if not found then
    raise exception 'Drug entry not found';
  end if;

  if not v_previous.is_active then
    raise exception 'Drug entry is already deleted';
  end if;

  update public.antidepressant_master
  set
    is_active = false
  where id = p_drug_id
  returning *
  into v_deleted;

  insert into public.edit_audit_log (
    drug_id,
    changed_by_user_id,
    previous_data,
    new_data,
    change_reason
  )
  values (
    p_drug_id,
    auth.uid(),
    public.antidepressant_snapshot(
      v_previous.drug_name,
      v_previous.medication_type,
      v_previous.frequency,
      v_previous.tolerability_less,
      v_previous.tolerability_more,
      v_previous.safety,
      v_previous.cost,
      v_previous.line_of_treatment,
      v_previous.initiation_dose_display,
      v_previous.therapeutic_range_display,
      v_previous.max_dose_display,
      v_previous.initiation_dose_mg,
      v_previous.therapeutic_min_dose_mg,
      v_previous.therapeutic_max_dose_mg,
      v_previous.max_dose_mg,
      v_previous.is_active
    ),
    public.antidepressant_snapshot(
      v_deleted.drug_name,
      v_deleted.medication_type,
      v_deleted.frequency,
      v_deleted.tolerability_less,
      v_deleted.tolerability_more,
      v_deleted.safety,
      v_deleted.cost,
      v_deleted.line_of_treatment,
      v_deleted.initiation_dose_display,
      v_deleted.therapeutic_range_display,
      v_deleted.max_dose_display,
      v_deleted.initiation_dose_mg,
      v_deleted.therapeutic_min_dose_mg,
      v_deleted.therapeutic_max_dose_mg,
      v_deleted.max_dose_mg,
      v_deleted.is_active
    ),
    trim(p_change_reason)
  );

  return v_deleted;
end;
$$;

create or replace function public.submit_antidepressant_pending_delete(
  p_drug_id uuid,
  p_change_reason text
)
returns public.pending_antidepressant_edits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous public.antidepressant_master%rowtype;
  v_pending public.pending_antidepressant_edits%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_treatment_editor() then
    raise exception 'Only treatment editors can submit change proposals';
  end if;

  if trim(coalesce(p_change_reason, '')) = '' then
    raise exception 'Change reason is required';
  end if;

  select *
  into v_previous
  from public.antidepressant_master
  where id = p_drug_id;

  if not found then
    raise exception 'Drug entry not found';
  end if;

  if not v_previous.is_active then
    raise exception 'Drug entry is already deleted';
  end if;

  insert into public.pending_antidepressant_edits (
    drug_id,
    category_id,
    proposed_by_user_id,
    previous_data,
    proposed_data,
    change_reason
  )
  values (
    p_drug_id,
    v_previous.category_id,
    auth.uid(),
    public.antidepressant_snapshot(
      v_previous.drug_name,
      v_previous.medication_type,
      v_previous.frequency,
      v_previous.tolerability_less,
      v_previous.tolerability_more,
      v_previous.safety,
      v_previous.cost,
      v_previous.line_of_treatment,
      v_previous.initiation_dose_display,
      v_previous.therapeutic_range_display,
      v_previous.max_dose_display,
      v_previous.initiation_dose_mg,
      v_previous.therapeutic_min_dose_mg,
      v_previous.therapeutic_max_dose_mg,
      v_previous.max_dose_mg,
      v_previous.is_active
    ),
    public.antidepressant_snapshot(
      v_previous.drug_name,
      v_previous.medication_type,
      v_previous.frequency,
      v_previous.tolerability_less,
      v_previous.tolerability_more,
      v_previous.safety,
      v_previous.cost,
      v_previous.line_of_treatment,
      v_previous.initiation_dose_display,
      v_previous.therapeutic_range_display,
      v_previous.max_dose_display,
      v_previous.initiation_dose_mg,
      v_previous.therapeutic_min_dose_mg,
      v_previous.therapeutic_max_dose_mg,
      v_previous.max_dose_mg,
      false
    ),
    trim(p_change_reason)
  )
  returning *
  into v_pending;

  return v_pending;
end;
$$;

grant execute on function public.create_antidepressant_with_audit(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text
) to authenticated;

grant execute on function public.update_antidepressant_with_audit(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text
) to authenticated;

grant execute on function public.submit_antidepressant_pending_edit(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text
) to authenticated;

grant execute on function public.submit_antidepressant_pending_add(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text
) to authenticated;

grant execute on function public.delete_antidepressant_with_audit(uuid, text) to authenticated;
grant execute on function public.submit_antidepressant_pending_delete(uuid, text) to authenticated;

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
        2,
        'adjunctive',
        'Bupropion',
        null,
        '↓ Sedation; ↓ Weight gain; ↓ Sexual dysfunction; ↓ D/C syndrome; ↓ appetite',
        '↑ activating',
        'risk of seizure',
        'low',
        null,
        null,
        null,
        150::numeric,
        150::numeric,
        450::numeric,
        450::numeric
      ),
      (
        2,
        'adjunctive',
        'Intranasal esketamine',
        null,
        '↓ metabolic risk; ↓ weight gain; ↓ akathisia',
        '↑ dizziness; ↑ nausea; ↑ dissociation',
        'risk of high BP; abuse potential',
        'high',
        null,
        null,
        null,
        56::numeric,
        56::numeric,
        84::numeric,
        84::numeric
      ),
      (
        2,
        'adjunctive',
        'IV racemic ketamine',
        null,
        null,
        '↑ dissociation; ↑ dizziness; ↑ nausea; hallucinations; diplopia',
        'risk of high BP; abuse potential; urological toxicity',
        'high',
        '0.5 mg/kg',
        '0.5-1 mg/kg',
        '1 mg/kg',
        null,
        null,
        null,
        null
      ),
      (
        2,
        'adjunctive',
        'Olanzapine',
        null,
        null,
        '↑ weight gain; ↑ metabolic risk; ↑ appetite; ↑ sedation',
        null,
        'low',
        null,
        null,
        null,
        2.5::numeric,
        2.5::numeric,
        10::numeric,
        20::numeric
      ),
      (
        2,
        'adjunctive',
        'Quetiapine-XR',
        null,
        '↓ drug interactions; ↓ akathisia',
        '↑ sedation; ↑ metabolic risk; ↑ weight gain',
        'QT prolongation',
        'moderate',
        null,
        null,
        null,
        50::numeric,
        150::numeric,
        300::numeric,
        300::numeric
      ),
      (
        2,
        'adjunctive',
        'Risperidone',
        null,
        '↓ sedation',
        '↑ prolactin',
        null,
        'low',
        null,
        null,
        null,
        0.5::numeric,
        1::numeric,
        3::numeric,
        4::numeric
      ),
      (
        2,
        'adjunctive',
        'Lithium',
        null,
        'anti-suicidal',
        '↑ weight gain; ↑ tremor; ↑ GI distress',
        'Lithium toxicity',
        'low',
        '300 mg',
        '0.5-0.8 mmol/L',
        '1.0 mmol/L',
        null,
        null,
        null,
        null
      ),
      (
        2,
        'adjunctive',
        'Cariprazine',
        null,
        '↓ metabolic risk',
        'akathisia',
        null,
        'high',
        null,
        null,
        null,
        1.5::numeric,
        1.5::numeric,
        3::numeric,
        4.5::numeric
      ),
      (
        2,
        'adjunctive',
        'Mirtazapine',
        null,
        '↓ sexual dysfunction; ↓ D/C syndrome',
        '↑ appetite; ↑ sedation; ↑ weight gain',
        '↓ drug interactions',
        'low',
        null,
        null,
        null,
        15::numeric,
        15::numeric,
        45::numeric,
        45::numeric
      ),
      (
        2,
        'adjunctive',
        'Modafinil',
        null,
        '↓ weight gain',
        '↑ activating; ↑ appetite',
        'risk of high BP + HR; unsafe in pregnancy, breast feeding',
        'moderate',
        null,
        null,
        null,
        100::numeric,
        100::numeric,
        200::numeric,
        400::numeric
      ),
      (
        2,
        'adjunctive',
        'Triiodothyronine',
        null,
        null,
        '↑ activating',
        'thyroid risk',
        'low',
        '25 mcg',
        '25-50 mcg',
        '50 mcg',
        null,
        null,
        null,
        null
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
        2,
        'adjunctive',
        'Bupropion',
        null,
        '↓ Sedation; ↓ Weight gain; ↓ Sexual dysfunction; ↓ D/C syndrome; ↓ appetite',
        '↑ activating',
        'risk of seizure',
        'low',
        null,
        null,
        null,
        150::numeric,
        150::numeric,
        450::numeric,
        450::numeric
      ),
      (
        2,
        'adjunctive',
        'Intranasal esketamine',
        null,
        '↓ metabolic risk; ↓ weight gain; ↓ akathisia',
        '↑ dizziness; ↑ nausea; ↑ dissociation',
        'risk of high BP; abuse potential',
        'high',
        null,
        null,
        null,
        56::numeric,
        56::numeric,
        84::numeric,
        84::numeric
      ),
      (
        2,
        'adjunctive',
        'IV racemic ketamine',
        null,
        null,
        '↑ dissociation; ↑ dizziness; ↑ nausea; hallucinations; diplopia',
        'risk of high BP; abuse potential; urological toxicity',
        'high',
        '0.5 mg/kg',
        '0.5-1 mg/kg',
        '1 mg/kg',
        null,
        null,
        null,
        null
      ),
      (
        2,
        'adjunctive',
        'Olanzapine',
        null,
        null,
        '↑ weight gain; ↑ metabolic risk; ↑ appetite; ↑ sedation',
        null,
        'low',
        null,
        null,
        null,
        2.5::numeric,
        2.5::numeric,
        10::numeric,
        20::numeric
      ),
      (
        2,
        'adjunctive',
        'Quetiapine-XR',
        null,
        '↓ drug interactions; ↓ akathisia',
        '↑ sedation; ↑ metabolic risk; ↑ weight gain',
        'QT prolongation',
        'moderate',
        null,
        null,
        null,
        50::numeric,
        150::numeric,
        300::numeric,
        300::numeric
      ),
      (
        2,
        'adjunctive',
        'Risperidone',
        null,
        '↓ sedation',
        '↑ prolactin',
        null,
        'low',
        null,
        null,
        null,
        0.5::numeric,
        1::numeric,
        3::numeric,
        4::numeric
      ),
      (
        2,
        'adjunctive',
        'Lithium',
        null,
        'anti-suicidal',
        '↑ weight gain; ↑ tremor; ↑ GI distress',
        'Lithium toxicity',
        'low',
        '300 mg',
        '0.5-0.8 mmol/L',
        '1.0 mmol/L',
        null,
        null,
        null,
        null
      ),
      (
        2,
        'adjunctive',
        'Cariprazine',
        null,
        '↓ metabolic risk',
        'akathisia',
        null,
        'high',
        null,
        null,
        null,
        1.5::numeric,
        1.5::numeric,
        3::numeric,
        4.5::numeric
      ),
      (
        2,
        'adjunctive',
        'Mirtazapine',
        null,
        '↓ sexual dysfunction; ↓ D/C syndrome',
        '↑ appetite; ↑ sedation; ↑ weight gain',
        '↓ drug interactions',
        'low',
        null,
        null,
        null,
        15::numeric,
        15::numeric,
        45::numeric,
        45::numeric
      ),
      (
        2,
        'adjunctive',
        'Modafinil',
        null,
        '↓ weight gain',
        '↑ activating; ↑ appetite',
        'risk of high BP + HR; unsafe in pregnancy, breast feeding',
        'moderate',
        null,
        null,
        null,
        100::numeric,
        100::numeric,
        200::numeric,
        400::numeric
      ),
      (
        2,
        'adjunctive',
        'Triiodothyronine',
        null,
        null,
        '↑ activating',
        'thyroid risk',
        'low',
        '25 mcg',
        '25-50 mcg',
        '50 mcg',
        null,
        null,
        null,
        null
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
