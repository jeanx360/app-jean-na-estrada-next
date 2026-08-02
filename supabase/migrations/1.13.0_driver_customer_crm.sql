-- JNE App 1.13.0 - CRM privado de passageiros
-- Execute depois da migration 1.11.1_passenger_conversion.sql.

create extension if not exists pgcrypto;

create or replace function public.normalize_driver_customer_phone(value text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select regexp_replace(value, '[^0-9]', '', 'g');
$$;

create table if not exists public.driver_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  custom_name text,
  phone text not null,
  phone_normalized text not null,
  tags text[] not null default '{}'::text[],
  private_notes text,
  contact_consent boolean not null default true,
  is_archived boolean not null default false,
  first_contact_at timestamptz not null default now(),
  last_contact_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_customers_name_check
    check (
      length(trim(display_name)) between 2 and 80
      and (custom_name is null or length(trim(custom_name)) between 2 and 80)
    ),
  constraint driver_customers_phone_check
    check (phone_normalized ~ '^[0-9]{10,15}$'),
  constraint driver_customers_tags_check
    check (tags <@ array['frequent','airport','corporate','vip','long_trip']::text[]),
  constraint driver_customers_notes_check
    check (private_notes is null or length(private_notes) <= 1500),
  constraint driver_customers_contact_dates_check
    check (last_contact_at >= first_contact_at)
);

create unique index if not exists driver_customers_user_phone_unique_idx
  on public.driver_customers(user_id, phone_normalized);

create index if not exists driver_customers_user_activity_idx
  on public.driver_customers(user_id, is_archived, last_contact_at desc);

create index if not exists driver_customers_user_tags_idx
  on public.driver_customers using gin(tags);

alter table public.driver_customers enable row level security;
grant select, insert, update, delete on public.driver_customers to authenticated;

-- O CRM contém dados pessoais e permanece privado para o próprio motorista.
drop policy if exists "Drivers read own customers" on public.driver_customers;
create policy "Drivers read own customers"
on public.driver_customers
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Drivers create own customers" on public.driver_customers;
create policy "Drivers create own customers"
on public.driver_customers
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.is_professional_driver = true
      and profile.is_blocked = false
  )
);

drop policy if exists "Drivers update own customers" on public.driver_customers;
create policy "Drivers update own customers"
on public.driver_customers
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Drivers delete own customers" on public.driver_customers;
create policy "Drivers delete own customers"
on public.driver_customers
for delete
to authenticated
using (user_id = auth.uid());

alter table public.driver_reservations
  add column if not exists customer_id uuid references public.driver_customers(id) on delete set null;

create index if not exists driver_reservations_customer_date_idx
  on public.driver_reservations(customer_id, created_at desc)
  where customer_id is not null;

create or replace function public.sync_driver_customer_from_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_phone text;
  target_customer_id uuid;
  contact_time timestamptz;
  reactivate_customer boolean;
begin
  normalized_phone := public.normalize_driver_customer_phone(new.passenger_phone);

  if normalized_phone is null or length(normalized_phone) < 10 then
    new.customer_id := null;
    return new;
  end if;

  contact_time := coalesce(new.updated_at, new.created_at, now());
  reactivate_customer := tg_op = 'INSERT';

  insert into public.driver_customers as existing_customer (
    user_id,
    display_name,
    phone,
    phone_normalized,
    contact_consent,
    is_archived,
    first_contact_at,
    last_contact_at
  )
  values (
    new.driver_user_id,
    trim(new.passenger_name),
    normalized_phone,
    normalized_phone,
    coalesce(new.contact_consent, true),
    false,
    contact_time,
    contact_time
  )
  on conflict (user_id, phone_normalized)
  do update set
    display_name = excluded.display_name,
    phone = excluded.phone,
    contact_consent = excluded.contact_consent,
    last_contact_at = greatest(existing_customer.last_contact_at, excluded.last_contact_at),
    is_archived = case
      when reactivate_customer then false
      else existing_customer.is_archived
    end,
    updated_at = now()
  returning id into target_customer_id;

  new.customer_id := target_customer_id;
  return new;
end;
$$;

revoke all on function public.sync_driver_customer_from_reservation() from public, anon, authenticated;

drop trigger if exists sync_driver_customer_from_reservation_trigger on public.driver_reservations;
create trigger sync_driver_customer_from_reservation_trigger
before insert or update of driver_user_id, passenger_name, passenger_phone, contact_consent, updated_at
on public.driver_reservations
for each row execute function public.sync_driver_customer_from_reservation();

