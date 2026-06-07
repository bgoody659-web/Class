-- CLASS Update 17 operational improvements

alter table public.stock_products
  add column if not exists icon text not null default '📦',
  add column if not exists ideal_stock integer not null default 0 check (ideal_stock >= 0);

alter table public.tasks
  add column if not exists status text not null default 'todo' check (status in ('todo','in_progress','completed'));

update public.tasks set status = case when completed then 'completed' else 'todo' end where status is null or status = 'todo';

create table if not exists public.daily_checklists (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  reset_time time not null,
  business_days integer[] not null default array[1,2,3,4,5],
  active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (array_length(business_days, 1) between 1 and 7),
  unique (store_id, name)
);

create table if not exists public.daily_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.daily_checklists(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_checklist_runs (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.daily_checklists(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  run_date date not null,
  created_at timestamptz not null default now(),
  unique (checklist_id, run_date)
);

create table if not exists public.daily_checklist_run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.daily_checklist_runs(id) on delete cascade,
  template_item_id uuid references public.daily_checklist_items(id) on delete set null,
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_daily_checklists_store on public.daily_checklists(store_id, active);
create index if not exists idx_daily_checklist_items_checklist on public.daily_checklist_items(checklist_id, position);
create index if not exists idx_daily_checklist_runs_store_date on public.daily_checklist_runs(store_id, run_date);
create index if not exists idx_daily_checklist_run_items_run on public.daily_checklist_run_items(run_id);

alter table public.daily_checklists enable row level security;
alter table public.daily_checklist_items enable row level security;
alter table public.daily_checklist_runs enable row level security;
alter table public.daily_checklist_run_items enable row level security;

drop policy if exists "daily_checklists_read" on public.daily_checklists;
drop policy if exists "daily_checklists_manage" on public.daily_checklists;
drop policy if exists "daily_checklist_items_read" on public.daily_checklist_items;
drop policy if exists "daily_checklist_items_manage" on public.daily_checklist_items;
drop policy if exists "daily_checklist_runs_read" on public.daily_checklist_runs;
drop policy if exists "daily_checklist_runs_manage" on public.daily_checklist_runs;
drop policy if exists "daily_checklist_run_items_read" on public.daily_checklist_run_items;
drop policy if exists "daily_checklist_run_items_update" on public.daily_checklist_run_items;

create policy "daily_checklists_read" on public.daily_checklists for select using (public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id));
create policy "daily_checklists_manage" on public.daily_checklists for all using (public.is_store_owner(store_id) or public.is_store_manager(store_id)) with check (public.is_store_owner(store_id) or public.is_store_manager(store_id));
create policy "daily_checklist_items_read" on public.daily_checklist_items for select using (public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id));
create policy "daily_checklist_items_manage" on public.daily_checklist_items for all using (public.is_store_owner(store_id) or public.is_store_manager(store_id)) with check (public.is_store_owner(store_id) or public.is_store_manager(store_id));
create policy "daily_checklist_runs_read" on public.daily_checklist_runs for select using (public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id));
create policy "daily_checklist_runs_manage" on public.daily_checklist_runs for all using (public.is_store_owner(store_id) or public.is_store_manager(store_id)) with check (public.is_store_owner(store_id) or public.is_store_manager(store_id));
create policy "daily_checklist_run_items_read" on public.daily_checklist_run_items for select using (public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id));
create policy "daily_checklist_run_items_update" on public.daily_checklist_run_items for update using (public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id)) with check (public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id));

create or replace function public.prevent_completed_purchase_order_item_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.purchase_orders po where po.id = case when tg_op = 'DELETE' then old.purchase_order_id else new.purchase_order_id end and po.status = 'completed') then
    raise exception 'Los pedidos completados son inmutables';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_completed_purchase_order_items on public.purchase_order_items;
create trigger trg_prevent_completed_purchase_order_items before insert or update or delete on public.purchase_order_items
for each row execute function public.prevent_completed_purchase_order_item_changes();

create or replace function public.ensure_daily_checklist_runs(target_store uuid)
returns void language plpgsql security definer set search_path = public as $$
declare checklist record; run_id uuid; cycle_date date; dow integer;
begin
  for checklist in select * from public.daily_checklists where store_id = target_store and active = true loop
    cycle_date := case when localtime >= checklist.reset_time then current_date else current_date - 1 end;
    dow := extract(isodow from cycle_date)::integer;
    if dow = any(checklist.business_days) then
      insert into public.daily_checklist_runs(checklist_id, store_id, run_date)
      values(checklist.id, target_store, cycle_date)
      on conflict (checklist_id, run_date) do nothing
      returning id into run_id;

      if run_id is not null then
        insert into public.daily_checklist_run_items(run_id, template_item_id, store_id, title)
        select run_id, item.id, target_store, item.title
        from public.daily_checklist_items item
        where item.checklist_id = checklist.id
        order by item.position;
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.prevent_overlapping_daily_checklists()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.daily_checklists dc
    where dc.store_id = new.store_id
      and dc.id <> coalesce(new.id, gen_random_uuid())
      and dc.active = true
      and new.active = true
      and dc.reset_time = new.reset_time
      and dc.business_days && new.business_days
  ) then
    raise exception 'Los horarios de checklists no pueden superponerse';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_overlapping_daily_checklists on public.daily_checklists;
create trigger trg_prevent_overlapping_daily_checklists before insert or update on public.daily_checklists
for each row execute function public.prevent_overlapping_daily_checklists();
