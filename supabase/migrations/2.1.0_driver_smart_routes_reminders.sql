-- JNE App 2.1.0 - rotas inteligentes, retorno, espera e lembretes.
-- Migration idempotente para bancos existentes.

alter table public.driver_service_packages
  add column if not exists origin_label text,
  add column if not exists origin_place_id text,
  add column if not exists origin_latitude double precision,
  add column if not exists origin_longitude double precision,
  add column if not exists destination_label text,
  add column if not exists destination_place_id text,
  add column if not exists destination_latitude double precision,
  add column if not exists destination_longitude double precision,
  add column if not exists route_distance_meters integer,
  add column if not exists route_duration_seconds integer,
  add column if not exists default_wait_minutes integer not null default 0,
  add column if not exists allows_return boolean not null default true;

alter table public.driver_service_packages
  drop constraint if exists driver_service_packages_route_coordinates_check,
  drop constraint if exists driver_service_packages_route_metrics_check,
  drop constraint if exists driver_service_packages_default_wait_check,
  drop constraint if exists driver_service_packages_route_labels_check;

alter table public.driver_service_packages
  add constraint driver_service_packages_route_coordinates_check check (
    (origin_latitude is null or origin_latitude between -90 and 90)
    and (origin_longitude is null or origin_longitude between -180 and 180)
    and (destination_latitude is null or destination_latitude between -90 and 90)
    and (destination_longitude is null or destination_longitude between -180 and 180)
  ),
  add constraint driver_service_packages_route_metrics_check check (
    (route_distance_meters is null or route_distance_meters between 1 and 5000000)
    and (route_duration_seconds is null or route_duration_seconds between 60 and 604800)
  ),
  add constraint driver_service_packages_default_wait_check check (
    default_wait_minutes between 0 and 1440
  ),
  add constraint driver_service_packages_route_labels_check check (
    (origin_label is null or length(origin_label) <= 180)
    and (destination_label is null or length(destination_label) <= 180)
    and (origin_place_id is null or length(origin_place_id) <= 255)
    and (destination_place_id is null or length(destination_place_id) <= 255)
  );

alter table public.driver_reservations
  add column if not exists passenger_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists origin_place_id text,
  add column if not exists origin_latitude double precision,
  add column if not exists origin_longitude double precision,
  add column if not exists destination_place_id text,
  add column if not exists destination_latitude double precision,
  add column if not exists destination_longitude double precision,
  add column if not exists route_distance_meters integer,
  add column if not exists route_duration_seconds integer,
  add column if not exists has_return boolean not null default false,
  add column if not exists return_date date,
  add column if not exists return_time time,
  add column if not exists wait_at_destination boolean not null default false,
  add column if not exists wait_minutes integer not null default 0;

alter table public.driver_reservations
  drop constraint if exists driver_reservations_route_coordinates_check,
  drop constraint if exists driver_reservations_route_metrics_check,
  drop constraint if exists driver_reservations_return_check,
  drop constraint if exists driver_reservations_wait_check;

alter table public.driver_reservations
  add constraint driver_reservations_route_coordinates_check check (
    (origin_latitude is null or origin_latitude between -90 and 90)
    and (origin_longitude is null or origin_longitude between -180 and 180)
    and (destination_latitude is null or destination_latitude between -90 and 90)
    and (destination_longitude is null or destination_longitude between -180 and 180)
  ),
  add constraint driver_reservations_route_metrics_check check (
    (route_distance_meters is null or route_distance_meters between 1 and 5000000)
    and (route_duration_seconds is null or route_duration_seconds between 60 and 604800)
  ),
  add constraint driver_reservations_return_check check (
    (
      has_return = false
      and return_date is null
      and return_time is null
    )
    or
    (
      has_return = true
      and return_date is not null
      and (
        travel_date is null
        or return_date > travel_date
        or (
          return_date = travel_date
          and (
            travel_time is null
            or return_time is null
            or return_time > travel_time
          )
        )
      )
    )
  ),
  add constraint driver_reservations_wait_check check (
    wait_minutes between 0 and 1440
    and (wait_at_destination = true or wait_minutes = 0)
  );

