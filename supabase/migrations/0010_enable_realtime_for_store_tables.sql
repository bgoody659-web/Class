-- CLASS realtime: publish store-scoped operational tables so every workspace refreshes for all users.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'stores',
    'employees',
    'tasks',
    'stock_products',
    'stock_movements',
    'accounting_records',
    'events',
    'reports',
    'purchase_orders',
    'purchase_order_items',
    'bookmarks',
    'quick_access_links',
    'daily_checklists',
    'daily_checklist_run_items',
    'employee_schedules',
    'employee_schedule_requests'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $$;
