-- Scheduled Maintenance table for planning maintenance activities
create table if not exists public.maintenance_schedules (
  schedule_id bigserial primary key,
  title text not null,
  description text,
  category text not null check (category in ('Electricity','Plumbing','Cleaning','Other')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  scheduled_for timestamp with time zone not null,
  hostel_id bigint references public.hostels(hostel_id) on delete set null,
  room_id bigint references public.rooms(room_id) on delete set null,
  assigned_to text,
  status text not null default 'Planned' check (status in ('Planned','Scheduled','Completed','Cancelled')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_maintenance_schedules_updated_at on public.maintenance_schedules;
create trigger trg_maintenance_schedules_updated_at before update on public.maintenance_schedules
for each row execute function public.update_updated_at();

-- indexes
create index if not exists idx_maintenance_schedules_when on public.maintenance_schedules(scheduled_for);
create index if not exists idx_maintenance_schedules_hostel on public.maintenance_schedules(hostel_id);
create index if not exists idx_maintenance_schedules_room on public.maintenance_schedules(room_id);