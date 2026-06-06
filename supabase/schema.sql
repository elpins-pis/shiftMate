create extension if not exists pgcrypto;

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

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null default public.generate_invite_code(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invite_code)
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('ADMIN', 'USER', 'PENDING')),
  user_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  role text not null default 'USER' check (role in ('ADMIN', 'USER')),
  user_id uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  inactive_at date,
  deleted_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create table public.shift_types (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  icon text not null default '*',
  color text not null default '#3182f6',
  category text not null default 'WORK' check (category in ('WORK', 'OFF', 'VACATION', 'OTHER')),
  start_time time,
  end_time time,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name),
  check (
    (category = 'WORK' and start_time is not null and end_time is not null)
    or
    (category <> 'WORK' and start_time is null and end_time is null)
  )
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  employee_id uuid not null,
  shift_type_id uuid not null,
  work_date date not null,
  start_time time,
  end_time time,
  category text not null check (category in ('WORK', 'OFF', 'VACATION', 'OTHER')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, employee_id, work_date),
  foreign key (workspace_id, employee_id)
    references public.employees(workspace_id, id)
    on delete cascade,
  foreign key (workspace_id, shift_type_id)
    references public.shift_types(workspace_id, id)
);

create table public.pattern_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name)
);

create table public.pattern_template_days (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  pattern_template_id uuid not null,
  weekday integer not null check (weekday between 0 and 6),
  shift_type_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, pattern_template_id, weekday),
  foreign key (workspace_id, pattern_template_id)
    references public.pattern_templates(workspace_id, id)
    on delete cascade,
  foreign key (workspace_id, shift_type_id)
    references public.shift_types(workspace_id, id)
);

create index employees_workspace_id_idx on public.employees(workspace_id);
create unique index employees_workspace_visible_name_key
on public.employees(workspace_id, name)
where deleted_at is null;
create unique index employees_workspace_user_id_key
on public.employees(workspace_id, user_id)
where user_id is not null;
create index shift_types_workspace_id_idx on public.shift_types(workspace_id);
create index schedules_workspace_date_idx on public.schedules(workspace_id, work_date);
create index schedules_employee_date_idx on public.schedules(employee_id, work_date);
create index pattern_templates_workspace_id_idx on public.pattern_templates(workspace_id);
create index pattern_template_days_template_idx on public.pattern_template_days(pattern_template_id, weekday);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.employees enable row level security;
alter table public.shift_types enable row level security;
alter table public.schedules enable row level security;
alter table public.pattern_templates enable row level security;
alter table public.pattern_template_days enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create trigger workspace_members_set_updated_at
before update on public.workspace_members
for each row execute function public.set_updated_at();

create trigger employees_set_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

create trigger shift_types_set_updated_at
before update on public.shift_types
for each row execute function public.set_updated_at();

create trigger schedules_set_updated_at
before update on public.schedules
for each row execute function public.set_updated_at();

create trigger pattern_templates_set_updated_at
before update on public.pattern_templates
for each row execute function public.set_updated_at();

create trigger pattern_template_days_set_updated_at
before update on public.pattern_template_days
for each row execute function public.set_updated_at();

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

create or replace function public.approve_workspace_member(
  target_workspace_id uuid,
  target_user_id uuid,
  target_employee_id uuid
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

  if target_employee_id is null then
    raise exception 'Employee link required';
  end if;

  if not exists (
    select 1
    from public.employees
    where workspace_id = target_workspace_id
      and id = target_employee_id
      and deleted_at is null
  ) then
    raise exception 'Employee not found';
  end if;

  update public.workspace_members
  set role = 'USER'
  where workspace_id = target_workspace_id
    and user_id = target_user_id
    and role = 'PENDING';

  update public.employees
  set user_id = target_user_id
  where workspace_id = target_workspace_id
    and id = target_employee_id;
end;
$$;

grant execute on function public.approve_workspace_member(uuid, uuid, uuid) to authenticated;

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

create policy "members can read their workspaces"
on public.workspaces for select
using (public.is_workspace_participant(id));

create policy "admins can update workspaces"
on public.workspaces for update
using (public.is_workspace_admin(id))
with check (public.is_workspace_admin(id));

create policy "owners can delete workspaces"
on public.workspaces for delete
using (owner_id = auth.uid());

create policy "members can read workspace members"
on public.workspace_members for select
using (public.is_workspace_admin(workspace_id) or user_id = auth.uid());

create policy "admins can manage workspace members"
on public.workspace_members for all
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "members can read employees"
on public.employees for select
using (
  public.is_workspace_admin(workspace_id)
  or user_id = auth.uid()
);

create policy "admins can manage employees"
on public.employees for all
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "members can read shift types"
on public.shift_types for select
using (public.is_workspace_member(workspace_id));

create policy "admins can manage shift types"
on public.shift_types for all
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "members can read schedules"
on public.schedules for select
using (
  public.is_workspace_admin(workspace_id)
  or exists (
    select 1
    from public.employees
    where employees.workspace_id = schedules.workspace_id
      and employees.id = schedules.employee_id
      and employees.user_id = auth.uid()
  )
);

create policy "admins can manage schedules"
on public.schedules for all
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "members can read pattern templates"
on public.pattern_templates for select
using (public.is_workspace_member(workspace_id));

create policy "admins can manage pattern templates"
on public.pattern_templates for all
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "members can read pattern days"
on public.pattern_template_days for select
using (public.is_workspace_member(workspace_id));

create policy "admins can manage pattern days"
on public.pattern_template_days for all
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));
