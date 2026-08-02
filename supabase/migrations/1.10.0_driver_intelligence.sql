-- JNE App 1.10.0 — Inteligência do motorista
-- Execute depois da migration 1.9.0_public_content_editorial_workflow.sql.
-- Funções idempotentes, privadas e limitadas ao próprio motorista ou administradores.

alter table public.driver_reservations
  drop constraint if exists driver_reservations_source_check;

alter table public.driver_reservations
  add constraint driver_reservations_source_check
  check (source in ('profile', 'qr', 'shared_link', 'whatsapp'));

create index if not exists driver_profile_events_driver_type_source_date_idx
  on public.driver_profile_events(driver_user_id, event_type, source, created_at desc);

create index if not exists driver_reservations_driver_source_date_idx
  on public.driver_reservations(driver_user_id, source, created_at desc);

create index if not exists driver_trips_user_reservation_status_date_idx
  on public.driver_trips(user_id, reservation_id, status, travel_date desc);

create or replace function public.driver_performance_summary(days_count integer default 30)
returns table (
  period_days integer,
  profile_views bigint,
  whatsapp_clicks bigint,
  reservation_starts bigint,
  reservation_submissions bigint,
  reservations_total bigint,
  confirmed_reservations bigint,
  completed_trips bigint,
  gross_revenue numeric,
  net_result numeric,
  recurring_customers bigint,
  previous_profile_views bigint,
  previous_reservation_submissions bigint,
  previous_completed_trips bigint,
  previous_net_result numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_days integer := greatest(7, least(coalesce(days_count, 30), 365));
  today_date date := (now() at time zone 'America/Sao_Paulo')::date;
  current_start date;
  previous_start date;
  previous_end date;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_professional_driver = true
      and is_blocked = false
      and role in ('vip', 'admin')
  ) then
    raise exception 'Área disponível somente para motorista profissional ativo.' using errcode = '42501';
  end if;

  current_start := today_date - (safe_days - 1);
  previous_end := current_start - 1;
  previous_start := previous_end - (safe_days - 1);

  return query
  with current_events as (
    select
      count(*) filter (where event_type = 'profile_view')::bigint as profile_views,
      count(*) filter (where event_type = 'whatsapp_click')::bigint as whatsapp_clicks,
      count(*) filter (where event_type = 'reservation_started')::bigint as reservation_starts,
      count(*) filter (where event_type = 'reservation_submitted')::bigint as reservation_submissions
    from public.driver_profile_events
    where driver_user_id = auth.uid()
      and (created_at at time zone 'America/Sao_Paulo')::date between current_start and today_date
  ),
  previous_events as (
    select
      count(*) filter (where event_type = 'profile_view')::bigint as profile_views,
      count(*) filter (where event_type = 'reservation_submitted')::bigint as reservation_submissions
    from public.driver_profile_events
    where driver_user_id = auth.uid()
      and (created_at at time zone 'America/Sao_Paulo')::date between previous_start and previous_end
  ),
  current_reservations as (
    select
      count(*)::bigint as reservations_total,
      count(*) filter (where status in ('confirmed', 'completed'))::bigint as confirmed_reservations
    from public.driver_reservations
    where driver_user_id = auth.uid()
      and (created_at at time zone 'America/Sao_Paulo')::date between current_start and today_date
  ),
  recurring as (
    select count(*)::bigint as recurring_customers
    from (
      select passenger_phone
      from public.driver_reservations
      where driver_user_id = auth.uid()
      group by passenger_phone
      having count(*) >= 2
    ) customer
  ),
  current_trips as (
    select
      count(*) filter (where status = 'completed')::bigint as completed_trips,
      coalesce(sum(gross_revenue) filter (where status = 'completed'), 0)::numeric as gross_revenue,
      coalesce(sum(net_result) filter (where status = 'completed'), 0)::numeric as net_result
    from public.driver_trips
    where user_id = auth.uid()
      and coalesce(travel_date, (created_at at time zone 'America/Sao_Paulo')::date) between current_start and today_date
  ),
  previous_trips as (
    select
      count(*) filter (where status = 'completed')::bigint as completed_trips,
      coalesce(sum(net_result) filter (where status = 'completed'), 0)::numeric as net_result
    from public.driver_trips
    where user_id = auth.uid()
      and coalesce(travel_date, (created_at at time zone 'America/Sao_Paulo')::date) between previous_start and previous_end
  )
  select
    safe_days,
    coalesce(current_events.profile_views, 0),
    coalesce(current_events.whatsapp_clicks, 0),
    coalesce(current_events.reservation_starts, 0),
    coalesce(current_events.reservation_submissions, 0),
    coalesce(current_reservations.reservations_total, 0),
    coalesce(current_reservations.confirmed_reservations, 0),
    coalesce(current_trips.completed_trips, 0),
    coalesce(current_trips.gross_revenue, 0),
    coalesce(current_trips.net_result, 0),
    coalesce(recurring.recurring_customers, 0),
    coalesce(previous_events.profile_views, 0),
    coalesce(previous_events.reservation_submissions, 0),
    coalesce(previous_trips.completed_trips, 0),
    coalesce(previous_trips.net_result, 0)
  from current_events, previous_events, current_reservations, recurring, current_trips, previous_trips;
