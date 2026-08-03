-- JNE App 1.18.0 — Rede de motoristas e indicações
-- Execute depois da migration 1.17.0_account_plans.sql.

create extension if not exists pgcrypto;

-- A rede é um recurso Premium. O diretório público continua acessível aos passageiros.
update public.app_plan_catalog
set features = case
  when features ? 'driver_network' then features
  else features || '["driver_network"]'::jsonb
end,
    description = 'Todos os recursos profissionais, inteligência, rede de motoristas, campanhas e relatórios avançados.',
    updated_at = now()
where code = 'premium';

create table if not exists public.driver_network_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  opted_in boolean not null default false,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','rejected')),
  region text,
  service_types text[] not null default '{}'::text[],
  accessibility_features text[] not null default '{}'::text[],
  network_note text,
  accepts_referrals boolean not null default true,
  share_contact_with_network boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  verification_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_network_settings_lengths_check check (
    (region is null or length(region) <= 120)
    and (network_note is null or length(network_note) <= 320)
    and (verification_notes is null or length(verification_notes) <= 500)
  ),
  constraint driver_network_service_types_check check (
    service_types <@ array['airport','intercity','events','executive','hourly','tourism','accessible','pet','other']::text[]
  ),
  constraint driver_network_accessibility_check check (
    accessibility_features <@ array['reduced_mobility','wheelchair_support','hearing_support','visual_support','child_seat']::text[]
  )
);

create index if not exists driver_network_settings_directory_idx
  on public.driver_network_settings(opted_in, verification_status, accepts_referrals, updated_at desc);
create index if not exists driver_network_settings_services_gin_idx
  on public.driver_network_settings using gin(service_types);
create index if not exists driver_network_settings_accessibility_gin_idx
  on public.driver_network_settings using gin(accessibility_features);

drop trigger if exists driver_network_settings_set_updated_at on public.driver_network_settings;
create trigger driver_network_settings_set_updated_at
before update on public.driver_network_settings
for each row execute function public.set_updated_at();

alter table public.driver_network_settings enable row level security;
revoke all on public.driver_network_settings from anon;
revoke insert, update, delete on public.driver_network_settings from authenticated;
grant select on public.driver_network_settings to authenticated;

drop policy if exists "Drivers read own network settings" on public.driver_network_settings;
create policy "Drivers read own network settings"
on public.driver_network_settings
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create table if not exists public.driver_referrals (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  reservation_id uuid references public.driver_reservations(id) on delete set null,
  accepted_reservation_id uuid references public.driver_reservations(id) on delete set null,
  sender_display_name text not null,
  recipient_display_name text not null,
  sender_whatsapp_phone text,
  recipient_whatsapp_phone text,
  passenger_name text not null,
  passenger_phone text not null,
  origin text,
  destination text,
  travel_date date,
  travel_time time,
  trip_type text not null default 'outbound' check (trip_type in ('outbound','return','round_trip')),
  passengers smallint not null default 1 check (passengers between 1 and 20),
  luggage text,
  notes text,
  sender_message text,
  recipient_message text,
  passenger_contact_consent boolean not null default false,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_referrals_distinct_drivers_check check (sender_user_id <> recipient_user_id),
  constraint driver_referrals_phone_check check (passenger_phone ~ '^[0-9]{10,15}$'),
  constraint driver_referrals_lengths_check check (
    length(trim(sender_display_name)) between 2 and 80
    and length(trim(recipient_display_name)) between 2 and 80
    and length(trim(passenger_name)) between 2 and 80
    and (sender_whatsapp_phone is null or sender_whatsapp_phone ~ '^[0-9]{10,15}$')
    and (recipient_whatsapp_phone is null or recipient_whatsapp_phone ~ '^[0-9]{10,15}$')
    and (origin is null or length(origin) <= 180)
    and (destination is null or length(destination) <= 180)
    and (luggage is null or length(luggage) <= 180)
    and (notes is null or length(notes) <= 700)
    and (sender_message is null or length(sender_message) <= 500)
    and (recipient_message is null or length(recipient_message) <= 500)
  )
);

