-- Add manager role and permissions
alter type public.app_role add value if not exists 'manager';

-- employees table already stores role text; we'll use 'manager' rows linked by store_id/profile_id

create or replace function public.is_store_manager(target_store uuid) returns boolean language sql stable as $$
  select exists (
    select 1 from public.employees e
    join public.profiles p on p.id = e.profile_id
    where e.store_id = target_store and e.profile_id = auth.uid() and e.active = true and p.role = 'manager'
  );
$$;

-- expand read access helpers in policies by recreating key policies

drop policy if exists "employees_owner_read" on public.employees;
create policy "employees_owner_read" on public.employees for select using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
);

drop policy if exists "employees_owner_write" on public.employees;
create policy "employees_owner_write" on public.employees for all using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
) with check (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
);

drop policy if exists "tasks_read" on public.tasks;
create policy "tasks_read" on public.tasks for select using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id)
);

drop policy if exists "tasks_owner_manage" on public.tasks;
create policy "tasks_owner_manage" on public.tasks for all using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
) with check (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
);

drop policy if exists "stock_products_owner_manage" on public.stock_products;
create policy "stock_products_owner_manage" on public.stock_products for all using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
) with check (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
);

drop policy if exists "events_owner_manage" on public.events;
create policy "events_owner_manage" on public.events for all using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
) with check (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
);

drop policy if exists "accounting_owner_read" on public.accounting_records;
create policy "accounting_owner_read" on public.accounting_records for select using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
);
