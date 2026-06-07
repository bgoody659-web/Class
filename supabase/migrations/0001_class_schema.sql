create extension if not exists "pgcrypto";

create type public.app_role as enum ('owner','employee');
create type public.movement_type as enum ('sale','incoming_stock','adjustment');
create type public.accounting_type as enum ('sale','expense','stock_entry');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role public.app_role not null default 'employee',
  created_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  address text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text not null,
  role text not null default 'employee',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_id, email)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null,
  description text,
  completed boolean not null default false,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.stock_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  description text,
  quantity integer not null default 0 check (quantity >= 0),
  purchase_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  low_stock_alert integer not null default 5,
  created_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.stock_products(id) on delete cascade,
  employee_id uuid references public.profiles(id) on delete set null,
  type public.movement_type not null,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create table public.accounting_records (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid references public.stock_products(id) on delete set null,
  employee_id uuid references public.profiles(id) on delete set null,
  type public.accounting_type not null,
  quantity integer not null default 0,
  purchase_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  profit numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null,
  description text,
  date timestamptz not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null,
  url text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);

create function public.is_store_owner(target_store uuid) returns boolean language sql stable as $$
  select exists (select 1 from public.stores s where s.id = target_store and s.owner_id = auth.uid());
$$;
create function public.is_store_employee(target_store uuid) returns boolean language sql stable as $$
  select exists (select 1 from public.employees e where e.store_id = target_store and e.profile_id = auth.uid() and e.active = true);
$$;

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.employees enable row level security;
alter table public.tasks enable row level security;
alter table public.stock_products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.accounting_records enable row level security;
alter table public.events enable row level security;
alter table public.bookmarks enable row level security;
alter table public.activity_logs enable row level security;

create policy "profiles_select_self" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_self" on public.profiles for update using (id = auth.uid());
create policy "stores_owner_all" on public.stores for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "employees_read" on public.employees for select using (public.is_store_owner(store_id) or public.is_store_employee(store_id));
create policy "employees_owner_write" on public.employees for all using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

create policy "tasks_read" on public.tasks for select using (public.is_store_owner(store_id) or public.is_store_employee(store_id));
create policy "tasks_owner_write" on public.tasks for all using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));
create policy "tasks_employee_update_self" on public.tasks for update using (assigned_to = auth.uid() and public.is_store_employee(store_id));

create policy "stock_products_read" on public.stock_products for select using (public.is_store_owner(store_id) or public.is_store_employee(store_id));
create policy "stock_products_owner_write" on public.stock_products for all using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));
create policy "stock_products_employee_update" on public.stock_products for update using (public.is_store_employee(store_id));

create policy "stock_movements_rw" on public.stock_movements for all using (public.is_store_owner(store_id) or public.is_store_employee(store_id)) with check (public.is_store_owner(store_id) or public.is_store_employee(store_id));
create policy "accounting_owner_read" on public.accounting_records for select using (public.is_store_owner(store_id));
create policy "events_read" on public.events for select using (public.is_store_owner(store_id) or public.is_store_employee(store_id));
create policy "events_owner_write" on public.events for all using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));
create policy "bookmarks_rw" on public.bookmarks for all using (public.is_store_owner(store_id) or public.is_store_employee(store_id)) with check (public.is_store_owner(store_id) or public.is_store_employee(store_id));
create policy "activity_rw" on public.activity_logs for all using (public.is_store_owner(store_id) or public.is_store_employee(store_id)) with check (public.is_store_owner(store_id) or public.is_store_employee(store_id));

create function public.handle_stock_movement() returns trigger language plpgsql security definer as $$
declare product public.stock_products;
begin
  select * into product from public.stock_products where id = new.product_id and store_id = new.store_id for update;
  if product.id is null then raise exception 'Producto no encontrado'; end if;
  if new.type = 'sale' then
    if product.quantity < new.quantity then raise exception 'Stock insuficiente'; end if;
    update public.stock_products set quantity = quantity - new.quantity where id = new.product_id;
    insert into public.accounting_records(store_id, product_id, employee_id, type, quantity, purchase_price, sale_price, profit)
    values(new.store_id, new.product_id, new.employee_id, 'sale', new.quantity, product.purchase_price, product.sale_price, (product.sale_price - product.purchase_price) * new.quantity);
  elsif new.type = 'incoming_stock' then
    update public.stock_products set quantity = quantity + new.quantity where id = new.product_id;
    insert into public.accounting_records(store_id, product_id, employee_id, type, quantity, purchase_price, sale_price, profit)
    values(new.store_id, new.product_id, new.employee_id, 'stock_entry', new.quantity, product.purchase_price, product.sale_price, 0);
  else
    update public.stock_products set quantity = greatest(0, quantity + new.quantity) where id = new.product_id;
  end if;
  insert into public.activity_logs(store_id, profile_id, action, entity_type, entity_id)
  values(new.store_id, new.employee_id, 'stock_movement_' || new.type::text, 'stock_movements', new.id);
  return new;
end;
$$;

create trigger trg_stock_movement after insert on public.stock_movements
for each row execute function public.handle_stock_movement();
