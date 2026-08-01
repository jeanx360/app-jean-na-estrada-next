-- JNE App 1.7.1 — Perfil profissional público, serviços, QR e reservas
-- Execute depois das migrações 1.5.0 e 1.6.0.

create extension if not exists pgcrypto;

create table if not exists public.driver_public_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  headline text,
  description text,
  city text,
  service_area text,
  whatsapp_phone text not null,
  vehicle_name text,
  vehicle_details text,
  seats smallint not null default 4 check (seats between 1 and 20),
  luggage_note text,
  amenities text[] not null default '{}'::text[],
  availability_note text,
  photo_url text,
  theme text not null default 'dark' check (theme in ('dark','blue','green')),
  is_published boolean not null default false,
  accepts_reservations boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_public_profiles_slug_format_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug) between 3 and 48),
  constraint driver_public_profiles_name_check
    check (length(trim(display_name)) between 2 and 80),
  constraint driver_public_profiles_phone_check
    check (whatsapp_phone ~ '^[0-9]{10,15}$'),
  constraint driver_public_profiles_text_lengths_check
    check (
      (headline is null or length(headline) <= 100)
      and (description is null or length(description) <= 500)
      and (city is null or length(city) <= 80)
      and (service_area is null or length(service_area) <= 180)
      and (vehicle_name is null or length(vehicle_name) <= 100)
      and (vehicle_details is null or length(vehicle_details) <= 180)
      and (luggage_note is null or length(luggage_note) <= 140)
      and (availability_note is null or length(availability_note) <= 180)
    )
);

create index if not exists driver_public_profiles_published_idx
  on public.driver_public_profiles(is_published, slug);

alter table public.driver_public_profiles enable row level security;
grant select on public.driver_public_profiles to anon, authenticated;
grant insert, update, delete on public.driver_public_profiles to authenticated;

drop policy if exists "Visitors read published driver profiles" on public.driver_public_profiles;
create policy "Visitors read published driver profiles"
on public.driver_public_profiles
for select
to anon, authenticated
using (
  user_id = auth.uid()
  or (
    is_published = true
    and exists (
      select 1 from public.profiles p
      where p.id = driver_public_profiles.user_id
        and p.is_professional_driver = true
        and p.is_blocked = false
    )
  )
);

drop policy if exists "Drivers create own public profile" on public.driver_public_profiles;
create policy "Drivers create own public profile"
on public.driver_public_profiles
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_professional_driver = true and p.is_blocked = false
  )
);

drop policy if exists "Drivers update own public profile" on public.driver_public_profiles;
create policy "Drivers update own public profile"
on public.driver_public_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_professional_driver = true and p.is_blocked = false
  )
);

drop policy if exists "Drivers delete own public profile" on public.driver_public_profiles;
create policy "Drivers delete own public profile"
on public.driver_public_profiles
for delete
to authenticated
using (user_id = auth.uid());

create table if not exists public.driver_service_packages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  pricing_type text not null default 'consult'
    check (pricing_type in ('fixed','starting_at','hourly','consult')),
  price numeric(12,2) check (price is null or price >= 0),
  route_summary text,
  duration_label text,
  includes text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_service_packages_text_lengths_check
    check (
      length(trim(title)) between 2 and 80
      and (description is null or length(description) <= 320)
      and (route_summary is null or length(route_summary) <= 140)
      and (duration_label is null or length(duration_label) <= 80)
      and (includes is null or length(includes) <= 240)
    ),
  constraint driver_service_packages_price_required_check
    check (pricing_type = 'consult' or price is not null)
);

create index if not exists driver_service_packages_user_order_idx
  on public.driver_service_packages(user_id, is_active desc, sort_order asc, created_at asc);

alter table public.driver_service_packages enable row level security;
grant select on public.driver_service_packages to anon, authenticated;
grant insert, update, delete on public.driver_service_packages to authenticated;

drop policy if exists "Visitors read active driver packages" on public.driver_service_packages;
create policy "Visitors read active driver packages"
on public.driver_service_packages
for select
to anon, authenticated
using (
  user_id = auth.uid()
  or (
    is_active = true
    and exists (
      select 1 from public.driver_public_profiles profile
      where profile.user_id = driver_service_packages.user_id
        and profile.is_published = true
    )
  )
);