-- Migra reservas já existentes para o CRM sem perder histórico.
with grouped_customers as (
  select
    reservation.driver_user_id as user_id,
    public.normalize_driver_customer_phone(reservation.passenger_phone) as phone_normalized,
    (array_agg(trim(reservation.passenger_name) order by reservation.updated_at desc, reservation.created_at desc))[1] as display_name,
    (array_agg(public.normalize_driver_customer_phone(reservation.passenger_phone) order by reservation.updated_at desc, reservation.created_at desc))[1] as phone,
    bool_or(reservation.contact_consent) as contact_consent,
    min(reservation.created_at) as first_contact_at,
    max(reservation.updated_at) as last_contact_at
  from public.driver_reservations reservation
  where length(public.normalize_driver_customer_phone(reservation.passenger_phone)) between 10 and 15
  group by
    reservation.driver_user_id,
    public.normalize_driver_customer_phone(reservation.passenger_phone)
)
insert into public.driver_customers as existing_customer (
  user_id,
  display_name,
  phone,
  phone_normalized,
  contact_consent,
  first_contact_at,
  last_contact_at
)
select
  customer.user_id,
  customer.display_name,
  customer.phone,
  customer.phone_normalized,
  customer.contact_consent,
  customer.first_contact_at,
  customer.last_contact_at
from grouped_customers customer
on conflict (user_id, phone_normalized)
do update set
  display_name = excluded.display_name,
  phone = excluded.phone,
  contact_consent = excluded.contact_consent,
  first_contact_at = least(existing_customer.first_contact_at, excluded.first_contact_at),
  last_contact_at = greatest(existing_customer.last_contact_at, excluded.last_contact_at),
  updated_at = now();

update public.driver_reservations reservation
set customer_id = customer.id
from public.driver_customers customer
where reservation.customer_id is null
  and customer.user_id = reservation.driver_user_id
  and customer.phone_normalized = public.normalize_driver_customer_phone(reservation.passenger_phone);

create or replace function public.driver_customer_overview()
returns table (
  id uuid,
  user_id uuid,
  display_name text,
  custom_name text,
  phone text,
  phone_normalized text,
  tags text[],
  private_notes text,
  contact_consent boolean,
  is_archived boolean,
  first_contact_at timestamptz,
  last_contact_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  reservations_total bigint,
  completed_reservations bigint,
  completed_trips bigint,
  total_revenue numeric,
  last_service_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    customer.id,
    customer.user_id,
    customer.display_name,
    customer.custom_name,
    customer.phone,
    customer.phone_normalized,
    customer.tags,
    customer.private_notes,
    customer.contact_consent,
    customer.is_archived,
    customer.first_contact_at,
    customer.last_contact_at,
    customer.created_at,
    customer.updated_at,
    count(distinct reservation.id)::bigint as reservations_total,
    count(distinct reservation.id) filter (where reservation.status = 'completed')::bigint as completed_reservations,
    count(distinct trip.id) filter (where trip.status = 'completed')::bigint as completed_trips,
    coalesce(sum(trip.gross_revenue) filter (where trip.status = 'completed'), 0)::numeric as total_revenue,
    max(
      coalesce(
        (reservation.travel_date::timestamp + coalesce(reservation.travel_time, time '12:00')) at time zone 'America/Sao_Paulo',
        reservation.created_at
      )
    ) as last_service_at
  from public.driver_customers customer
  left join public.driver_reservations reservation
    on reservation.customer_id = customer.id
   and reservation.driver_user_id = customer.user_id
  left join public.driver_trips trip
    on trip.reservation_id = reservation.id
   and trip.user_id = customer.user_id
  where customer.user_id = auth.uid()
  group by
    customer.id,
    customer.user_id,
    customer.display_name,
    customer.custom_name,
    customer.phone,
    customer.phone_normalized,
    customer.tags,
    customer.private_notes,
    customer.contact_consent,
    customer.is_archived,
    customer.first_contact_at,
    customer.last_contact_at,
    customer.created_at,
    customer.updated_at
  order by customer.is_archived asc, customer.last_contact_at desc, customer.display_name asc;
$$;

revoke all on function public.driver_customer_overview() from public, anon;
grant execute on function public.driver_customer_overview() to authenticated;

drop trigger if exists driver_customers_set_updated_at on public.driver_customers;
create trigger driver_customers_set_updated_at
before update on public.driver_customers
for each row execute function public.set_updated_at();

comment on table public.driver_customers is
  'CRM privado do motorista, alimentado automaticamente pelas reservas do perfil público.';

comment on column public.driver_customers.custom_name is
  'Nome preferido definido pelo motorista; não é sobrescrito por novas reservas.';
