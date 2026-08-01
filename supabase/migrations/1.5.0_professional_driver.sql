-- JNE App 1.5.0 — Motorista Profissional, home personalizada e orçamentos privados
-- Execute depois da migração 1.4.1.

alter table public.profiles
  add column if not exists is_professional_driver boolean not null default false,
  add column if not exists preferred_home text not null default 'standard';

alter table public.profiles drop constraint if exists profiles_preferred_home_check;
alter table public.profiles add constraint profiles_preferred_home_check
  check (preferred_home in ('standard', 'driver'));

create or replace function public.update_driver_profile_preferences(
  new_is_professional_driver boolean,
  new_preferred_home text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_home text;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and is_blocked = true) then
    raise exception 'Esta conta está bloqueada.' using errcode = '42501';
  end if;

  safe_home := case
    when coalesce(new_is_professional_driver, false) = false then 'standard'
    when new_preferred_home in ('standard', 'driver') then new_preferred_home
    else 'driver'
  end;

  update public.profiles
  set is_professional_driver = coalesce(new_is_professional_driver, false),
      preferred_home = safe_home,
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.update_driver_profile_preferences(boolean, text) from public, anon;
grant execute on function public.update_driver_profile_preferences(boolean, text) to authenticated;

create table if not exists public.driver_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  hourly_rate numeric(12,2) not null default 50 check (hourly_rate >= 0),
  km_rate numeric(12,3) not null default 1.5 check (km_rate >= 0),
  minimum_fare numeric(12,2) not null default 100 check (minimum_fare >= 0),
  waiting_hour_rate numeric(12,2) not null default 30 check (waiting_hour_rate >= 0),
  maintenance_reserve_percent numeric(6,2) not null default 10 check (maintenance_reserve_percent between 0 and 100),
  rounding_step numeric(12,2) not null default 5 check (rounding_step >= 0),
  updated_at timestamptz not null default now()
);

alter table public.driver_settings enable row level security;
grant select, insert, update, delete on public.driver_settings to authenticated;

drop policy if exists "Drivers read own settings" on public.driver_settings;
create policy "Drivers read own settings" on public.driver_settings for select to authenticated using (user_id = auth.uid());
drop policy if exists "Drivers create own settings" on public.driver_settings;
create policy "Drivers create own settings" on public.driver_settings for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Drivers update own settings" on public.driver_settings;
create policy "Drivers update own settings" on public.driver_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Drivers delete own settings" on public.driver_settings;
create policy "Drivers delete own settings" on public.driver_settings for delete to authenticated using (user_id = auth.uid());

create table if not exists public.driver_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_name text,
  origin text,
  destination text,
  travel_date date,
  trip_type text not null check (trip_type in ('outbound','return','round_trip')),
  distance_per_leg_km numeric(12,2) not null default 0 check (distance_per_leg_km >= 0),
  duration_per_leg_minutes integer not null default 0 check (duration_per_leg_minutes >= 0),
  waiting_minutes integer not null default 0 check (waiting_minutes >= 0),
  tolls numeric(12,2) not null default 0 check (tolls >= 0),
  parking numeric(12,2) not null default 0 check (parking >= 0),
  other_costs numeric(12,2) not null default 0 check (other_costs >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  km_rate numeric(12,3) not null default 0 check (km_rate >= 0),
  hourly_rate numeric(12,2) not null default 0 check (hourly_rate >= 0),
  waiting_hour_rate numeric(12,2) not null default 0 check (waiting_hour_rate >= 0),
  minimum_fare numeric(12,2) not null default 0 check (minimum_fare >= 0),
  maintenance_reserve_percent numeric(6,2) not null default 0 check (maintenance_reserve_percent between 0 and 100),
  rounding_step numeric(12,2) not null default 0 check (rounding_step >= 0),
  total_distance_km numeric(12,2) not null default 0 check (total_distance_km >= 0),
  billable_hours numeric(12,3) not null default 0 check (billable_hours >= 0),
  distance_charge numeric(12,2) not null default 0 check (distance_charge >= 0),
  time_charge numeric(12,2) not null default 0 check (time_charge >= 0),
  waiting_charge numeric(12,2) not null default 0 check (waiting_charge >= 0),
  maintenance_reserve numeric(12,2) not null default 0 check (maintenance_reserve >= 0),
  direct_costs numeric(12,2) not null default 0 check (direct_costs >= 0),
  suggested_total numeric(12,2) not null default 0 check (suggested_total >= 0),
  rounded_total numeric(12,2) not null default 0 check (rounded_total >= 0),
  status text not null default 'draft' check (status in ('draft','sent','accepted','completed','cancelled')),
  notes text check (notes is null or length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists driver_quotes_user_created_idx on public.driver_quotes(user_id, created_at desc);
create index if not exists driver_quotes_user_status_idx on public.driver_quotes(user_id, status, created_at desc);

alter table public.driver_quotes enable row level security;
grant select, insert, update, delete on public.driver_quotes to authenticated;

drop policy if exists "Drivers read own quotes" on public.driver_quotes;
create policy "Drivers read own quotes" on public.driver_quotes for select to authenticated using (user_id = auth.uid());
drop policy if exists "Drivers create own quotes" on public.driver_quotes;
create policy "Drivers create own quotes" on public.driver_quotes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Drivers update own quotes" on public.driver_quotes;
create policy "Drivers update own quotes" on public.driver_quotes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Drivers delete own quotes" on public.driver_quotes;
create policy "Drivers delete own quotes" on public.driver_quotes for delete to authenticated using (user_id = auth.uid());

-- Os administradores não recebem uma policy de leitura geral: dados financeiros e rotas
-- permanecem privados para o próprio motorista.
