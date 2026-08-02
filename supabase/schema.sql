-- JNE App 0.6.0
-- Execute este arquivo uma única vez no SQL Editor do Supabase.

create extension if not exists pgcrypto;

do $$
begin
  create type public.member_role as enum ('member', 'vip', 'admin');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Cria perfis para contas que já existiam antes deste SQL.
insert into public.profiles (id, full_name)
select id, nullif(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;

create or replace function public.has_any_role(required_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = any(required_roles)
  );
$$;

grant execute on function public.has_any_role(public.member_role[]) to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "Members can read own profile" on public.profiles;
create policy "Members can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.has_any_role(array['admin']::public.member_role[]));

-- A edição do perfil será liberada quando o painel estiver pronto.
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;

create table if not exists public.vip_content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'Geral',
  content jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists vip_content_set_updated_at on public.vip_content;
create trigger vip_content_set_updated_at
before update on public.vip_content
for each row execute function public.set_updated_at();

alter table public.vip_content enable row level security;

drop policy if exists "VIP members can read published content" on public.vip_content;
create policy "VIP members can read published content"
on public.vip_content
for select
to authenticated
using (
  is_published = true
  and public.has_any_role(array['vip', 'admin']::public.member_role[])
);

revoke all on public.vip_content from anon;
revoke insert, update, delete on public.vip_content from authenticated;
grant select on public.vip_content to authenticated;

insert into storage.buckets (id, name, public)
values ('vip-files', 'vip-files', false)
on conflict (id) do update set public = false;

drop policy if exists "VIP members can download private files" on storage.objects;
create policy "VIP members can download private files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vip-files'
  and public.has_any_role(array['vip', 'admin']::public.member_role[])
);

drop policy if exists "Admins can upload VIP files" on storage.objects;
create policy "Admins can upload VIP files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vip-files'
  and public.has_any_role(array['admin']::public.member_role[])
);

drop policy if exists "Admins can update VIP files" on storage.objects;
create policy "Admins can update VIP files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vip-files'
  and public.has_any_role(array['admin']::public.member_role[])
)
with check (
  bucket_id = 'vip-files'
  and public.has_any_role(array['admin']::public.member_role[])
);

drop policy if exists "Admins can delete VIP files" on storage.objects;
create policy "Admins can delete VIP files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vip-files'
  and public.has_any_role(array['admin']::public.member_role[])
);

-- Depois de criar sua conta, torne apenas a sua conta administradora:
-- update public.profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'SEU_EMAIL_AQUI');


-- Atualização consolidada da versão 0.7.0
-- JNE App 0.7.0 — painel administrativo, membros, convites, recados e conteúdo VIP
-- Execute uma única vez no SQL Editor do Supabase, depois do schema 0.6.0.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists is_blocked boolean not null default false,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array['admin']::public.member_role[]);
$$;

grant execute on function public.is_admin() to authenticated;