end;
$$;

create or replace function public.driver_performance_sources(days_count integer default 30)
returns table (
  source text,
  profile_views bigint,
  whatsapp_clicks bigint,
  reservation_starts bigint,
  reservation_submissions bigint,
  reservations_total bigint,
  completed_trips bigint,
  gross_revenue numeric,
  net_result numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_days integer := greatest(7, least(coalesce(days_count, 30), 365));
  today_date date := (now() at time zone 'America/Sao_Paulo')::date;
  start_date date := today_date - (safe_days - 1);
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_professional_driver = true
      and is_blocked = false
      and role in ('vip', 'admin')
  ) then
    raise exception 'Recurso disponível somente para motorista VIP ativo.' using errcode = '42501';
  end if;

  return query
  with source_list(source) as (
    values ('profile'::text), ('qr'::text), ('shared_link'::text), ('whatsapp'::text)
  ),
  event_metrics as (
    select
      event.source,
      count(*) filter (where event.event_type = 'profile_view')::bigint as profile_views,
      count(*) filter (where event.event_type = 'whatsapp_click')::bigint as whatsapp_clicks,
      count(*) filter (where event.event_type = 'reservation_started')::bigint as reservation_starts,
      count(*) filter (where event.event_type = 'reservation_submitted')::bigint as reservation_submissions
    from public.driver_profile_events event
    where event.driver_user_id = auth.uid()
      and (event.created_at at time zone 'America/Sao_Paulo')::date between start_date and today_date
    group by event.source
  ),
  reservation_metrics as (
    select reservation.source, count(*)::bigint as reservations_total
    from public.driver_reservations reservation
    where reservation.driver_user_id = auth.uid()
      and (reservation.created_at at time zone 'America/Sao_Paulo')::date between start_date and today_date
    group by reservation.source
  ),
  trip_metrics as (
    select
      reservation.source,
      count(*) filter (where trip.status = 'completed')::bigint as completed_trips,
      coalesce(sum(trip.gross_revenue) filter (where trip.status = 'completed'), 0)::numeric as gross_revenue,
      coalesce(sum(trip.net_result) filter (where trip.status = 'completed'), 0)::numeric as net_result
    from public.driver_trips trip
    join public.driver_reservations reservation
      on reservation.id = trip.reservation_id
     and reservation.driver_user_id = trip.user_id
    where trip.user_id = auth.uid()
      and coalesce(trip.travel_date, (trip.created_at at time zone 'America/Sao_Paulo')::date) between start_date and today_date
    group by reservation.source
  )
  select
    source_list.source,
    coalesce(event_metrics.profile_views, 0),
    coalesce(event_metrics.whatsapp_clicks, 0),
    coalesce(event_metrics.reservation_starts, 0),
    coalesce(event_metrics.reservation_submissions, 0),
    coalesce(reservation_metrics.reservations_total, 0),
    coalesce(trip_metrics.completed_trips, 0),
    coalesce(trip_metrics.gross_revenue, 0),
    coalesce(trip_metrics.net_result, 0)
  from source_list
  left join event_metrics on event_metrics.source = source_list.source
  left join reservation_metrics on reservation_metrics.source = source_list.source
  left join trip_metrics on trip_metrics.source = source_list.source
  where coalesce(event_metrics.profile_views, 0)
      + coalesce(event_metrics.whatsapp_clicks, 0)
      + coalesce(event_metrics.reservation_starts, 0)
      + coalesce(event_metrics.reservation_submissions, 0)
      + coalesce(reservation_metrics.reservations_total, 0)
      + coalesce(trip_metrics.completed_trips, 0) > 0
  order by coalesce(event_metrics.profile_views, 0) desc, source_list.source;