drop policy if exists "Drivers create own packages" on public.driver_service_packages;
create policy "Drivers create own packages"
on public.driver_service_packages
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_professional_driver = true and p.is_blocked = false
  )
);

drop policy if exists "Drivers update own packages" on public.driver_service_packages;
create policy "Drivers update own packages"
on public.driver_service_packages
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_professional_driver = true and p.is_blocked = false
  )
);

drop policy if exists "Drivers delete own packages" on public.driver_service_packages;
create policy "Drivers delete own packages"
on public.driver_service_packages
for delete
to authenticated
using (user_id = auth.uid());

create table if not exists public.driver_reservations (
  id uuid primary key default gen_random_uuid(),
  driver_user_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid references public.driver_service_packages(id) on delete set null,
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
  status text not null default 'new'
    check (status in ('new','negotiating','quoted','confirmed','completed','cancelled','declined')),
  source text not null default 'profile' check (source in ('profile','qr','whatsapp')),
  quote_id uuid references public.driver_quotes(id) on delete set null,
  request_fingerprint_hash text,
  contact_consent boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_reservations_text_lengths_check
    check (
      length(trim(passenger_name)) between 2 and 80
      and passenger_phone ~ '^[0-9]{10,15}$'
      and (origin is null or length(origin) <= 180)
      and (destination is null or length(destination) <= 180)
      and (luggage is null or length(luggage) <= 180)
      and (notes is null or length(notes) <= 700)
    )
);

create index if not exists driver_reservations_driver_created_idx
  on public.driver_reservations(driver_user_id, created_at desc);
create index if not exists driver_reservations_driver_status_idx
  on public.driver_reservations(driver_user_id, status, travel_date asc, created_at desc);
create index if not exists driver_reservations_fingerprint_idx
  on public.driver_reservations(request_fingerprint_hash, created_at desc)
  where request_fingerprint_hash is not null;

alter table public.driver_reservations enable row level security;
revoke all on public.driver_reservations from anon;
grant select, update, delete on public.driver_reservations to authenticated;

drop policy if exists "Drivers read own reservations" on public.driver_reservations;
create policy "Drivers read own reservations"
on public.driver_reservations
for select
to authenticated
using (driver_user_id = auth.uid());

drop policy if exists "Drivers update own reservations" on public.driver_reservations;
create policy "Drivers update own reservations"
on public.driver_reservations
for update
to authenticated
using (driver_user_id = auth.uid())
with check (driver_user_id = auth.uid());

drop policy if exists "Drivers delete own reservations" on public.driver_reservations;
create policy "Drivers delete own reservations"
on public.driver_reservations
for delete
to authenticated
using (driver_user_id = auth.uid());

create table if not exists public.driver_profile_events (
  id bigint generated by default as identity primary key,
  driver_user_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid references public.driver_service_packages(id) on delete set null,
  event_type text not null check (event_type in ('profile_view','whatsapp_click','reservation_started','reservation_submitted')),
  source text not null default 'profile' check (source in ('profile','qr','shared_link')),
  visitor_hash text,
  created_at timestamptz not null default now()
);

create index if not exists driver_profile_events_driver_date_idx
  on public.driver_profile_events(driver_user_id, created_at desc);

alter table public.driver_profile_events enable row level security;
revoke all on public.driver_profile_events from anon, authenticated;
grant select on public.driver_profile_events to authenticated;

drop policy if exists "Drivers read own public profile events" on public.driver_profile_events;
create policy "Drivers read own public profile events"
on public.driver_profile_events
for select
to authenticated
using (driver_user_id = auth.uid());

-- Notificações direcionadas para reservas.
alter table public.notifications
  add column if not exists target_user_id uuid references public.profiles(id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_category_check;
alter table public.notifications add constraint notifications_category_check
  check (category in ('general','videos','tutorials','apps','benefits','reservations'));

create index if not exists notifications_target_user_idx
  on public.notifications(target_user_id, is_published, published_at desc)
  where target_user_id is not null;

drop policy if exists "Visitors read visible notifications" on public.notifications;
create policy "Visitors read visible notifications"
on public.notifications
for select
to anon, authenticated
using (
  is_published = true
  and published_at <= now()
  and (
    (target_user_id is null and public.can_read_notification(audience))
    or (auth.uid() is not null and target_user_id = auth.uid())
  )
);

drop policy if exists "Members create own notification state" on public.notification_reads;
create policy "Members create own notification state"
on public.notification_reads
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.notifications n
    where n.id = notification_id
      and n.is_published = true
      and n.published_at <= now()
      and (
        (n.target_user_id is null and public.can_read_notification(n.audience))
        or n.target_user_id = auth.uid()
      )
  )
);

