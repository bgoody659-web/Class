-- CLASS Update 18: professional icon identifiers and task visibility/permissions

alter table public.stock_products alter column icon set default 'package';
update public.stock_products set icon = case
  when icon in ('🍷','🥤','🍺') then 'cup-soda'
  when icon = '☕' then 'coffee'
  when icon in ('🍔','🍟') then 'food'
  when icon = '🍞' then 'bakery'
  when icon in ('🥛','🧀') then 'milk'
  when icon in ('🧴','🧽') then 'cleaning'
  when icon = '👕' then 'clothing'
  when icon = '💧' then 'water'
  when icon = '🥬' then 'produce'
  when icon = '🍖' then 'meat'
  else coalesce(nullif(icon, ''), 'package')
end;

alter table public.tasks enable row level security;

drop policy if exists "tasks_employee_insert_store" on public.tasks;
drop policy if exists "tasks_store_update_status" on public.tasks;

create policy "tasks_employee_insert_store" on public.tasks for insert with check (
  created_by = auth.uid()
  and (public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id))
);

create policy "tasks_store_update_status" on public.tasks for update using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id)
) with check (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id)
);