end;
$$;

create or replace function public.driver_performance_services(days_count integer default 30, result_limit integer default 5)
returns table (
  package_id uuid,
  title text,
  reservation_count bigint,
  completed_trips bigint,
  gross_revenue numeric,
  net_result numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_days integer := greatest(7, least(coalesce(days_count, 30), 365));
  safe_limit integer := greatest(1, least(coalesce(result_limit, 5), 20));
  today_date date := (now() at time zone 'America/Sao_Paulo')::date;
  start_date date := today_date - (safe_days - 1);
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_professional_driver = true
      and is_blocked = false
      and role in ('vip', 'admin')
  ) then
    raise exception 'Recurso disponível somente para motorista VIP ativo.' using errcode = '42501';
  end if;

  return query
  select
    package_item.id,
    package_item.title,
    count(distinct reservation.id)::bigint,
    count(distinct trip.id) filter (where trip.status = 'completed')::bigint,
    coalesce(sum(trip.gross_revenue) filter (where trip.status = 'completed'), 0)::numeric,
    coalesce(sum(trip.net_result) filter (where trip.status = 'completed'), 0)::numeric
  from public.driver_service_packages package_item
  join public.driver_reservations reservation
    on reservation.package_id = package_item.id
   and reservation.driver_user_id = package_item.user_id
  left join public.driver_trips trip
    on trip.reservation_id = reservation.id
   and trip.user_id = reservation.driver_user_id
  where package_item.user_id = auth.uid()
    and (reservation.created_at at time zone 'America/Sao_Paulo')::date between start_date and today_date
  group by package_item.id, package_item.title, package_item.sort_order
  order by count(distinct reservation.id) desc, package_item.sort_order, package_item.title
  limit safe_limit;
end;
$$;

