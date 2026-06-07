-- CLASS core business logic hardening: store-scoped resources, product metadata and one-store staff assignment.

alter table public.stock_products
  add column if not exists category text not null default 'General',
  alter column icon set default 'package';

alter table public.bookmarks
  alter column url set default '',
  add column if not exists type text not null default 'link' check (type in ('link','file','image','note')),
  add column if not exists content text,
  add column if not exists file_url text,
  add column if not exists image_url text,
  add column if not exists icon text not null default 'bookmark',
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.quick_access_links (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  label text not null,
  destination text not null,
  icon text not null default 'link',
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stock_products_store_category on public.stock_products(store_id, category, name);
create index if not exists idx_bookmarks_store_type on public.bookmarks(store_id, type, created_at desc);
create index if not exists idx_quick_access_store_active on public.quick_access_links(store_id, active, position, created_at desc);

-- Managers and employees belong to exactly one store. Keep the newest association if older duplicates exist.
with ranked_memberships as (
  select ctid, profile_id, row_number() over (partition by profile_id order by active desc, created_at desc) as rn
  from public.employees
  where profile_id is not null and role in ('manager','employee')
)
delete from public.employees e
using ranked_memberships r
where e.ctid = r.ctid and r.rn > 1;

create unique index if not exists idx_employees_single_store_profile on public.employees(profile_id) where profile_id is not null and role in ('manager','employee');

alter table public.quick_access_links enable row level security;

drop policy if exists "bookmarks_rw" on public.bookmarks;
drop policy if exists "bookmarks_store_read" on public.bookmarks;
drop policy if exists "bookmarks_store_insert" on public.bookmarks;
drop policy if exists "bookmarks_store_update" on public.bookmarks;
drop policy if exists "bookmarks_store_delete" on public.bookmarks;
create policy "bookmarks_store_read" on public.bookmarks for select using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id)
);
create policy "bookmarks_store_insert" on public.bookmarks for insert with check (
  created_by = auth.uid() and (public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id))
);
create policy "bookmarks_store_update" on public.bookmarks for update using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or created_by = auth.uid()
) with check (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or created_by = auth.uid()
);
create policy "bookmarks_store_delete" on public.bookmarks for delete using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or created_by = auth.uid()
);

drop policy if exists "quick_access_store_read" on public.quick_access_links;
drop policy if exists "quick_access_store_manage" on public.quick_access_links;
create policy "quick_access_store_read" on public.quick_access_links for select using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id)
);
create policy "quick_access_store_manage" on public.quick_access_links for all using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
) with check (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
);
