-- CLASS: fix role-store association permissions and expose current stock ideal architecture.

alter table public.stock_products
  add column if not exists ideal_stock integer not null default 0 check (ideal_stock >= 0),
  add column if not exists category text not null default 'General',
  alter column icon set default 'package';

-- Managers and employees must have exactly one operational store membership.
with ranked_memberships as (
  select ctid, profile_id, row_number() over (partition by profile_id order by active desc, created_at desc) as rn
  from public.employees
  where profile_id is not null and role in ('manager','employee')
)
delete from public.employees e using ranked_memberships r where e.ctid = r.ctid and r.rn > 1;

create unique index if not exists idx_employees_single_store_profile on public.employees(profile_id) where profile_id is not null and role in ('manager','employee');

-- Re-assert store-scoped operational access for the three roles.
drop policy if exists "stock_products_store_read_all_roles" on public.stock_products;
create policy "stock_products_store_read_all_roles" on public.stock_products for select using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id)
);

drop policy if exists "stock_products_owner_manager_manage" on public.stock_products;
create policy "stock_products_owner_manager_manage" on public.stock_products for all using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
) with check (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
);

drop policy if exists "stock_movements_store_insert_all_roles" on public.stock_movements;
create policy "stock_movements_store_insert_all_roles" on public.stock_movements for insert with check (
  employee_id = auth.uid() and (public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id))
);

drop policy if exists "stock_movements_store_read_owner_manager" on public.stock_movements;
create policy "stock_movements_store_read_owner_manager" on public.stock_movements for select using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
);

drop policy if exists "tasks_store_insert_all_roles" on public.tasks;
create policy "tasks_store_insert_all_roles" on public.tasks for insert with check (
  created_by = auth.uid() and (public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id))
);

drop policy if exists "tasks_store_update_all_roles" on public.tasks;
create policy "tasks_store_update_all_roles" on public.tasks for update using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id)
) with check (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id)
);

-- Managers can administer employees in their assigned store; owners remain covered by existing policies.
drop policy if exists "employees_owner_manager_manage" on public.employees;
create policy "employees_owner_manager_manage" on public.employees for all using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
) with check (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
);
