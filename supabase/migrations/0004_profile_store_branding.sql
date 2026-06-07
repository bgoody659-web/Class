-- Profile and store branding metadata used by the production workspace UI.
alter table public.profiles add column if not exists avatar_url text;
alter table public.stores add column if not exists logo_url text;

-- Store branding remains tenant-scoped by existing store owner/manager policies.
