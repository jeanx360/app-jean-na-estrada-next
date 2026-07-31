-- JNE App 1.6.0 — Controle financeiro privado do motorista profissional
-- Execute depois da migração 1.5.0.

create table if not exists public.driver_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quote_id uuid references public.driver_quotes(id) on delete set null,
  customer_name text,
  origin text,
  destination text,
  travel_date date,
  distance_km numeric(12,2) not null default 0 check (distance_km >= 0),
  worked_minutes integer not null default 0 check (worked_minutes >= 0),
  agreed_amount numeric(12,2) not null default 0 check (agreed_amount >= 0),
  gross_revenue numeric(12,2) not null default 0 check (gross_revenue >= 0),
  total_expenses numeric(12,2) not null default 0 check (total_expenses >= 0),
  net_result numeric(12,2) not null default 0,
  pending_amount numeric(12,2) not null default 0 check (pending_amount >= 0),
  status text not null default 'planned' check (status in ('planned','completed','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid')),
  notes text check (notes is null or length(notes) <= 800),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists driver_trips_user_quote_unique_idx
  on public.driver_trips(user_id, quote_id)
  where quote_id is not null;
create index if not exists driver_trips_user_date_idx
  on public.driver_trips(user_id, travel_date desc, created_at desc);
create index if not exists driver_trips_user_status_idx
  on public.driver_trips(user_id, status, payment_status);

alter table public.driver_trips enable row level security;
grant select, insert, update, delete on public.driver_trips to authenticated;

drop policy if exists "Drivers read own trips" on public.driver_trips;
create policy "Drivers read own trips" on public.driver_trips
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Drivers create own trips" on public.driver_trips;
create policy "Drivers create own trips" on public.driver_trips
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Drivers update own trips" on public.driver_trips;
create policy "Drivers update own trips" on public.driver_trips
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Drivers delete own trips" on public.driver_trips;
create policy "Drivers delete own trips" on public.driver_trips
  for delete to authenticated using (user_id = auth.uid());

create table if not exists public.driver_financial_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.driver_trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_type text not null check (entry_type in ('income','expense')),
  category text not null check (category in (
    'payment','deposit','tip','other_income',
    'toll','fuel_or_charge','parking','food','lodging','washing','maintenance','commission','other_expense'
  )),
  amount numeric(12,2) not null check (amount > 0),
  payment_method text check (payment_method is null or payment_method in ('pix','cash','card','transfer','other')),
  occurred_at timestamptz not null default now(),
  description text check (description is null or length(description) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists driver_entries_trip_date_idx
  on public.driver_financial_entries(trip_id, occurred_at desc);
create index if not exists driver_entries_user_date_idx
  on public.driver_financial_entries(user_id, occurred_at desc);

alter table public.driver_financial_entries enable row level security;
grant select, insert, update, delete on public.driver_financial_entries to authenticated;

drop policy if exists "Drivers read own financial entries" on public.driver_financial_entries;
create policy "Drivers read own financial entries" on public.driver_financial_entries
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Drivers create own financial entries" on public.driver_financial_entries;
create policy "Drivers create own financial entries" on public.driver_financial_entries
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.driver_trips trip
      where trip.id = trip_id and trip.user_id = auth.uid()
    )
  );
drop policy if exists "Drivers update own financial entries" on public.driver_financial_entries;
create policy "Drivers update own financial entries" on public.driver_financial_entries
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Drivers delete own financial entries" on public.driver_financial_entries;
create policy "Drivers delete own financial entries" on public.driver_financial_entries
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.prepare_driver_financial_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  trip_owner uuid;
begin
  select user_id into trip_owner from public.driver_trips where id = new.trip_id;
  if trip_owner is null then
    raise exception 'Viagem não encontrada.';
  end if;
  if auth.uid() is not null and trip_owner <> auth.uid() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  new.user_id := trip_owner;
  return new;
end;
$$;

create or replace function public.refresh_driver_trip_financials(target_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  income_total numeric(12,2);
  expense_total numeric(12,2);
  agreed numeric(12,2);
begin
  select
    coalesce(sum(amount) filter (where entry_type = 'income'), 0),
    coalesce(sum(amount) filter (where entry_type = 'expense'), 0)
  into income_total, expense_total
  from public.driver_financial_entries
  where trip_id = target_trip_id;

  select agreed_amount into agreed from public.driver_trips where id = target_trip_id;
  if agreed is null then return; end if;

  update public.driver_trips
  set gross_revenue = income_total,
      total_expenses = expense_total,
      net_result = income_total - expense_total,
      pending_amount = greatest(agreed - income_total, 0),
      payment_status = case
        when income_total <= 0 then 'unpaid'
        when agreed > 0 and income_total < agreed then 'partial'
        else 'paid'
      end,
      updated_at = now()
  where id = target_trip_id;
end;
$$;

revoke all on function public.prepare_driver_financial_entry() from public, anon, authenticated;
revoke all on function public.refresh_driver_trip_financials(uuid) from public, anon, authenticated;

create or replace function public.driver_financial_entry_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_trip_id uuid;
begin
  target_trip_id := case when tg_op = 'DELETE' then old.trip_id else new.trip_id end;
  perform public.refresh_driver_trip_financials(target_trip_id);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.driver_financial_entry_after_change() from public, anon, authenticated;

drop trigger if exists prepare_driver_financial_entry_trigger on public.driver_financial_entries;
create trigger prepare_driver_financial_entry_trigger
  before insert or update on public.driver_financial_entries
  for each row execute function public.prepare_driver_financial_entry();

drop trigger if exists refresh_driver_trip_after_entry_trigger on public.driver_financial_entries;
create trigger refresh_driver_trip_after_entry_trigger
  after insert or update or delete on public.driver_financial_entries
  for each row execute function public.driver_financial_entry_after_change();

-- Os dados continuam privados. Nem administradores recebem leitura geral por padrão.
