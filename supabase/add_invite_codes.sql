create extension if not exists pgcrypto;

alter table public.workspaces
add column if not exists invite_code text;

alter table public.workspace_members
add column if not exists user_email text;

alter table public.workspace_members
add column if not exists employee_id uuid;

alter table public.employees
add column if not exists is_active boolean not null default true;

alter table public.employees
add column if not exists email text;

alter table public.employees
add column if not exists inactive_at date;

alter table public.employees
add column if not exists deleted_at timestamptz;

alter table public.employees
drop constraint if exists employees_workspace_id_name_key;

create unique index if not exists employees_workspace_visible_name_key
on public.employees(workspace_id, name)
where deleted_at is null;

create unique index if not exists employees_workspace_visible_email_key
on public.employees(workspace_id, lower(email))
where deleted_at is null and email is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workspace_members_employee_id_fkey'
      and conrelid = 'public.workspace_members'::regclass
  ) then
    alter table public.workspace_members
    add constraint workspace_members_employee_id_fkey
    foreign key (employee_id)
    references public.employees(id)
    on delete set null;
  end if;
end;
$$;

alter table public.workspace_members
drop constraint if exists workspace_members_role_check;

alter table public.workspace_members
add constraint workspace_members_role_check
check (role in ('ADMIN', 'USER', 'PENDING'));

create or replace function public.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

    exit when not exists (
      select 1
      from public.workspaces
      where invite_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

update public.workspaces
set invite_code = public.generate_invite_code()
where invite_code is null;

alter table public.workspaces
alter column invite_code set default public.generate_invite_code();

alter table public.workspaces
alter column invite_code set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workspaces_invite_code_key'
      and conrelid = 'public.workspaces'::regclass
  ) then
    alter table public.workspaces
    add constraint workspaces_invite_code_key unique (invite_code);
  end if;
end;
$$;

create or replace function public.create_workspace(workspace_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.workspaces (name, owner_id)
  values (coalesce(nullif(trim(workspace_name), ''), '내 근무표'), auth.uid())
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role, user_email)
  values (new_workspace_id, auth.uid(), 'ADMIN', auth.jwt() ->> 'email');

  return new_workspace_id;
end;
$$;

grant execute on function public.create_workspace(text) to authenticated;

create or replace function public.is_workspace_admin(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
      and role = 'ADMIN'
  );
$$;

drop function if exists public.save_employee(uuid, uuid, text, text, text, integer);