create or replace function public.driver_performance_demand(days_count integer default 90)
returns table (
  dimension text,
  bucket integer,
  total bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_days integer := greatest(30, least(coalesce(days_count, 90), 365));
  today_date date := (now() at time zone 'America/Sao_Paulo')::date;
  start_date date := today_date - (safe_days - 1);
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_professional_driver = true
      and is_blocked = false
      and role in ('vip', 'admin')
  ) then
    raise exception 'Recurso disponível somente para motorista VIP ativo.' using errcode = '42501';
  end if;

  return query
  with demand as (
    select
      'weekday'::text as dimension,
      extract(isodow from reservation.travel_date)::integer as bucket,
      count(*)::bigint as total
    from public.driver_reservations reservation
    where reservation.driver_user_id = auth.uid()
      and reservation.travel_date between start_date and today_date + 365
    group by extract(isodow from reservation.travel_date)

    union all

    select
      'request_hour'::text,
      extract(hour from reservation.created_at at time zone 'America/Sao_Paulo')::integer,
      count(*)::bigint
    from public.driver_reservations reservation
    where reservation.driver_user_id = auth.uid()
      and (reservation.created_at at time zone 'America/Sao_Paulo')::date between start_date and today_date
    group by extract(hour from reservation.created_at at time zone 'America/Sao_Paulo')

    union all

    select
      'travel_hour'::text,
      extract(hour from reservation.travel_time)::integer,
      count(*)::bigint
    from public.driver_reservations reservation
    where reservation.driver_user_id = auth.uid()
      and reservation.travel_time is not null
      and reservation.travel_date between start_date and today_date + 365
    group by extract(hour from reservation.travel_time)
  ),
  ranked as (
    select demand.*, row_number() over (partition by demand.dimension order by demand.total desc, demand.bucket) as position
    from demand
  )
  select ranked.dimension, ranked.bucket, ranked.total
  from ranked
  where ranked.position <= 3
  order by ranked.dimension, ranked.position;
end;
$$;

create or replace function public.admin_driver_intelligence_summary(days_count integer default 30)
returns table (
  active_drivers bigint,
  profile_views bigint,
  whatsapp_clicks bigint,
  reservations_total bigint,
  completed_trips bigint,
  gross_revenue numeric,
  net_result numeric,
  recurring_customers bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_days integer := greatest(7, least(coalesce(days_count, 30), 365));
  today_date date := (now() at time zone 'America/Sao_Paulo')::date;
  start_date date := today_date - (safe_days - 1);
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  return query
  with active as (
    select count(*)::bigint as total
    from public.profiles
    where is_professional_driver = true and is_blocked = false
  ),
  events as (
    select
      count(*) filter (where event_type = 'profile_view')::bigint as profile_views,
      count(*) filter (where event_type = 'whatsapp_click')::bigint as whatsapp_clicks
    from public.driver_profile_events
    where (created_at at time zone 'America/Sao_Paulo')::date between start_date and today_date
  ),
  reservations as (
    select count(*)::bigint as reservations_total
    from public.driver_reservations
    where (created_at at time zone 'America/Sao_Paulo')::date between start_date and today_date
  ),
  trips as (
    select
      count(*) filter (where status = 'completed')::bigint as completed_trips,
      coalesce(sum(gross_revenue) filter (where status = 'completed'), 0)::numeric as gross_revenue,
      coalesce(sum(net_result) filter (where status = 'completed'), 0)::numeric as net_result
    from public.driver_trips
    where coalesce(travel_date, (created_at at time zone 'America/Sao_Paulo')::date) between start_date and today_date
  ),
  recurring as (
    select count(*)::bigint as recurring_customers
    from (
      select driver_user_id, passenger_phone
      from public.driver_reservations
      group by driver_user_id, passenger_phone
      having count(*) >= 2
    ) customer
  )
  select active.total, events.profile_views, events.whatsapp_clicks, reservations.reservations_total,
         trips.completed_trips, trips.gross_revenue, trips.net_result, recurring.recurring_customers
  from active, events, reservations, trips, recurring;
end;
$$;

revoke all on function public.driver_performance_summary(integer) from public, anon;
revoke all on function public.driver_performance_sources(integer) from public, anon;
revoke all on function public.driver_performance_services(integer, integer) from public, anon;
revoke all on function public.driver_performance_demand(integer) from public, anon;
revoke all on function public.admin_driver_intelligence_summary(integer) from public, anon;

grant execute on function public.driver_performance_summary(integer) to authenticated;
grant execute on function public.driver_performance_sources(integer) to authenticated;
grant execute on function public.driver_performance_services(integer, integer) to authenticated;
grant execute on function public.driver_performance_demand(integer) to authenticated;
grant execute on function public.admin_driver_intelligence_summary(integer) to authenticated;
