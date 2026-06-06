create extension if not exists pgcrypto;

alter table public.workspaces
add column if not exists invite_code text;

alter table public.workspace_members
add column if not exists user_email text;

alter table public.employees
add column if not exists is_active boolean not null default true;

alter table public.employees
add column if not exists inactive_at date;

alter table public.employees
add column if not exists deleted_at timestamptz;

alter table public.employees
drop constraint if exists employees_workspace_id_name_key;

create unique index if not exists employees_workspace_visible_name_key
on public.employees(workspace_id, name)
where deleted_at is null;

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

create or replace function public.join_workspace_by_code(input_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_workspace_id uuid;
  normalized_code text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  normalized_code := upper(regexp_replace(coalesce(input_invite_code, ''), '\s+', '', 'g'));

  select id into target_workspace_id
  from public.workspaces
  where invite_code = normalized_code;

  if target_workspace_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, user_email)
  values (target_workspace_id, auth.uid(), 'PENDING', auth.jwt() ->> 'email')
  on conflict (workspace_id, user_id) do nothing;

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
begin
  if not public.is_workspace_admin(target_workspace_id) then
    raise exception 'Admin permission required';
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