create or replace function public.admin_list_members()
returns table (
  id uuid,
  email text,
  full_name text,
  role public.member_role,
  is_blocked boolean,
  blocked_at timestamptz,
  blocked_reason text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.full_name,
    p.role,
    p.is_blocked,
    p.blocked_at,
    p.blocked_reason,
    p.created_at,
    p.updated_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

revoke all on function public.admin_list_members() from public, anon;
grant execute on function public.admin_list_members() to authenticated;

create or replace function public.admin_update_member_role(
  target_user_id uuid,
  new_role public.member_role
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

  if target_user_id = auth.uid() then
    raise exception 'Você não pode alterar o papel da própria conta.' using errcode = '22023';
  end if;

  update public.profiles
  set role = new_role
  where id = target_user_id;

  if not found then
    raise exception 'Membro não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_update_member_role(uuid, public.member_role) from public, anon;
grant execute on function public.admin_update_member_role(uuid, public.member_role) to authenticated;

create or replace function public.admin_set_member_blocked(
  target_user_id uuid,
  blocked boolean,
  reason text default null
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

  if target_user_id = auth.uid() then
    raise exception 'Você não pode bloquear a própria conta.' using errcode = '22023';
  end if;

  update public.profiles
  set
    is_blocked = blocked,
    blocked_at = case when blocked then now() else null end,
    blocked_reason = case when blocked then nullif(trim(reason), '') else null end
  where id = target_user_id;

  if not found then
    raise exception 'Membro não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_set_member_blocked(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_member_blocked(uuid, boolean, text) to authenticated;

create table if not exists public.vip_invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_hint text not null,
  label text not null,
  max_uses integer not null default 1 check (max_uses > 0 and max_uses <= 10000),
  use_count integer not null default 0 check (use_count >= 0),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists vip_invites_code_hash_idx on public.vip_invites(code_hash);
create index if not exists vip_invites_active_idx on public.vip_invites(is_active, expires_at);

alter table public.vip_invites enable row level security;
revoke all on public.vip_invites from anon;
grant select, insert, update, delete on public.vip_invites to authenticated;

drop policy if exists "Admins manage VIP invites" on public.vip_invites;
create policy "Admins manage VIP invites"
on public.vip_invites
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create table if not exists public.vip_invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.vip_invites(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (invite_id, user_id)
);

alter table public.vip_invite_redemptions enable row level security;
revoke all on public.vip_invite_redemptions from anon;
grant select on public.vip_invite_redemptions to authenticated;

drop policy if exists "Admins read VIP redemptions" on public.vip_invite_redemptions;
create policy "Admins read VIP redemptions"
on public.vip_invite_redemptions
for select
to authenticated
using (public.is_admin());

create or replace function public.redeem_vip_invite(invite_code text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized_code text;
  invite_row public.vip_invites%rowtype;
  current_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Faça login antes de usar um convite.' using errcode = '42501';
  end if;

  normalized_code := upper(trim(invite_code));
  if length(normalized_code) < 8 then
    raise exception 'Convite inválido.' using errcode = '22023';
  end if;

  select * into current_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if current_profile.id is null then
    raise exception 'Perfil não encontrado.' using errcode = 'P0002';
  end if;

  if current_profile.is_blocked then
    raise exception 'Esta conta está bloqueada.' using errcode = '42501';
  end if;

  if current_profile.role in ('vip', 'admin') then
    return 'already_vip';
  end if;

  select * into invite_row
  from public.vip_invites
  where code_hash = encode(digest(normalized_code, 'sha256'), 'hex')
  for update;

  if invite_row.id is null then
    raise exception 'Convite não encontrado.' using errcode = 'P0002';
  end if;

  if not invite_row.is_active then
    raise exception 'Este convite foi desativado.' using errcode = '22023';
  end if;

  if invite_row.expires_at is not null and invite_row.expires_at <= now() then
    raise exception 'Este convite expirou.' using errcode = '22023';
  end if;

  if invite_row.use_count >= invite_row.max_uses then
    raise exception 'Este convite atingiu o limite de usos.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.vip_invite_redemptions
    where invite_id = invite_row.id and user_id = auth.uid()
  ) then
    raise exception 'Este convite já foi usado por sua conta.' using errcode = '23505';
  end if;

  insert into public.vip_invite_redemptions (invite_id, user_id)
  values (invite_row.id, auth.uid());

  update public.vip_invites
  set use_count = use_count + 1
  where id = invite_row.id;

  update public.profiles
  set role = 'vip'
  where id = auth.uid();

  return 'success';
end;
$$;

revoke all on function public.redeem_vip_invite(text) from public, anon;
grant execute on function public.redeem_vip_invite(text) to authenticated;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  audience text not null default 'member' check (audience in ('all', 'member', 'vip', 'admin')),
  is_published boolean not null default false,
  published_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

alter table public.announcements enable row level security;
revoke all on public.announcements from anon;
grant select, insert, update, delete on public.announcements to authenticated;

drop policy if exists "Members read visible announcements" on public.announcements;
create policy "Members read visible announcements"
on public.announcements
for select
to authenticated
using (
  is_published = true
  and published_at <= now()
  and (
    audience in ('all', 'member')
    or (audience = 'vip' and public.has_any_role(array['vip', 'admin']::public.member_role[]))
    or (audience = 'admin' and public.is_admin())
  )
);

drop policy if exists "Admins manage announcements" on public.announcements;
create policy "Admins manage announcements"
on public.announcements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.vip_content
  add column if not exists content_type text not null default 'text'
    check (content_type in ('text', 'file', 'link')),
  add column if not exists file_path text,
  add column if not exists external_url text,
  add column if not exists is_featured boolean not null default false;

-- A política já existente continua entregando somente itens publicados para VIP/admin.
grant select, insert, update, delete on public.vip_content to authenticated;

drop policy if exists "Admins read all VIP content" on public.vip_content;
create policy "Admins read all VIP content"
on public.vip_content
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins insert VIP content" on public.vip_content;
create policy "Admins insert VIP content"
on public.vip_content
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins update VIP content" on public.vip_content;
create policy "Admins update VIP content"
on public.vip_content
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete VIP content" on public.vip_content;
create policy "Admins delete VIP content"
on public.vip_content
for delete
to authenticated
using (public.is_admin());

-- Garante que apenas administradores gerenciem arquivos do bucket privado.
-- As políticas de download/upload já foram criadas no schema 0.6.0.

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
  cancellation_reason text,
  cancelled_at timestamptz,
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
    ),
  constraint driver_reservations_cancellation_reason_length_check
    check (cancellation_reason is null or length(trim(cancellation_reason)) between 3 and 400)
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
  event_type text not null check (event_type in ('profile_view','whatsapp_click','reservation_cta','reservation_started','reservation_submitted','contact_save','profile_share')),
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

create index if not exists driver_reservations_driver_travel_date_idx
  on public.driver_reservations(driver_user_id, travel_date, travel_time, status);

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
    profile.id,
    count(event.id) filter (where event.event_type = 'profile_view')::bigint,
    count(event.id) filter (where event.event_type = 'profile_view' and event.created_at >= now() - interval '30 days')::bigint,
    count(event.id) filter (where event.event_type = 'whatsapp_click')::bigint,
    count(event.id) filter (where event.event_type = 'reservation_started')::bigint,
    count(event.id) filter (where event.event_type = 'reservation_submitted')::bigint,
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

-- JNE App 1.7.2 — vínculo entre reservas e viagens
alter table public.driver_trips
  add column if not exists reservation_id uuid references public.driver_reservations(id) on delete set null;
create unique index if not exists driver_trips_user_reservation_unique_idx
  on public.driver_trips(user_id, reservation_id)
  where reservation_id is not null;
create index if not exists driver_trips_reservation_idx
  on public.driver_trips(reservation_id)
  where reservation_id is not null;

create or replace function public.prepare_driver_trip_reservation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.reservation_id is not null and not exists (
    select 1 from public.driver_reservations reservation
    where reservation.id = new.reservation_id and reservation.driver_user_id = new.user_id
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
returns trigger language plpgsql security definer set search_path = public as $$
declare reservation_status text; quote_status text;
begin
  if new.status = 'completed' then reservation_status := 'completed'; quote_status := 'completed';
  elsif new.status = 'cancelled' then reservation_status := 'cancelled'; quote_status := 'cancelled';
  else reservation_status := 'confirmed'; quote_status := 'accepted';
  end if;
  if new.reservation_id is not null then
    update public.driver_reservations set status = reservation_status, updated_at = now()
    where id = new.reservation_id and driver_user_id = new.user_id;
  end if;
  if new.quote_id is not null then
    update public.driver_quotes set status = quote_status, updated_at = now()
    where id = new.quote_id and user_id = new.user_id;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_driver_reservation_from_trip() from public, anon, authenticated;
drop trigger if exists sync_driver_reservation_from_trip_trigger on public.driver_trips;
create trigger sync_driver_reservation_from_trip_trigger
after insert or update of status, reservation_id, quote_id on public.driver_trips
for each row execute function public.sync_driver_reservation_from_trip();

-- JNE App 1.7.3 — métricas próprias de navegação do site.
create table if not exists public.site_page_views (
  id bigint generated by default as identity primary key,
  path text not null check (path like '/%' and char_length(path) <= 180),
  visitor_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists site_page_views_created_at_idx on public.site_page_views(created_at desc);
create index if not exists site_page_views_path_created_at_idx on public.site_page_views(path, created_at desc);
create index if not exists site_page_views_visitor_created_at_idx on public.site_page_views(visitor_hash, created_at desc);
alter table public.site_page_views enable row level security;
revoke all on public.site_page_views from public, anon, authenticated;

create or replace function public.admin_site_traffic_daily(days_count integer default 30)
returns table (day date, page_views bigint, unique_visitors bigint)
language plpgsql security definer set search_path = public
as $$
declare safe_days integer := greatest(1, least(coalesce(days_count, 30), 90));
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário.' using errcode = '42501'; end if;
  return query
  with calendar as (
    select generate_series((now() at time zone 'America/Sao_Paulo')::date - (safe_days - 1), (now() at time zone 'America/Sao_Paulo')::date, interval '1 day')::date as metric_day
  )
  select calendar.metric_day, count(view_item.id)::bigint, count(distinct view_item.visitor_hash)::bigint
  from calendar
  left join public.site_page_views view_item on (view_item.created_at at time zone 'America/Sao_Paulo')::date = calendar.metric_day
  group by calendar.metric_day order by calendar.metric_day;
end; $$;

create or replace function public.admin_site_traffic_summary(days_count integer default 30)
returns table (page_views bigint, unique_visitors bigint, views_today bigint, visitors_today bigint, previous_period_views bigint)
language plpgsql security definer set search_path = public
as $$
declare safe_days integer := greatest(1, least(coalesce(days_count, 30), 90)); today_date date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário.' using errcode = '42501'; end if;
  return query select
    count(*) filter (where (created_at at time zone 'America/Sao_Paulo')::date >= today_date - (safe_days - 1))::bigint,
    count(distinct visitor_hash) filter (where (created_at at time zone 'America/Sao_Paulo')::date >= today_date - (safe_days - 1))::bigint,
    count(*) filter (where (created_at at time zone 'America/Sao_Paulo')::date = today_date)::bigint,
    count(distinct visitor_hash) filter (where (created_at at time zone 'America/Sao_Paulo')::date = today_date)::bigint,
    count(*) filter (where (created_at at time zone 'America/Sao_Paulo')::date between today_date - ((safe_days * 2) - 1) and today_date - safe_days)::bigint
  from public.site_page_views;
end; $$;

create or replace function public.admin_site_top_pages(days_count integer default 30, result_limit integer default 10)
returns table (path text, page_views bigint, unique_visitors bigint)
language plpgsql security definer set search_path = public
as $$
declare safe_days integer := greatest(1, least(coalesce(days_count, 30), 90)); safe_limit integer := greatest(1, least(coalesce(result_limit, 10), 50)); today_date date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário.' using errcode = '42501'; end if;
  return query select view_item.path, count(*)::bigint, count(distinct view_item.visitor_hash)::bigint
  from public.site_page_views view_item
  where (view_item.created_at at time zone 'America/Sao_Paulo')::date >= today_date - (safe_days - 1)
  group by view_item.path order by count(*) desc, view_item.path limit safe_limit;
end; $$;

revoke all on function public.admin_site_traffic_daily(integer) from public, anon;
revoke all on function public.admin_site_traffic_summary(integer) from public, anon;
revoke all on function public.admin_site_top_pages(integer, integer) from public, anon;
grant execute on function public.admin_site_traffic_daily(integer) to authenticated;
grant execute on function public.admin_site_traffic_summary(integer) to authenticated;
grant execute on function public.admin_site_top_pages(integer, integer) to authenticated;

-- =========================================================
-- JNE App 1.10.0 — Inteligência do motorista
-- Fonte: supabase/migrations/1.10.0_driver_intelligence.sql
-- =========================================================
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

-- ============================================================
-- Fonte: supabase/migrations/1.13.0_driver_customer_crm.sql
-- ============================================================
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
