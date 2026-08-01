-- JNE App 1.7.3 — agenda diária e administração completa dos motoristas.
-- Migration idempotente. Execute somente este arquivo em bancos existentes.

alter table public.driver_reservations
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz;

alter table public.driver_reservations
  drop constraint if exists driver_reservations_cancellation_reason_length_check;

alter table public.driver_reservations
  add constraint driver_reservations_cancellation_reason_length_check
  check (cancellation_reason is null or length(trim(cancellation_reason)) between 3 and 400);

create index if not exists driver_reservations_driver_travel_date_idx
  on public.driver_reservations(driver_user_id, travel_date, travel_time, status);

create or replace function public.prepare_driver_reservation_terminal_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('cancelled', 'declined') then
    new.cancellation_reason := nullif(trim(coalesce(new.cancellation_reason, '')), '');
    new.cancelled_at := coalesce(new.cancelled_at, now());
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    new.cancellation_reason := null;
    new.cancelled_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_driver_reservation_terminal_state_trigger on public.driver_reservations;
create trigger prepare_driver_reservation_terminal_state_trigger
before insert or update of status, cancellation_reason, cancelled_at
on public.driver_reservations
for each row execute function public.prepare_driver_reservation_terminal_state();

create or replace function public.admin_driver_metrics()
returns table (
  user_id uuid,
  profile_views bigint,
  profile_views_30d bigint,
  whatsapp_clicks bigint,
  reservation_starts bigint,
  reservation_submissions bigint,
  reservations_total bigint,
  quotes_total bigint,
  trips_total bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  return query
  select
    profile.id as user_id,
    count(event.id) filter (where event.event_type = 'profile_view')::bigint as profile_views,
    count(event.id) filter (
      where event.event_type = 'profile_view'
        and event.created_at >= now() - interval '30 days'
    )::bigint as profile_views_30d,
    count(event.id) filter (where event.event_type = 'whatsapp_click')::bigint as whatsapp_clicks,
    count(event.id) filter (where event.event_type = 'reservation_started')::bigint as reservation_starts,
    count(event.id) filter (where event.event_type = 'reservation_submitted')::bigint as reservation_submissions,
    (select count(*) from public.driver_reservations reservation where reservation.driver_user_id = profile.id)::bigint,
    (select count(*) from public.driver_quotes quote where quote.user_id = profile.id)::bigint,
    (select count(*) from public.driver_trips trip where trip.user_id = profile.id)::bigint
  from public.profiles profile
  left join public.driver_profile_events event on event.driver_user_id = profile.id
  where profile.is_professional_driver = true
     or exists (select 1 from public.driver_public_profiles public_profile where public_profile.user_id = profile.id)
     or exists (select 1 from public.driver_reservations reservation where reservation.driver_user_id = profile.id)
     or exists (select 1 from public.driver_quotes quote where quote.user_id = profile.id)
     or exists (select 1 from public.driver_trips trip where trip.user_id = profile.id)
  group by profile.id, profile.created_at
  order by profile.created_at desc;
end;
$$;

revoke all on function public.admin_driver_metrics() from public, anon;
grant execute on function public.admin_driver_metrics() to authenticated;