create unique index if not exists driver_referrals_active_reservation_recipient_idx
  on public.driver_referrals(reservation_id, recipient_user_id)
  where reservation_id is not null and status in ('pending','accepted');
create index if not exists driver_referrals_sender_date_idx
  on public.driver_referrals(sender_user_id, created_at desc);
create index if not exists driver_referrals_recipient_status_date_idx
  on public.driver_referrals(recipient_user_id, status, created_at desc);

drop trigger if exists driver_referrals_set_updated_at on public.driver_referrals;
create trigger driver_referrals_set_updated_at
before update on public.driver_referrals
for each row execute function public.set_updated_at();

alter table public.driver_referrals enable row level security;
revoke all on public.driver_referrals from anon;
revoke insert, update, delete on public.driver_referrals from authenticated;
grant select on public.driver_referrals to authenticated;

drop policy if exists "Drivers read related referrals" on public.driver_referrals;
create policy "Drivers read related referrals"
on public.driver_referrals
for select to authenticated
using (sender_user_id = auth.uid() or recipient_user_id = auth.uid() or public.is_admin());

-- Identifica acessos vindos do diretório público sem misturar com campanhas comuns.
alter table public.driver_profile_events
  drop constraint if exists driver_profile_events_source_check;
alter table public.driver_profile_events
  add constraint driver_profile_events_source_check
  check (source in ('profile','qr','qr_car','qr_card','instagram','youtube','tiktok','whatsapp','shared_link','network','other'));

alter table public.driver_reservations
  drop constraint if exists driver_reservations_source_check;
alter table public.driver_reservations
  add constraint driver_reservations_source_check
  check (source in ('profile','qr','qr_car','qr_card','instagram','youtube','tiktok','whatsapp','shared_link','network','other'));

create or replace function public.save_driver_network_settings(
  selected_opted_in boolean,
  selected_region text default null,
  selected_service_types text[] default '{}'::text[],
  selected_accessibility_features text[] default '{}'::text[],
  selected_network_note text default null,
  selected_accepts_referrals boolean default true,
  selected_share_contact boolean default false
)
returns public.driver_network_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.driver_network_settings%rowtype;
  current_status text;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid()
      and profile.is_professional_driver = true
      and profile.is_blocked = false
  ) then
    raise exception 'Acesso de motorista profissional necessário.' using errcode = '42501';
  end if;

  if not public.account_has_feature('driver_network', auth.uid()) then
    raise exception 'A Rede de Motoristas exige o plano Premium.' using errcode = '42501';
  end if;

  if selected_opted_in and not exists (
    select 1 from public.driver_public_profiles profile
    where profile.user_id = auth.uid() and profile.is_published = true
  ) then
    raise exception 'Publique seu cartão profissional antes de entrar no diretório.' using errcode = '22023';
  end if;

  if not (coalesce(selected_service_types, '{}'::text[]) <@ array['airport','intercity','events','executive','hourly','tourism','accessible','pet','other']::text[]) then
    raise exception 'Tipo de serviço inválido.' using errcode = '22023';
  end if;

  if not (coalesce(selected_accessibility_features, '{}'::text[]) <@ array['reduced_mobility','wheelchair_support','hearing_support','visual_support','child_seat']::text[]) then
    raise exception 'Recurso de acessibilidade inválido.' using errcode = '22023';
  end if;

  select verification_status into current_status
  from public.driver_network_settings
  where user_id = auth.uid();

  insert into public.driver_network_settings (
    user_id,
    opted_in,
    verification_status,
    region,
    service_types,
    accessibility_features,
    network_note,
    accepts_referrals,
    share_contact_with_network
  ) values (
    auth.uid(),
    coalesce(selected_opted_in, false),
    coalesce(current_status, 'pending'),
    nullif(trim(selected_region), ''),
    coalesce(selected_service_types, '{}'::text[]),
    coalesce(selected_accessibility_features, '{}'::text[]),
    nullif(trim(selected_network_note), ''),
    coalesce(selected_accepts_referrals, true),
    coalesce(selected_share_contact, false)
  )
  on conflict (user_id) do update set
    opted_in = excluded.opted_in,
    region = excluded.region,
    service_types = excluded.service_types,
    accessibility_features = excluded.accessibility_features,
    network_note = excluded.network_note,
    accepts_referrals = excluded.accepts_referrals,
    share_contact_with_network = excluded.share_contact_with_network,
    verification_status = case
      when driver_network_settings.verification_status = 'verified' then 'verified'
      else 'pending'
    end,
    verification_notes = case
      when driver_network_settings.verification_status = 'verified' then driver_network_settings.verification_notes
      else null
    end,
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function public.save_driver_network_settings(boolean, text, text[], text[], text, boolean, boolean) from public, anon;
grant execute on function public.save_driver_network_settings(boolean, text, text[], text[], text, boolean, boolean) to authenticated;

