-- Existing DB update: connect login accounts to employees so USER accounts only see their own calendar.
-- Run this once in Supabase SQL Editor before deploying this app version.

alter table public.employees
add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists employees_workspace_user_id_key
on public.employees(workspace_id, user_id)
where user_id is not null;

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

drop policy if exists "members can read employees" on public.employees;
create policy "members can read employees"
on public.employees for select
using (
  public.is_workspace_admin(workspace_id)
  or user_id = auth.uid()
);

drop policy if exists "members can read schedules" on public.schedules;
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