create or replace function public.save_employee(
  target_workspace_id uuid,
  target_employee_id uuid,
  employee_name text,
  employee_email text,
  employee_role text,
  employee_sort_order integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text;
  normalized_email text;
  saved_employee_id uuid;
begin
  if not public.is_workspace_admin(target_workspace_id) then
    raise exception 'Admin permission required';
  end if;

  normalized_name := nullif(trim(employee_name), '');
  normalized_email := lower(nullif(trim(employee_email), ''));

  if normalized_name is null then
    raise exception 'Employee name required';
  end if;

  if normalized_email is null then
    raise exception 'Employee email required';
  end if;

  if employee_role not in ('ADMIN', 'USER') then
    raise exception 'Invalid employee role';
  end if;

  if exists (
    select 1
    from public.employees
    where workspace_id = target_workspace_id
      and deleted_at is null
      and name = normalized_name
      and (target_employee_id is null or id <> target_employee_id)
  ) then
    raise exception 'Employee name already exists';
  end if;

  if exists (
    select 1
    from public.employees
    where workspace_id = target_workspace_id
      and deleted_at is null
      and lower(email) = normalized_email
      and (target_employee_id is null or id <> target_employee_id)
  ) then
    raise exception 'Employee email already exists';
  end if;

  if target_employee_id is null then
    insert into public.employees (
      workspace_id,
      name,
      email,
      role,
      sort_order,
      is_active,
      inactive_at,
      deleted_at
    )
    values (
      target_workspace_id,
      normalized_name,
      normalized_email,
      employee_role,
      coalesce(employee_sort_order, 0),
      true,
      null,
      null
    )
    returning id into saved_employee_id;
  else
    update public.employees
    set name = normalized_name,
        email = normalized_email,
        role = employee_role,
        sort_order = coalesce(employee_sort_order, sort_order)
    where id = target_employee_id
      and workspace_id = target_workspace_id
      and deleted_at is null
    returning id into saved_employee_id;

    if saved_employee_id is null then
      raise exception 'Employee not found';
    end if;
  end if;

  return saved_employee_id;
end;
$$;

grant execute on function public.save_employee(uuid, uuid, text, text, text, integer) to authenticated;

drop function if exists public.get_invite_employees(text);

drop function if exists public.join_workspace_by_code(text, uuid);

create or replace function public.join_workspace_by_code(input_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_workspace_id uuid;
  normalized_code text;
  matched_employee_id uuid;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  normalized_code := upper(regexp_replace(coalesce(input_invite_code, ''), '\s+', '', 'g'));
  user_email := lower(nullif(trim(auth.jwt() ->> 'email'), ''));

  if user_email is null then
    raise exception 'Email required';
  end if;

  select id into target_workspace_id
  from public.workspaces
  where invite_code = normalized_code;

  if target_workspace_id is null then
    raise exception 'Invalid invite code';
  end if;

  select id into matched_employee_id
  from public.employees
  where lower(email) = user_email
      and workspace_id = target_workspace_id
      and is_active = true
      and deleted_at is null
  limit 1;

  if matched_employee_id is null then
    raise exception 'Employee email not registered';
  end if;

  if exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and employee_id = matched_employee_id
      and user_id <> auth.uid()
      and role in ('ADMIN', 'USER', 'PENDING')
  ) then
    raise exception 'Employee already selected';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, user_email, employee_id)
  values (target_workspace_id, auth.uid(), 'PENDING', user_email, matched_employee_id)
  on conflict (workspace_id, user_id) do update
  set user_email = excluded.user_email,
      employee_id = excluded.employee_id
  where public.workspace_members.role = 'PENDING';

  return target_workspace_id;
end;
$$;

grant execute on function public.join_workspace_by_code(text) to authenticated;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
      and role in ('ADMIN', 'USER')
  );
$$;

create or replace function public.is_workspace_participant(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.approve_workspace_member(
  target_workspace_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_employee_id uuid;
begin
  if not public.is_workspace_admin(target_workspace_id) then
    raise exception 'Admin permission required';
  end if;

  select employee_id into selected_employee_id
  from public.workspace_members
  where workspace_id = target_workspace_id
    and user_id = target_user_id
    and role = 'PENDING';

  if selected_employee_id is null then
    raise exception 'Employee selection required';
  end if;

  if exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and employee_id = selected_employee_id
      and user_id <> target_user_id
      and role in ('ADMIN', 'USER')
  ) then
    raise exception 'Employee already approved';
  end if;

  update public.workspace_members
  set role = 'USER'
  where workspace_id = target_workspace_id
    and user_id = target_user_id
    and role = 'PENDING';
end;
$$;

grant execute on function public.approve_workspace_member(uuid, uuid) to authenticated;

create or replace function public.reject_workspace_member(
  target_workspace_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_workspace_admin(target_workspace_id) then
    raise exception 'Admin permission required';
  end if;

  delete from public.workspace_members
  where workspace_id = target_workspace_id
    and user_id = target_user_id
    and role = 'PENDING';
end;
$$;

grant execute on function public.reject_workspace_member(uuid, uuid) to authenticated;

drop policy if exists "members can read their workspaces" on public.workspaces;
create policy "members can read their workspaces"
on public.workspaces for select
using (public.is_workspace_participant(id));

drop policy if exists "members can read workspace members" on public.workspace_members;
create policy "members can read workspace members"
on public.workspace_members for select
using (public.is_workspace_admin(workspace_id) or user_id = auth.uid());

notify pgrst, 'reload schema';
