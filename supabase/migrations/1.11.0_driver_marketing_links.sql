-- JNE App 1.11.0 — Links inteligentes, campanhas e QR Codes rastreáveis
-- Execute depois da migration 1.10.0_driver_intelligence.sql.
-- Migration idempotente e compatível com os dados históricos.

create table if not exists public.driver_marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  code text not null,
  source text not null default 'shared_link',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_marketing_campaigns_name_check
    check (length(trim(name)) between 3 and 80),
  constraint driver_marketing_campaigns_code_check
    check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(code) between 3 and 48),
  constraint driver_marketing_campaigns_source_check
    check (source in ('profile','qr','qr_car','qr_card','instagram','youtube','tiktok','whatsapp','shared_link','other')),
  constraint driver_marketing_campaigns_user_code_key unique (user_id, code)
);

create index if not exists driver_marketing_campaigns_user_active_idx
  on public.driver_marketing_campaigns(user_id, is_active desc, created_at desc);

alter table public.driver_marketing_campaigns enable row level security;
grant select, insert, update, delete on public.driver_marketing_campaigns to authenticated;
revoke all on public.driver_marketing_campaigns from anon;

drop policy if exists "Drivers read own marketing campaigns" on public.driver_marketing_campaigns;
create policy "Drivers read own marketing campaigns"
on public.driver_marketing_campaigns
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Drivers create own marketing campaigns" on public.driver_marketing_campaigns;
create policy "Drivers create own marketing campaigns"
on public.driver_marketing_campaigns
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid()
      and profile.is_professional_driver = true
      and profile.is_blocked = false
  )
);

drop policy if exists "Drivers update own marketing campaigns" on public.driver_marketing_campaigns;
create policy "Drivers update own marketing campaigns"
on public.driver_marketing_campaigns
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid()
      and profile.is_professional_driver = true
      and profile.is_blocked = false
  )
);

drop policy if exists "Drivers delete own marketing campaigns" on public.driver_marketing_campaigns;
create policy "Drivers delete own marketing campaigns"
on public.driver_marketing_campaigns
for delete
to authenticated
using (user_id = auth.uid());

drop trigger if exists driver_marketing_campaigns_set_updated_at on public.driver_marketing_campaigns;
create trigger driver_marketing_campaigns_set_updated_at
before update on public.driver_marketing_campaigns
for each row execute function public.set_updated_at();

alter table public.driver_profile_events
  add column if not exists campaign_id uuid references public.driver_marketing_campaigns(id) on delete set null;

alter table public.driver_reservations
  add column if not exists campaign_id uuid references public.driver_marketing_campaigns(id) on delete set null;

alter table public.driver_profile_events
  drop constraint if exists driver_profile_events_source_check;

alter table public.driver_profile_events
  add constraint driver_profile_events_source_check
  check (source in ('profile','qr','qr_car','qr_card','instagram','youtube','tiktok','whatsapp','shared_link','other'));

alter table public.driver_reservations
  drop constraint if exists driver_reservations_source_check;

alter table public.driver_reservations
  add constraint driver_reservations_source_check
  check (source in ('profile','qr','qr_car','qr_card','instagram','youtube','tiktok','whatsapp','shared_link','other'));

create index if not exists driver_profile_events_campaign_date_idx
  on public.driver_profile_events(campaign_id, created_at desc)
  where campaign_id is not null;

create index if not exists driver_reservations_campaign_date_idx
  on public.driver_reservations(campaign_id, created_at desc)
  where campaign_id is not null;

create index if not exists driver_profile_events_driver_source_campaign_date_idx
  on public.driver_profile_events(driver_user_id, source, campaign_id, created_at desc);

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
    values
      ('profile'::text),
      ('qr'::text),
      ('qr_car'::text),
      ('qr_card'::text),
      ('instagram'::text),
      ('youtube'::text),
      ('tiktok'::text),
      ('whatsapp'::text),
      ('shared_link'::text),
      ('other'::text)
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

