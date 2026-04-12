do $$
declare
  v_user_id uuid;
  v_old_email constant text := 'himanshumap@gmail.com';
  v_new_email constant text := 'ryanjjknebel@gmail.com';
begin
  select profile.id
  into v_user_id
  from public.profiles as profile
  where profile.username = 'testsuper'
    and profile.role = 'super_admin'
  order by profile.created_at nulls last, profile.id
  limit 1;

  if not found then
    raise exception 'Super admin profile with username % was not found.', 'testsuper';
  end if;

  if exists (
    select 1
    from public.profiles as profile
    where lower(coalesce(profile.email, '')) = lower(v_new_email)
      and profile.id <> v_user_id
  ) then
    raise exception 'Cannot change super admin email to %, because that email is already used in public.profiles.', v_new_email;
  end if;

  if exists (
    select 1
    from auth.users as auth_user
    where lower(coalesce(auth_user.email, '')) = lower(v_new_email)
      and auth_user.id <> v_user_id
  ) then
    raise exception 'Cannot change super admin email to %, because that email is already used in auth.users.', v_new_email;
  end if;

  update public.profiles
  set email = v_new_email
  where id = v_user_id
    and email is distinct from v_new_email;

  update auth.users
  set
    email = v_new_email,
    updated_at = now()
  where id = v_user_id
    and email is distinct from v_new_email;

  if not exists (
    select 1
    from auth.users as auth_user
    where auth_user.id = v_user_id
      and lower(coalesce(auth_user.email, '')) = lower(v_new_email)
  ) then
    raise exception
      'Expected auth.users email for username % to change from % to %, but no matching auth user was updated.',
      'testsuper',
      v_old_email,
      v_new_email;
  end if;
end;
$$;
