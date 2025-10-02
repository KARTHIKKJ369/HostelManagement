-- Create system_settings table for global configuration
create table if not exists public.system_settings (
  key text primary key,
  settings_json jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_system_settings_updated_at on public.system_settings;
create trigger trg_system_settings_updated_at
before update on public.system_settings
for each row execute function public.update_updated_at();

-- Optional: simple audit log table for future system logs
create table if not exists public.audit_logs (
  id bigserial primary key,
  ts timestamp with time zone default now(),
  level text default 'INFO',
  actor_user_id bigint,
  action text,
  details jsonb
);
