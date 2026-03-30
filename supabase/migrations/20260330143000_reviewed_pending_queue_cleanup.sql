drop function if exists public.delete_reviewed_antidepressant_pending_edit(uuid);

create or replace function public.delete_reviewed_antidepressant_pending_edit(
  p_pending_edit_id uuid
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

  select *
  into v_pending
  from public.pending_antidepressant_edits
  where id = p_pending_edit_id
  for update;

  if not found then
    raise exception 'Pending edit not found';
  end if;

  if v_pending.status = 'pending' then
    raise exception 'Pending proposals cannot be removed before review';
  end if;

  if not public.is_treatment_admin() and v_pending.proposed_by_user_id <> auth.uid() then
    raise exception 'You can only remove your own reviewed proposals';
  end if;

  delete from public.pending_antidepressant_edits
  where id = p_pending_edit_id
  returning *
  into v_pending;

  return v_pending;
end;
$$;

grant execute on function public.delete_reviewed_antidepressant_pending_edit(uuid) to authenticated;
