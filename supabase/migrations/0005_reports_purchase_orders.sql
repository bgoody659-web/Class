-- Reports and purchase orders for store-scoped CLASS operations

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text,
  category text not null default 'other' check (category in ('equipment_damage','missing_stock','cash_register_issue','customer_complaint','cleaning_maintenance','supplier_issue','other')),
  status text not null default 'pending' check (status in ('pending','in_review','resolved')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  title text not null,
  order_type text not null default 'weekly' check (order_type in ('daily','weekly','monthly','special_event','emergency_restock')),
  status text not null default 'draft' check (status in ('draft','pending_review','approved','sent_to_supplier','completed','cancelled')),
  supplier_name text,
  supplier_notes text,
  internal_notes text,
  approved_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid references public.stock_products(id) on delete set null,
  category text not null default 'other' check (category in ('beverages','fruits_vegetables','cleaning','meat','bakery','dairy','dry_goods','other')),
  product_name text not null,
  quantity_requested integer not null default 1 check (quantity_requested > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_reports_store_status on public.reports(store_id, status, created_at desc);
create index if not exists idx_reports_store_priority on public.reports(store_id, priority);
create index if not exists idx_purchase_orders_store_status on public.purchase_orders(store_id, status, created_at desc);
create index if not exists idx_purchase_order_items_order on public.purchase_order_items(purchase_order_id, category);
create index if not exists idx_purchase_order_items_store on public.purchase_order_items(store_id);

alter table public.reports enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

drop policy if exists "reports_store_read" on public.reports;
drop policy if exists "reports_store_insert" on public.reports;
drop policy if exists "reports_status_manage" on public.reports;
drop policy if exists "reports_owner_delete" on public.reports;

create policy "reports_store_read" on public.reports for select using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id)
);
create policy "reports_store_insert" on public.reports for insert with check (
  created_by = auth.uid() and (public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id))
);
create policy "reports_status_manage" on public.reports for update using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
) with check (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
);
create policy "reports_owner_delete" on public.reports for delete using (public.is_store_owner(store_id));

drop policy if exists "purchase_orders_store_read" on public.purchase_orders;
drop policy if exists "purchase_orders_store_insert" on public.purchase_orders;
drop policy if exists "purchase_orders_manager_update" on public.purchase_orders;
drop policy if exists "purchase_orders_owner_delete" on public.purchase_orders;

create policy "purchase_orders_store_read" on public.purchase_orders for select using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id)
);
create policy "purchase_orders_store_insert" on public.purchase_orders for insert with check (
  created_by = auth.uid() and (public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id))
);
create policy "purchase_orders_manager_update" on public.purchase_orders for update using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or created_by = auth.uid()
) with check (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or created_by = auth.uid()
);
create policy "purchase_orders_owner_delete" on public.purchase_orders for delete using (public.is_store_owner(store_id));

drop policy if exists "purchase_order_items_store_read" on public.purchase_order_items;
drop policy if exists "purchase_order_items_store_insert" on public.purchase_order_items;
drop policy if exists "purchase_order_items_manager_update" on public.purchase_order_items;
drop policy if exists "purchase_order_items_owner_delete" on public.purchase_order_items;

create policy "purchase_order_items_store_read" on public.purchase_order_items for select using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id)
);
create policy "purchase_order_items_store_insert" on public.purchase_order_items for insert with check (
  exists (
    select 1 from public.purchase_orders po
    where po.id = purchase_order_id
      and po.store_id = purchase_order_items.store_id
      and (public.is_store_owner(po.store_id) or public.is_store_manager(po.store_id) or public.is_store_employee(po.store_id))
  )
);
create policy "purchase_order_items_manager_update" on public.purchase_order_items for update using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
) with check (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
);
create policy "purchase_order_items_owner_delete" on public.purchase_order_items for delete using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
);
