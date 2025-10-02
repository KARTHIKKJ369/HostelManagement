-- Fees and Payments tables for Financial Management
create table if not exists public.fees (
  fee_id bigserial primary key,
  student_id bigint not null references public.students(student_id) on delete cascade,
  amount numeric not null check (amount >= 0),
  paid_amount numeric not null default 0 check (paid_amount >= 0),
  status text not null default 'Pending' check (status in ('Pending','Partially Paid','Paid','Overdue','Cancelled')),
  due_date date,
  paid_at timestamp with time zone,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.payments (
  payment_id bigserial primary key,
  fee_id bigint not null references public.fees(fee_id) on delete cascade,
  amount numeric not null check (amount > 0),
  method text default 'UPI',
  reference text,
  paid_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- updated_at trigger for fees
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_fees_updated_at on public.fees;
create trigger trg_fees_updated_at before update on public.fees
for each row execute function public.update_updated_at();

-- Helpful indexes
create index if not exists idx_fees_student on public.fees(student_id);
create index if not exists idx_fees_status on public.fees(status);
create index if not exists idx_payments_fee on public.payments(fee_id);
create index if not exists idx_payments_paid_at on public.payments(paid_at);