create index if not exists driver_service_packages_user_route_idx
  on public.driver_service_packages(user_id, is_active, origin_label, destination_label);

create index if not exists driver_reservations_passenger_user_idx
  on public.driver_reservations(passenger_user_id, created_at desc)
  where passenger_user_id is not null;

create index if not exists driver_reservations_driver_return_schedule_idx
  on public.driver_reservations(driver_user_id, return_date, return_time, status)
  where has_return = true and return_date is not null and return_time is not null;

create or replace function public.driver_schedule_conflicts(
  p_driver_user_id uuid,
  p_travel_date date,
  p_travel_time time,
  p_duration_minutes integer default 60,
  p_exclude_reservation_id uuid default null
)
returns table (
  conflict_type text,
  conflict_id uuid,
  conflict_label text,
  starts_at timestamp,
  ends_at timestamp
)
language sql
stable
security definer
set search_path = public
as $$
  with config as (
    select coalesce(settings.schedule_buffer_minutes, 30)::integer as buffer_minutes
    from (select 1) seed
    left join public.driver_settings settings on settings.user_id = p_driver_user_id
  ),
  candidate as (
    select
      (p_travel_date + p_travel_time)::timestamp as starts_at,
      (p_travel_date + p_travel_time)::timestamp
        + make_interval(mins => greatest(15, least(coalesce(p_duration_minutes, 60), 720))) as ends_at,
      config.buffer_minutes
    from config
  ),
  reservation_events as (
    select
      reservation.id,
      reservation.passenger_name::text as label,
      (reservation.travel_date + reservation.travel_time)::timestamp as starts_at,
      (reservation.travel_date + reservation.travel_time)::timestamp
        + make_interval(mins => reservation.duration_minutes) as ends_at
    from public.driver_reservations reservation
    where reservation.driver_user_id = p_driver_user_id
      and reservation.id is distinct from p_exclude_reservation_id
      and reservation.travel_date is not null
      and reservation.travel_time is not null
      and reservation.status in ('new','negotiating','quoted','confirmed','in_progress')

    union all

    select
      reservation.id,
      (reservation.passenger_name || ' (volta)')::text as label,
      (reservation.return_date + reservation.return_time)::timestamp as starts_at,
      (reservation.return_date + reservation.return_time)::timestamp
        + make_interval(mins => greatest(
          15,
          least(
            coalesce(ceil(reservation.route_duration_seconds / 60.0)::integer, reservation.duration_minutes, 60),
            720
          )
        )) as ends_at
    from public.driver_reservations reservation
    where reservation.driver_user_id = p_driver_user_id
      and reservation.id is distinct from p_exclude_reservation_id
      and reservation.has_return = true
      and reservation.return_date is not null
      and reservation.return_time is not null
      and reservation.status in ('new','negotiating','quoted','confirmed','in_progress')
  ),
  reservation_conflicts as (
    select
      'reservation'::text as conflict_type,
      event.id as conflict_id,
      event.label as conflict_label,
      event.starts_at,
      event.ends_at
    from reservation_events event
    cross join candidate
    where candidate.starts_at < event.ends_at + make_interval(mins => candidate.buffer_minutes)
      and candidate.ends_at + make_interval(mins => candidate.buffer_minutes) > event.starts_at
  ),
  block_conflicts as (
    select
      'block'::text as conflict_type,
      block.id as conflict_id,
      block.title::text as conflict_label,
      case
        when block.is_all_day then block.block_date::timestamp
        else (block.block_date + block.start_time)::timestamp
      end as starts_at,
      case
        when block.is_all_day then block.block_date::timestamp + interval '1 day'
        else (block.block_date + block.end_time)::timestamp
      end as ends_at
    from public.driver_schedule_blocks block
    cross join candidate
    where block.user_id = p_driver_user_id
      and block.block_date = p_travel_date
      and candidate.starts_at < case
        when block.is_all_day then block.block_date::timestamp + interval '1 day'
        else (block.block_date + block.end_time)::timestamp
      end
      and candidate.ends_at > case
        when block.is_all_day then block.block_date::timestamp
        else (block.block_date + block.start_time)::timestamp
      end
  )
  select * from reservation_conflicts
  union all
  select * from block_conflicts
  order by starts_at asc;