-- Atualização automática de updated_at.
drop trigger if exists driver_public_profiles_set_updated_at on public.driver_public_profiles;
create trigger driver_public_profiles_set_updated_at
before update on public.driver_public_profiles
for each row execute function public.set_updated_at();

drop trigger if exists driver_service_packages_set_updated_at on public.driver_service_packages;
create trigger driver_service_packages_set_updated_at
before update on public.driver_service_packages
for each row execute function public.set_updated_at();

drop trigger if exists driver_reservations_set_updated_at on public.driver_reservations;
create trigger driver_reservations_set_updated_at
before update on public.driver_reservations
for each row execute function public.set_updated_at();

-- Dados públicos são limitados ao cartão profissional. Reservas e métricas permanecem privadas.

-- Preferência específica para solicitações de corrida.
alter table public.notification_preferences
  add column if not exists reservations_enabled boolean not null default true;

create or replace function public.save_push_subscription(
  subscription_endpoint text,
  subscription_p256dh text,
  subscription_auth_key text,
  subscription_categories jsonb default '{}'::jsonb,
  subscription_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
  normalized_categories jsonb;
begin
  if nullif(trim(subscription_endpoint), '') is null
     or nullif(trim(subscription_p256dh), '') is null
     or nullif(trim(subscription_auth_key), '') is null then
    raise exception 'Assinatura push inválida.' using errcode = '22023';
  end if;

  normalized_categories := jsonb_build_object(
    'general', coalesce((subscription_categories ->> 'general')::boolean, true),
    'videos', coalesce((subscription_categories ->> 'videos')::boolean, true),
    'tutorials', coalesce((subscription_categories ->> 'tutorials')::boolean, true),
    'apps', coalesce((subscription_categories ->> 'apps')::boolean, true),
    'benefits', coalesce((subscription_categories ->> 'benefits')::boolean, true),
    'reservations', coalesce((subscription_categories ->> 'reservations')::boolean, true)
  );

  insert into public.push_subscriptions (
    user_id, endpoint, p256dh, auth_key, categories, user_agent, is_active, last_seen_at
  ) values (
    auth.uid(), trim(subscription_endpoint), trim(subscription_p256dh), trim(subscription_auth_key),
    normalized_categories, nullif(trim(subscription_user_agent), ''), true, now()
  )
  on conflict (endpoint) do update set
    user_id = auth.uid(),
    p256dh = excluded.p256dh,
    auth_key = excluded.auth_key,
    categories = excluded.categories,
    user_agent = excluded.user_agent,
    is_active = true,
    last_seen_at = now()
  returning id into saved_id;

  if auth.uid() is not null then
    insert into public.notification_preferences (
      user_id, push_enabled, general_enabled, videos_enabled, tutorials_enabled,
      apps_enabled, benefits_enabled, reservations_enabled
    ) values (
      auth.uid(), true,
      coalesce((normalized_categories ->> 'general')::boolean, true),
      coalesce((normalized_categories ->> 'videos')::boolean, true),
      coalesce((normalized_categories ->> 'tutorials')::boolean, true),
      coalesce((normalized_categories ->> 'apps')::boolean, true),
      coalesce((normalized_categories ->> 'benefits')::boolean, true),
      coalesce((normalized_categories ->> 'reservations')::boolean, true)
    )
    on conflict (user_id) do update set
      push_enabled = true,
      general_enabled = excluded.general_enabled,
      videos_enabled = excluded.videos_enabled,
      tutorials_enabled = excluded.tutorials_enabled,
      apps_enabled = excluded.apps_enabled,
      benefits_enabled = excluded.benefits_enabled,
      reservations_enabled = excluded.reservations_enabled;
  end if;

  return saved_id;
end;
$$;

revoke all on function public.save_push_subscription(text, text, text, jsonb, text) from public;
grant execute on function public.save_push_subscription(text, text, text, jsonb, text) to anon, authenticated;
