-- JNE App 1.7.2 — Integração reserva → orçamento → viagem e documentos
-- Execute depois da migração 1.7.1_driver_public_profile_reservations.sql.

alter table public.driver_trips
  add column if not exists reservation_id uuid references public.driver_reservations(id) on delete set null;

create unique index if not exists driver_trips_user_reservation_unique_idx
  on public.driver_trips(user_id, reservation_id)
  where reservation_id is not null;

create index if not exists driver_trips_reservation_idx
  on public.driver_trips(reservation_id)
  where reservation_id is not null;

create or replace function public.prepare_driver_trip_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reservation_id is not null and not exists (
    select 1
    from public.driver_reservations reservation
    where reservation.id = new.reservation_id
      and reservation.driver_user_id = new.user_id
  ) then
    raise exception 'A reserva não pertence a este motorista.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.prepare_driver_trip_reservation() from public, anon, authenticated;

drop trigger if exists prepare_driver_trip_reservation_trigger on public.driver_trips;
create trigger prepare_driver_trip_reservation_trigger
before insert or update of reservation_id, user_id on public.driver_trips
for each row execute function public.prepare_driver_trip_reservation();

create or replace function public.sync_driver_reservation_from_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_status text;
  quote_status text;
begin
  if new.status = 'completed' then
    reservation_status := 'completed';
    quote_status := 'completed';
  elsif new.status = 'cancelled' then
    reservation_status := 'cancelled';
    quote_status := 'cancelled';
  else
    reservation_status := 'confirmed';
    quote_status := 'accepted';
  end if;

  if new.reservation_id is not null then
    update public.driver_reservations
    set status = reservation_status,
        updated_at = now()
    where id = new.reservation_id
      and driver_user_id = new.user_id;
  end if;

  if new.quote_id is not null then
    update public.driver_quotes
    set status = quote_status,
        updated_at = now()
    where id = new.quote_id
      and user_id = new.user_id;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_driver_reservation_from_trip() from public, anon, authenticated;

drop trigger if exists sync_driver_reservation_from_trip_trigger on public.driver_trips;
create trigger sync_driver_reservation_from_trip_trigger
after insert or update of status, reservation_id, quote_id on public.driver_trips
for each row execute function public.sync_driver_reservation_from_trip();

-- Vincula viagens antigas às reservas quando ambas já usam o mesmo orçamento.
update public.driver_trips trip
set reservation_id = reservation.id
from public.driver_reservations reservation
where trip.reservation_id is null
  and trip.quote_id is not null
  and reservation.quote_id = trip.quote_id
  and reservation.driver_user_id = trip.user_id
  and not exists (
    select 1 from public.driver_trips existing
    where existing.user_id = trip.user_id
      and existing.reservation_id = reservation.id
      and existing.id <> trip.id
  );