$$;

revoke all on function public.driver_schedule_conflicts(uuid, date, time, integer, uuid) from public, anon;
grant execute on function public.driver_schedule_conflicts(uuid, date, time, integer, uuid) to authenticated, service_role;

create or replace function public.enforce_driver_reservation_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  found_conflict record;
  return_duration integer;
begin
  if new.status in ('completed','cancelled','declined') then
    return new;
  end if;

  if new.has_return = true and new.return_date is not null and new.travel_date is not null then
    if new.return_date < new.travel_date
       or (
         new.return_date = new.travel_date
         and new.travel_time is not null
         and new.return_time is not null
         and new.return_time <= new.travel_time
       ) then
      raise exception 'RETURN_BEFORE_OUTBOUND' using errcode = 'P0001';
    end if;

    if new.travel_time is not null
       and new.return_time is not null
       and new.route_duration_seconds is not null
       and (new.return_date + new.return_time)::timestamp
         < (new.travel_date + new.travel_time)::timestamp
           + make_interval(secs => new.route_duration_seconds)
           + make_interval(mins => case when new.wait_at_destination then new.wait_minutes else 0 end) then
      raise exception 'RETURN_BEFORE_EXPECTED_TIME' using errcode = 'P0001';
    end if;
  end if;

  if new.travel_date is not null and new.travel_time is not null then
    select * into found_conflict
    from public.driver_schedule_conflicts(
      new.driver_user_id,
      new.travel_date,
      new.travel_time,
      new.duration_minutes,
      case when tg_op = 'UPDATE' then new.id else null end
    )
    limit 1;

    if found_conflict.conflict_id is not null then
      raise exception 'AGENDA_CONFLICT:%:%', found_conflict.conflict_type, found_conflict.conflict_label
        using errcode = 'P0001';
    end if;
  end if;

  if new.has_return = true and new.return_date is not null and new.return_time is not null then
    return_duration := greatest(
      15,
      least(coalesce(ceil(new.route_duration_seconds / 60.0)::integer, new.duration_minutes, 60), 720)
    );

    select * into found_conflict
    from public.driver_schedule_conflicts(
      new.driver_user_id,
      new.return_date,
      new.return_time,
      return_duration,
      case when tg_op = 'UPDATE' then new.id else null end
    )
    limit 1;

    if found_conflict.conflict_id is not null then
      raise exception 'AGENDA_CONFLICT:%:%', found_conflict.conflict_type, found_conflict.conflict_label
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_driver_reservation_schedule() from public, anon, authenticated;

drop trigger if exists enforce_driver_reservation_schedule_trigger on public.driver_reservations;
create trigger enforce_driver_reservation_schedule_trigger
before insert or update of driver_user_id, travel_date, travel_time, duration_minutes, status,
  has_return, return_date, return_time, route_duration_seconds
on public.driver_reservations
for each row execute function public.enforce_driver_reservation_schedule();

comment on column public.driver_reservations.passenger_user_id is
  'Conta do passageiro que enviou a solicitacao autenticada.';
comment on column public.driver_reservations.route_distance_meters is
  'Distancia estimada da rota de ida no momento da solicitacao.';
comment on column public.driver_reservations.route_duration_seconds is
  'Duracao estimada da rota de ida no momento da solicitacao.';
comment on column public.driver_service_packages.origin_label is
  'Origem estruturada da rota frequente cadastrada pelo motorista.';
