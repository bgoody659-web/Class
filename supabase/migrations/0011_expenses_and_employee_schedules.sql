-- CLASS: daily expenses and employee scheduling workflow.

alter table public.accounting_records
  add column if not exists description text;

create table if not exists public.employee_schedules (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  shift_name text not null default 'Turno',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.employee_schedule_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null default 'day_off' check (request_type in ('day_off','shift_change','shift_swap','vacation')),
  requested_date date,
  title text not null,
  details text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_employee_schedules_store_shift on public.employee_schedules(store_id, shift_name, starts_at);
create index if not exists idx_employee_schedules_profile on public.employee_schedules(profile_id, starts_at);
create index if not exists idx_schedule_requests_store_status on public.employee_schedule_requests(store_id, status, created_at desc);
create index if not exists idx_schedule_requests_profile on public.employee_schedule_requests(profile_id, created_at desc);

alter table public.employee_schedules enable row level security;
alter table public.employee_schedule_requests enable row level security;

drop policy if exists "accounting_expenses_insert_owner_manager" on public.accounting_records;
create policy "accounting_expenses_insert_owner_manager" on public.accounting_records for insert with check (
  type = 'expense' and employee_id = auth.uid() and (public.is_store_owner(store_id) or public.is_store_manager(store_id))
);

drop policy if exists "employee_schedules_read_store" on public.employee_schedules;
drop policy if exists "employee_schedules_manage_owner_manager" on public.employee_schedules;
create policy "employee_schedules_read_store" on public.employee_schedules for select using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id)
);
create policy "employee_schedules_manage_owner_manager" on public.employee_schedules for all using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
) with check (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
);

drop policy if exists "schedule_requests_read_store" on public.employee_schedule_requests;
drop policy if exists "schedule_requests_insert_self" on public.employee_schedule_requests;
drop policy if exists "schedule_requests_manage_owner_manager" on public.employee_schedule_requests;
create policy "schedule_requests_read_store" on public.employee_schedule_requests for select using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id) or profile_id = auth.uid()
);
create policy "schedule_requests_insert_self" on public.employee_schedule_requests for insert with check (
  profile_id = auth.uid() and (public.is_store_owner(store_id) or public.is_store_manager(store_id) or public.is_store_employee(store_id))
);
create policy "schedule_requests_manage_owner_manager" on public.employee_schedule_requests for update using (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
) with check (
  public.is_store_owner(store_id) or public.is_store_manager(store_id)
);
