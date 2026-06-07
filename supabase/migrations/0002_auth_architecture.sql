-- Auth + tenancy hardening for email/password flow

-- 1) Keep profile in sync with auth.users on signup
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'employee')
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- 2) Profiles policies: allow self bootstrap/update, keep role safe
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_service_role_all" on public.profiles;

create policy "profiles_select_self"
on public.profiles
for select
using (id = auth.uid());

create policy "profiles_insert_self"
on public.profiles
for insert
with check (id = auth.uid());

create policy "profiles_update_self"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

create policy "profiles_service_role_all"
on public.profiles
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- 3) Stores: owner can own many stores, employee cannot create/manage stores
alter table public.stores enable row level security;

drop policy if exists "stores_owner_all" on public.stores;
drop policy if exists "stores_employee_read" on public.stores;

create policy "stores_owner_all"
on public.stores
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "stores_employee_read"
on public.stores
for select
using (
  exists (
    select 1 from public.employees e
    where e.store_id = stores.id
      and e.profile_id = auth.uid()
      and e.active = true
  )
);

-- 4) Employees: owners manage; employee can only read own membership row
alter table public.employees enable row level security;

drop policy if exists "employees_read" on public.employees;
drop policy if exists "employees_owner_write" on public.employees;
drop policy if exists "employees_self_read" on public.employees;

create policy "employees_owner_read"
on public.employees
for select
using (public.is_store_owner(store_id));

create policy "employees_owner_write"
on public.employees
for all
using (public.is_store_owner(store_id))
with check (public.is_store_owner(store_id));

create policy "employees_self_read"
on public.employees
for select
using (profile_id = auth.uid());

-- 5) Tasks permissions
alter table public.tasks enable row level security;

drop policy if exists "tasks_read" on public.tasks;
drop policy if exists "tasks_owner_write" on public.tasks;
drop policy if exists "tasks_employee_update_self" on public.tasks;
drop policy if exists "tasks_employee_insert" on public.tasks;

create policy "tasks_read"
on public.tasks
for select
using (public.is_store_owner(store_id) or public.is_store_employee(store_id));

create policy "tasks_owner_manage"
on public.tasks
for all
using (public.is_store_owner(store_id))
with check (public.is_store_owner(store_id));

create policy "tasks_employee_update_assigned"
on public.tasks
for update
using (assigned_to = auth.uid() and public.is_store_employee(store_id))
with check (assigned_to = auth.uid() and public.is_store_employee(store_id));

-- 6) Stock products/movements/accounting
alter table public.stock_products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.accounting_records enable row level security;

drop policy if exists "stock_products_read" on public.stock_products;
drop policy if exists "stock_products_owner_write" on public.stock_products;
drop policy if exists "stock_products_employee_update" on public.stock_products;
drop policy if exists "stock_movements_rw" on public.stock_movements;
drop policy if exists "accounting_owner_read" on public.accounting_records;

create policy "stock_products_read"
on public.stock_products
for select
using (public.is_store_owner(store_id) or public.is_store_employee(store_id));

create policy "stock_products_owner_manage"
on public.stock_products
for all
using (public.is_store_owner(store_id))
with check (public.is_store_owner(store_id));

create policy "stock_products_employee_update"
on public.stock_products
for update
using (public.is_store_employee(store_id))
with check (public.is_store_employee(store_id));

create policy "stock_movements_owner_or_employee"
on public.stock_movements
for all
using (public.is_store_owner(store_id) or public.is_store_employee(store_id))
with check (public.is_store_owner(store_id) or public.is_store_employee(store_id));

create policy "accounting_owner_read"
on public.accounting_records
for select
using (public.is_store_owner(store_id));

-- 7) Events / bookmarks / activity logs
alter table public.events enable row level security;
alter table public.bookmarks enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists "events_read" on public.events;
drop policy if exists "events_owner_write" on public.events;
drop policy if exists "bookmarks_rw" on public.bookmarks;
drop policy if exists "activity_rw" on public.activity_logs;

create policy "events_read"
on public.events
for select
using (public.is_store_owner(store_id) or public.is_store_employee(store_id));

create policy "events_owner_manage"
on public.events
for all
using (public.is_store_owner(store_id))
with check (public.is_store_owner(store_id));

create policy "bookmarks_owner_or_employee"
on public.bookmarks
for all
using (public.is_store_owner(store_id) or public.is_store_employee(store_id))
with check (public.is_store_owner(store_id) or public.is_store_employee(store_id));

create policy "activity_owner_or_employee"
on public.activity_logs
for select
using (public.is_store_owner(store_id) or public.is_store_employee(store_id));

create policy "activity_insert_owner_or_employee"
on public.activity_logs
for insert
with check (public.is_store_owner(store_id) or public.is_store_employee(store_id));

-- 8) Helpful indexes for auth/role lookups
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_employees_profile_active on public.employees(profile_id, active);
create index if not exists idx_stores_owner_id on public.stores(owner_id);