create or replace function public.driver_performance_campaigns(days_count integer default 30, result_limit integer default 8)
returns table (
  campaign_id uuid,
  name text,
  code text,
  source text,
  is_active boolean,
  profile_views bigint,
  whatsapp_clicks bigint,
  reservation_submissions bigint,
  reservations_total bigint,
  completed_trips bigint,
  net_result numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_days integer := greatest(7, least(coalesce(days_count, 30), 365));
  safe_limit integer := greatest(1, least(coalesce(result_limit, 8), 30));
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
  with event_metrics as (
    select
      event.campaign_id,
      count(*) filter (where event.event_type = 'profile_view')::bigint as profile_views,
      count(*) filter (where event.event_type = 'whatsapp_click')::bigint as whatsapp_clicks,
      count(*) filter (where event.event_type = 'reservation_submitted')::bigint as reservation_submissions
    from public.driver_profile_events event
    where event.driver_user_id = auth.uid()
      and event.campaign_id is not null
      and (event.created_at at time zone 'America/Sao_Paulo')::date between start_date and today_date
    group by event.campaign_id
  ),
  reservation_metrics as (
    select reservation.campaign_id, count(*)::bigint as reservations_total
    from public.driver_reservations reservation
    where reservation.driver_user_id = auth.uid()
      and reservation.campaign_id is not null
      and (reservation.created_at at time zone 'America/Sao_Paulo')::date between start_date and today_date
    group by reservation.campaign_id
  ),
  trip_metrics as (
    select
      reservation.campaign_id,
      count(*) filter (where trip.status = 'completed')::bigint as completed_trips,
      coalesce(sum(trip.net_result) filter (where trip.status = 'completed'), 0)::numeric as net_result
    from public.driver_trips trip
    join public.driver_reservations reservation
      on reservation.id = trip.reservation_id
     and reservation.driver_user_id = trip.user_id
    where trip.user_id = auth.uid()
      and reservation.campaign_id is not null
      and coalesce(trip.travel_date, (trip.created_at at time zone 'America/Sao_Paulo')::date) between start_date and today_date
    group by reservation.campaign_id
  )
  select
    campaign.id,
    campaign.name,
    campaign.code,
    campaign.source,
    campaign.is_active,
    coalesce(event_metrics.profile_views, 0),
    coalesce(event_metrics.whatsapp_clicks, 0),
    coalesce(event_metrics.reservation_submissions, 0),
    coalesce(reservation_metrics.reservations_total, 0),
    coalesce(trip_metrics.completed_trips, 0),
    coalesce(trip_metrics.net_result, 0)
  from public.driver_marketing_campaigns campaign
  left join event_metrics on event_metrics.campaign_id = campaign.id
  left join reservation_metrics on reservation_metrics.campaign_id = campaign.id
  left join trip_metrics on trip_metrics.campaign_id = campaign.id
  where campaign.user_id = auth.uid()
    and (
      coalesce(event_metrics.profile_views, 0)
      + coalesce(event_metrics.whatsapp_clicks, 0)
      + coalesce(event_metrics.reservation_submissions, 0)
      + coalesce(reservation_metrics.reservations_total, 0)
      + coalesce(trip_metrics.completed_trips, 0)
    ) > 0
  order by
    coalesce(event_metrics.profile_views, 0) desc,
    coalesce(reservation_metrics.reservations_total, 0) desc,
    campaign.created_at desc
  limit safe_limit;
end;
$$;

create or replace function public.admin_driver_marketing_summary(days_count integer default 30)
returns table (
  total_campaigns bigint,
  active_campaigns bigint,
  attributed_views bigint,
  attributed_reservations bigint
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
  select
    (select count(*)::bigint from public.driver_marketing_campaigns),
    (select count(*)::bigint from public.driver_marketing_campaigns where is_active = true),
    (
      select count(*)::bigint
      from public.driver_profile_events
      where campaign_id is not null
        and event_type = 'profile_view'
        and (created_at at time zone 'America/Sao_Paulo')::date between start_date and today_date
    ),
    (
      select count(*)::bigint
      from public.driver_reservations
      where campaign_id is not null
        and (created_at at time zone 'America/Sao_Paulo')::date between start_date and today_date
    );
end;
$$;

revoke all on function public.driver_performance_sources(integer) from public, anon;
revoke all on function public.driver_performance_campaigns(integer, integer) from public, anon;
revoke all on function public.admin_driver_marketing_summary(integer) from public, anon;

grant execute on function public.driver_performance_sources(integer) to authenticated;
grant execute on function public.driver_performance_campaigns(integer, integer) to authenticated;
grant execute on function public.admin_driver_marketing_summary(integer) to authenticated;