create or replace function public.admin_set_driver_network_verification(
  target_user_id uuid,
  selected_status text,
  admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;
  if selected_status not in ('pending','verified','rejected') then
    raise exception 'Situação de verificação inválida.' using errcode = '22023';
  end if;

  update public.driver_network_settings
  set verification_status = selected_status,
      verified_at = case when selected_status = 'verified' then now() else null end,
      verified_by = case when selected_status = 'verified' then auth.uid() else null end,
      verification_notes = nullif(trim(admin_notes), ''),
      updated_at = now()
  where user_id = target_user_id;

  if not found then
    raise exception 'Solicitação da rede não encontrada.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_set_driver_network_verification(uuid, text, text) from public, anon;
grant execute on function public.admin_set_driver_network_verification(uuid, text, text) to authenticated;

create or replace function public.search_driver_network(
  search_text text default null,
  city_filter text default null,
  region_filter text default null,
  service_filter text default null,
  vehicle_filter text default null,
  min_seats integer default 1,
  accessibility_filter text default null,
  limit_count integer default 60,
  offset_count integer default 0
)
returns table (
  user_id uuid,
  slug text,
  display_name text,
  headline text,
  city text,
  service_area text,
  vehicle_name text,
  vehicle_details text,
  seats smallint,
  amenities text[],
  photo_url text,
  theme text,
  region text,
  service_types text[],
  accessibility_features text[],
  network_note text,
  accepts_referrals boolean,
  is_verified boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    profile.user_id,
    profile.slug,
    profile.display_name,
    profile.headline,
    profile.city,
    profile.service_area,
    profile.vehicle_name,
    profile.vehicle_details,
    profile.seats,
    profile.amenities,
    profile.photo_url,
    profile.theme,
    network.region,
    network.service_types,
    network.accessibility_features,
    network.network_note,
    network.accepts_referrals,
    true
  from public.driver_network_settings network
  join public.driver_public_profiles profile on profile.user_id = network.user_id
  join public.profiles member on member.id = network.user_id
  where network.opted_in = true
    and network.verification_status = 'verified'
    and profile.is_published = true
    and member.is_professional_driver = true
    and member.is_blocked = false
    and public.account_has_feature('driver_network', network.user_id)
    and (
      nullif(trim(search_text), '') is null
      or concat_ws(' ', profile.display_name, profile.headline, profile.city, profile.service_area, profile.vehicle_name, network.region, network.network_note)
         ilike '%' || trim(search_text) || '%'
    )
    and (nullif(trim(city_filter), '') is null or profile.city ilike '%' || trim(city_filter) || '%')
    and (nullif(trim(region_filter), '') is null or coalesce(network.region, profile.service_area, '') ilike '%' || trim(region_filter) || '%')
    and (nullif(trim(service_filter), '') is null or trim(service_filter) = any(network.service_types))
    and (nullif(trim(vehicle_filter), '') is null or coalesce(profile.vehicle_name, '') ilike '%' || trim(vehicle_filter) || '%')
    and profile.seats >= greatest(coalesce(min_seats, 1), 1)
    and (nullif(trim(accessibility_filter), '') is null or trim(accessibility_filter) = any(network.accessibility_features))
  order by profile.city nulls last, profile.display_name
  limit least(greatest(coalesce(limit_count, 60), 1), 100)
  offset greatest(coalesce(offset_count, 0), 0);
$$;

revoke all on function public.search_driver_network(text, text, text, text, text, integer, text, integer, integer) from public;
grant execute on function public.search_driver_network(text, text, text, text, text, integer, text, integer, integer) to anon, authenticated;

create or replace function public.driver_network_members()
returns table (
  user_id uuid,
  slug text,
  display_name text,
  headline text,
  city text,
  service_area text,
  vehicle_name text,
  vehicle_details text,
  seats smallint,
  amenities text[],
  photo_url text,
  theme text,
  region text,
  service_types text[],
  accessibility_features text[],
  network_note text,
  accepts_referrals boolean,
  is_verified boolean,
  whatsapp_phone text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  caller_is_network_member boolean := false;
begin
  if auth.uid() is null or not public.account_has_feature('driver_network', auth.uid()) then
    raise exception 'A Rede de Motoristas exige o plano Premium.' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.driver_network_settings caller_network
    join public.driver_public_profiles caller_profile on caller_profile.user_id = caller_network.user_id
    join public.profiles caller_member on caller_member.id = caller_network.user_id
    where caller_network.user_id = auth.uid()
      and caller_network.opted_in = true
      and caller_network.verification_status = 'verified'
      and caller_profile.is_published = true
      and caller_member.is_professional_driver = true
      and caller_member.is_blocked = false
  ) into caller_is_network_member;

  return query
  select
    profile.user_id,
    profile.slug,
    profile.display_name,
    profile.headline,
    profile.city,
    profile.service_area,
    profile.vehicle_name,
    profile.vehicle_details,
    profile.seats,
    profile.amenities,
    profile.photo_url,
    profile.theme,
    network.region,
    network.service_types,
    network.accessibility_features,
    network.network_note,
    network.accepts_referrals,
    true,
    case when caller_is_network_member and network.share_contact_with_network then profile.whatsapp_phone else null end
  from public.driver_network_settings network
  join public.driver_public_profiles profile on profile.user_id = network.user_id
  join public.profiles member on member.id = network.user_id
  where network.user_id <> auth.uid()
    and network.opted_in = true
    and network.verification_status = 'verified'
    and profile.is_published = true
    and member.is_professional_driver = true
    and member.is_blocked = false
    and public.account_has_feature('driver_network', network.user_id)
  order by profile.city nulls last, profile.display_name;
end;
$$;

revoke all on function public.driver_network_members() from public, anon;
grant execute on function public.driver_network_members() to authenticated;

create or replace function public.create_driver_referral(
  selected_reservation_id uuid,
  selected_recipient_user_id uuid,
  selected_sender_message text default null,
  consent_confirmed boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_reservation public.driver_reservations%rowtype;
  sender_profile public.driver_public_profiles%rowtype;
  recipient_profile public.driver_public_profiles%rowtype;
  sender_network public.driver_network_settings%rowtype;
  recipient_network public.driver_network_settings%rowtype;
  referral_id uuid;
begin
  if auth.uid() is null or not public.account_has_feature('driver_network', auth.uid()) then
    raise exception 'A Rede de Motoristas exige o plano Premium.' using errcode = '42501';
  end if;
  if not consent_confirmed then
    raise exception 'Confirme a autorização do passageiro antes de compartilhar os dados.' using errcode = '22023';
  end if;
  if selected_recipient_user_id = auth.uid() then
    raise exception 'Selecione outro motorista.' using errcode = '22023';
  end if;

  select * into source_reservation
  from public.driver_reservations
  where id = selected_reservation_id and driver_user_id = auth.uid();
  if source_reservation.id is null then
    raise exception 'Reserva não encontrada.' using errcode = 'P0002';
  end if;
  if source_reservation.status in ('completed','cancelled','declined') then
    raise exception 'Esta reserva já foi encerrada.' using errcode = '22023';
  end if;
  if not source_reservation.contact_consent then
    raise exception 'O passageiro não autorizou o uso dos dados de contato.' using errcode = '22023';
  end if;

  select * into sender_network from public.driver_network_settings where user_id = auth.uid();
  if sender_network.user_id is null or not sender_network.opted_in or sender_network.verification_status <> 'verified' then
    raise exception 'Seu perfil precisa estar verificado e ativo na rede.' using errcode = '42501';
  end if;

  select * into recipient_network from public.driver_network_settings where user_id = selected_recipient_user_id;
  if recipient_network.user_id is null or not recipient_network.opted_in or recipient_network.verification_status <> 'verified' or not recipient_network.accepts_referrals then
    raise exception 'O motorista selecionado não está recebendo indicações.' using errcode = '22023';
  end if;
  if not public.account_has_feature('driver_network', selected_recipient_user_id) then
    raise exception 'O motorista selecionado não possui acesso ativo à rede.' using errcode = '22023';
  end if;

  select * into sender_profile from public.driver_public_profiles where user_id = auth.uid() and is_published = true;
  select * into recipient_profile from public.driver_public_profiles where user_id = selected_recipient_user_id and is_published = true;
  if sender_profile.user_id is null or recipient_profile.user_id is null then
    raise exception 'Os dois motoristas precisam ter cartão profissional publicado.' using errcode = '22023';
  end if;

  insert into public.driver_referrals (
    sender_user_id,
    recipient_user_id,
    reservation_id,
    sender_display_name,
    recipient_display_name,
    sender_whatsapp_phone,
    recipient_whatsapp_phone,
    passenger_name,
    passenger_phone,
    origin,
    destination,
    travel_date,
    travel_time,
    trip_type,
    passengers,
    luggage,
    notes,
    sender_message,
    passenger_contact_consent
  ) values (
    auth.uid(),
    selected_recipient_user_id,
    source_reservation.id,
    sender_profile.display_name,
    recipient_profile.display_name,
    case when sender_network.share_contact_with_network then sender_profile.whatsapp_phone else null end,
    case when recipient_network.share_contact_with_network then recipient_profile.whatsapp_phone else null end,
    source_reservation.passenger_name,
    source_reservation.passenger_phone,
    source_reservation.origin,
    source_reservation.destination,
    source_reservation.travel_date,
    source_reservation.travel_time,
    source_reservation.trip_type,
    source_reservation.passengers,
    source_reservation.luggage,
    source_reservation.notes,
    nullif(trim(selected_sender_message), ''),
    true
  )
  returning id into referral_id;

  return referral_id;
end;
$$;

revoke all on function public.create_driver_referral(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.create_driver_referral(uuid, uuid, text, boolean) to authenticated;

create or replace function public.respond_driver_referral(
  selected_referral_id uuid,
  selected_response text,
  selected_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  referral public.driver_referrals%rowtype;
  new_reservation_id uuid;
  referral_note text;
begin
  if auth.uid() is null or not public.account_has_feature('driver_network', auth.uid()) then
    raise exception 'A Rede de Motoristas exige o plano Premium.' using errcode = '42501';
  end if;
  if selected_response not in ('accepted','declined') then
    raise exception 'Resposta inválida.' using errcode = '22023';
  end if;

  select * into referral
  from public.driver_referrals
  where id = selected_referral_id and recipient_user_id = auth.uid()
  for update;
  if referral.id is null then
    raise exception 'Indicação não encontrada.' using errcode = 'P0002';
  end if;
  if referral.status <> 'pending' then
    raise exception 'Esta indicação já foi respondida.' using errcode = '22023';
  end if;

  if selected_response = 'accepted' then
    if not exists (
      select 1
      from public.driver_network_settings recipient_network
      join public.driver_public_profiles recipient_profile on recipient_profile.user_id = recipient_network.user_id
      join public.profiles recipient_member on recipient_member.id = recipient_network.user_id
      where recipient_network.user_id = auth.uid()
        and recipient_network.opted_in = true
        and recipient_network.verification_status = 'verified'
        and recipient_profile.is_published = true
        and recipient_member.is_professional_driver = true
        and recipient_member.is_blocked = false
    ) then
      raise exception 'Ative e conclua a verificação do seu perfil antes de aceitar indicações.' using errcode = '42501';
    end if;

    if not referral.passenger_contact_consent then
      raise exception 'A indicação não possui autorização de contato.' using errcode = '22023';
    end if;

    referral_note := left(
      concat_ws(E'\n',
        'Indicação recebida de ' || referral.sender_display_name || ' pela Rede de Motoristas do JNE App.',
        referral.sender_message,
        referral.notes
      ),
      700
    );

    insert into public.driver_reservations (
      driver_user_id,
      passenger_name,
      passenger_phone,
      origin,
      destination,
      travel_date,
      travel_time,
      trip_type,
      passengers,
      luggage,
      notes,
      status,
      source,
      contact_consent
    ) values (
      auth.uid(),
      referral.passenger_name,
      referral.passenger_phone,
      referral.origin,
      referral.destination,
      referral.travel_date,
      referral.travel_time,
      referral.trip_type,
      referral.passengers,
      referral.luggage,
      referral_note,
      'new',
      'network',
      true
    )
    returning id into new_reservation_id;
  end if;

  update public.driver_referrals
  set status = selected_response,
      recipient_message = nullif(trim(selected_message), ''),
      accepted_reservation_id = new_reservation_id,
      responded_at = now(),
      updated_at = now()
  where id = selected_referral_id;

  return new_reservation_id;
end;
$$;

revoke all on function public.respond_driver_referral(uuid, text, text) from public, anon;
grant execute on function public.respond_driver_referral(uuid, text, text) to authenticated;

create or replace function public.cancel_driver_referral(selected_referral_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.driver_referrals
  set status = 'cancelled', responded_at = now(), updated_at = now()
  where id = selected_referral_id
    and sender_user_id = auth.uid()
    and status = 'pending';
  if not found then
    raise exception 'Indicação pendente não encontrada.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.cancel_driver_referral(uuid) from public, anon;
grant execute on function public.cancel_driver_referral(uuid) to authenticated;

create or replace function public.driver_network_metrics()
returns table (
  directory_views bigint,
  directory_contacts bigint,
  referrals_sent bigint,
  referrals_received bigint,
  referrals_accepted bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*) from public.driver_profile_events event where event.driver_user_id = auth.uid() and event.source = 'network' and event.event_type = 'profile_view'),
    (select count(*) from public.driver_profile_events event where event.driver_user_id = auth.uid() and event.source = 'network' and event.event_type in ('whatsapp_click','contact_save','reservation_cta','reservation_submitted')),
    (select count(*) from public.driver_referrals referral where referral.sender_user_id = auth.uid()),
    (select count(*) from public.driver_referrals referral where referral.recipient_user_id = auth.uid()),
    (select count(*) from public.driver_referrals referral where (referral.sender_user_id = auth.uid() or referral.recipient_user_id = auth.uid()) and referral.status = 'accepted');
$$;

revoke all on function public.driver_network_metrics() from public, anon;
grant execute on function public.driver_network_metrics() to authenticated;
