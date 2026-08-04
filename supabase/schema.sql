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

-- ============================================================
-- JNE App 1.14.0 - Agenda e reservas avancadas
-- ============================================================

-- JNE App 1.14.0 - agenda e reservas avancadas.
-- Migration idempotente. Execute somente este arquivo em bancos existentes.

alter table public.driver_settings
  add column if not exists schedule_buffer_minutes integer not null default 30,
  add column if not exists default_reservation_duration_minutes integer not null default 60;

alter table public.driver_settings
  drop constraint if exists driver_settings_schedule_buffer_check,
  drop constraint if exists driver_settings_default_duration_check;

alter table public.driver_settings
  add constraint driver_settings_schedule_buffer_check
    check (schedule_buffer_minutes between 0 and 240),
  add constraint driver_settings_default_duration_check
    check (default_reservation_duration_minutes between 15 and 720);

alter table public.driver_reservations
  add column if not exists duration_minutes integer not null default 60,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.driver_reservations
  drop constraint if exists driver_reservations_duration_check,
  drop constraint if exists driver_reservations_status_check;

alter table public.driver_reservations
  add constraint driver_reservations_duration_check
    check (duration_minutes between 15 and 720),
  add constraint driver_reservations_status_check
    check (status in ('new','negotiating','quoted','confirmed','in_progress','completed','cancelled','declined'));

update public.driver_reservations reservation
set duration_minutes = coalesce(
  (
    select settings.default_reservation_duration_minutes
    from public.driver_settings settings
    where settings.user_id = reservation.driver_user_id
  ),
  60
)
where duration_minutes is null or duration_minutes < 15;

create table if not exists public.driver_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  block_date date not null,
  start_time time,
  end_time time,
  is_all_day boolean not null default false,
  title text not null default 'Indisponivel',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_schedule_blocks_title_check
    check (length(trim(title)) between 2 and 80),
  constraint driver_schedule_blocks_notes_check
    check (notes is null or length(notes) <= 300),
  constraint driver_schedule_blocks_time_check
    check (
      (is_all_day = true and start_time is null and end_time is null)
      or
      (is_all_day = false and start_time is not null and end_time is not null and end_time > start_time)
    )
);

create index if not exists driver_schedule_blocks_user_date_idx
  on public.driver_schedule_blocks(user_id, block_date, start_time);

alter table public.driver_schedule_blocks enable row level security;
revoke all on public.driver_schedule_blocks from anon;
grant select, insert, update, delete on public.driver_schedule_blocks to authenticated;

drop policy if exists "Drivers read own schedule blocks" on public.driver_schedule_blocks;
create policy "Drivers read own schedule blocks"
on public.driver_schedule_blocks
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Drivers create own schedule blocks" on public.driver_schedule_blocks;
create policy "Drivers create own schedule blocks"
on public.driver_schedule_blocks
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

drop policy if exists "Drivers update own schedule blocks" on public.driver_schedule_blocks;
create policy "Drivers update own schedule blocks"
on public.driver_schedule_blocks
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Drivers delete own schedule blocks" on public.driver_schedule_blocks;
create policy "Drivers delete own schedule blocks"
on public.driver_schedule_blocks
for delete
to authenticated
using (user_id = auth.uid());

drop trigger if exists driver_schedule_blocks_set_updated_at on public.driver_schedule_blocks;
create trigger driver_schedule_blocks_set_updated_at
before update on public.driver_schedule_blocks
for each row execute function public.set_updated_at();

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
  reservation_conflicts as (
    select
      'reservation'::text as conflict_type,
      reservation.id as conflict_id,
      reservation.passenger_name::text as conflict_label,
      (reservation.travel_date + reservation.travel_time)::timestamp as starts_at,
      (reservation.travel_date + reservation.travel_time)::timestamp
        + make_interval(mins => reservation.duration_minutes) as ends_at
    from public.driver_reservations reservation
    cross join candidate
    where reservation.driver_user_id = p_driver_user_id
      and reservation.id is distinct from p_exclude_reservation_id
      and reservation.travel_date is not null
      and reservation.travel_time is not null
      and reservation.status in ('new','negotiating','quoted','confirmed','in_progress')
      and candidate.starts_at < (
        (reservation.travel_date + reservation.travel_time)::timestamp
        + make_interval(mins => reservation.duration_minutes + candidate.buffer_minutes)
      )
      and candidate.ends_at + make_interval(mins => candidate.buffer_minutes) >
        (reservation.travel_date + reservation.travel_time)::timestamp
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
begin
  if new.travel_date is null
     or new.travel_time is null
     or new.status in ('completed','cancelled','declined') then
    return new;
  end if;

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

  return new;
end;
$$;

drop trigger if exists enforce_driver_reservation_schedule_trigger on public.driver_reservations;
create trigger enforce_driver_reservation_schedule_trigger
before insert or update of driver_user_id, travel_date, travel_time, duration_minutes, status
on public.driver_reservations
for each row execute function public.enforce_driver_reservation_schedule();

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

  if new.status = 'in_progress' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.started_at := coalesce(new.started_at, now());
  end if;

  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.completed_at := coalesce(new.completed_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_driver_reservation_terminal_state_trigger on public.driver_reservations;
create trigger prepare_driver_reservation_terminal_state_trigger
before insert or update of status, cancellation_reason, cancelled_at, started_at, completed_at
on public.driver_reservations
for each row execute function public.prepare_driver_reservation_terminal_state();

create index if not exists driver_reservations_driver_schedule_idx
  on public.driver_reservations(driver_user_id, travel_date, travel_time, status)
  where travel_date is not null and travel_time is not null;

-- =========================================================
-- JNE App 1.15.0 - Orcamentos profissionais
-- Fonte: supabase/migrations/1.15.0_driver_professional_quotes.sql
-- =========================================================
-- JNE App 1.15.0 - orcamentos profissionais.
-- Migration idempotente. Execute somente este arquivo em bancos existentes.

alter table public.driver_quotes
  add column if not exists customer_phone text,
  add column if not exists customer_id uuid references public.driver_customers(id) on delete set null,
  add column if not exists reservation_id uuid references public.driver_reservations(id) on delete set null,
  add column if not exists public_token uuid default gen_random_uuid(),
  add column if not exists valid_until timestamptz default (now() + interval '7 days'),
  add column if not exists travel_time time,
  add column if not exists conditions text,
  add column if not exists line_items jsonb default '[]'::jsonb,
  add column if not exists view_count integer not null default 0,
  add column if not exists sent_at timestamptz,
  add column if not exists viewed_at timestamptz,
  add column if not exists responded_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists response_message text,
  add column if not exists version integer not null default 1,
  add column if not exists source text,
  add column if not exists campaign_id uuid references public.driver_marketing_campaigns(id) on delete set null;

update public.driver_quotes
set public_token = gen_random_uuid()
where public_token is null;

update public.driver_quotes
set valid_until = coalesce(created_at, now()) + interval '7 days'
where valid_until is null;

update public.driver_quotes
set line_items = jsonb_build_array(
  jsonb_build_object('kind', 'distance', 'label', 'Deslocamento', 'amount', distance_charge),
  jsonb_build_object('kind', 'travel_time', 'label', 'Tempo em viagem', 'amount', time_charge),
  jsonb_build_object('kind', 'waiting', 'label', 'Tempo de espera', 'amount', waiting_charge),
  jsonb_build_object('kind', 'maintenance', 'label', 'Reserva operacional e manutencao', 'amount', maintenance_reserve),
  jsonb_build_object('kind', 'other', 'label', 'Pedagios e custos adicionais', 'amount', direct_costs),
  jsonb_build_object('kind', 'discount', 'label', 'Desconto', 'amount', -discount)
)
where line_items is null or line_items = '[]'::jsonb;

update public.driver_quotes quote
set
  reservation_id = coalesce(quote.reservation_id, reservation.id),
  customer_id = coalesce(quote.customer_id, reservation.customer_id),
  customer_phone = coalesce(quote.customer_phone, reservation.passenger_phone),
  travel_time = coalesce(quote.travel_time, reservation.travel_time),
  source = coalesce(quote.source, reservation.source),
  campaign_id = coalesce(quote.campaign_id, reservation.campaign_id)
from public.driver_reservations reservation
where reservation.quote_id = quote.id
  and reservation.driver_user_id = quote.user_id;

alter table public.driver_quotes
  alter column public_token set not null,
  alter column valid_until set not null,
  alter column line_items set not null;

alter table public.driver_quotes
  drop constraint if exists driver_quotes_status_check,
  drop constraint if exists driver_quotes_customer_phone_check,
  drop constraint if exists driver_quotes_conditions_check,
  drop constraint if exists driver_quotes_line_items_check,
  drop constraint if exists driver_quotes_view_count_check,
  drop constraint if exists driver_quotes_version_check,
  drop constraint if exists driver_quotes_response_message_check;

alter table public.driver_quotes
  add constraint driver_quotes_status_check
    check (status in ('draft','sent','viewed','accepted','declined','expired','completed','cancelled')),
  add constraint driver_quotes_customer_phone_check
    check (customer_phone is null or customer_phone ~ '^[0-9]{10,15}$'),
  add constraint driver_quotes_conditions_check
    check (conditions is null or length(conditions) <= 2500),
  add constraint driver_quotes_line_items_check
    check (jsonb_typeof(line_items) = 'array'),
  add constraint driver_quotes_view_count_check
    check (view_count >= 0),
  add constraint driver_quotes_version_check
    check (version >= 1),
  add constraint driver_quotes_response_message_check
    check (response_message is null or length(response_message) <= 500);

create unique index if not exists driver_quotes_public_token_uidx
  on public.driver_quotes(public_token);

create index if not exists driver_quotes_user_validity_idx
  on public.driver_quotes(user_id, status, valid_until, created_at desc);

create index if not exists driver_quotes_customer_idx
  on public.driver_quotes(user_id, customer_id, created_at desc)
  where customer_id is not null;

create index if not exists driver_quotes_reservation_idx
  on public.driver_quotes(reservation_id)
  where reservation_id is not null;

create table if not exists public.driver_quote_events (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.driver_quotes(id) on delete cascade,
  driver_user_id uuid not null references public.profiles(id) on delete cascade,
  actor_type text not null default 'system' check (actor_type in ('driver','passenger','system')),
  event_type text not null,
  previous_status text,
  new_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint driver_quote_events_type_check check (length(trim(event_type)) between 2 and 80),
  constraint driver_quote_events_metadata_check check (jsonb_typeof(metadata) = 'object')
);

create index if not exists driver_quote_events_quote_created_idx
  on public.driver_quote_events(quote_id, created_at desc);

alter table public.driver_quote_events enable row level security;
revoke all on public.driver_quote_events from anon;
grant select, insert on public.driver_quote_events to authenticated;

 drop policy if exists "Drivers read own quote events" on public.driver_quote_events;
create policy "Drivers read own quote events"
on public.driver_quote_events
for select
to authenticated
using (driver_user_id = auth.uid());

drop policy if exists "Drivers create own quote events" on public.driver_quote_events;
create policy "Drivers create own quote events"
on public.driver_quote_events
for insert
to authenticated
with check (driver_user_id = auth.uid());

create or replace function public.prepare_driver_quote_workflow()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();

  if new.status = 'sent' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.sent_at := coalesce(new.sent_at, now());
    new.cancelled_at := null;
  elsif new.status = 'viewed' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.viewed_at := coalesce(new.viewed_at, now());
  elsif new.status = 'accepted' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.accepted_at := coalesce(new.accepted_at, now());
    new.responded_at := coalesce(new.responded_at, now());
  elsif new.status = 'declined' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.declined_at := coalesce(new.declined_at, now());
    new.responded_at := coalesce(new.responded_at, now());
  elsif new.status = 'cancelled' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  end if;

  if new.status = 'draft' and tg_op = 'UPDATE' and old.status is distinct from new.status then
    new.sent_at := null;
    new.viewed_at := null;
    new.responded_at := null;
    new.accepted_at := null;
    new.declined_at := null;
    new.cancelled_at := null;
    new.response_message := null;
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_driver_quote_workflow_trigger on public.driver_quotes;
create trigger prepare_driver_quote_workflow_trigger
before insert or update on public.driver_quotes
for each row execute function public.prepare_driver_quote_workflow();

create or replace function public.get_public_driver_quote(quote_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  token_uuid uuid;
  quote_row public.driver_quotes%rowtype;
  driver_payload jsonb;
begin
  begin
    token_uuid := quote_token::uuid;
  exception when others then
    return null;
  end;

  select * into quote_row
  from public.driver_quotes
  where public_token = token_uuid;

  if quote_row.id is null or quote_row.status = 'draft' then
    return null;
  end if;

  if quote_row.status in ('sent','viewed') and quote_row.valid_until < now() then
    update public.driver_quotes
    set status = 'expired'
    where id = quote_row.id
    returning * into quote_row;

    insert into public.driver_quote_events(quote_id, driver_user_id, actor_type, event_type, previous_status, new_status)
    values (quote_row.id, quote_row.user_id, 'system', 'quote_expired', 'viewed', 'expired');
  elsif quote_row.status in ('sent','viewed') then
    update public.driver_quotes
    set
      status = case when status = 'sent' then 'viewed' else status end,
      viewed_at = coalesce(viewed_at, now()),
      view_count = view_count + 1
    where id = quote_row.id
    returning * into quote_row;

    insert into public.driver_quote_events(quote_id, driver_user_id, actor_type, event_type, previous_status, new_status, metadata)
    values (
      quote_row.id,
      quote_row.user_id,
      'passenger',
      'quote_viewed',
      case when quote_row.view_count = 1 then 'sent' else 'viewed' end,
      'viewed',
      jsonb_build_object('view_count', quote_row.view_count)
    );
  end if;

  select jsonb_build_object(
    'display_name', coalesce(profile.display_name, member.full_name, 'Motorista profissional'),
    'slug', profile.slug,
    'headline', profile.headline,
    'city', profile.city,
    'service_area', profile.service_area,
    'whatsapp_phone', profile.whatsapp_phone,
    'vehicle_name', profile.vehicle_name,
    'vehicle_details', profile.vehicle_details,
    'photo_url', profile.photo_url
  ) into driver_payload
  from public.profiles member
  left join public.driver_public_profiles profile on profile.user_id = member.id
  where member.id = quote_row.user_id;

  return jsonb_build_object(
    'id', quote_row.id,
    'customer_name', quote_row.customer_name,
    'origin', quote_row.origin,
    'destination', quote_row.destination,
    'travel_date', quote_row.travel_date,
    'travel_time', quote_row.travel_time,
    'trip_type', quote_row.trip_type,
    'total_distance_km', quote_row.total_distance_km,
    'billable_hours', quote_row.billable_hours,
    'rounded_total', quote_row.rounded_total,
    'discount', quote_row.discount,
    'status', quote_row.status,
    'notes', quote_row.notes,
    'conditions', quote_row.conditions,
    'line_items', quote_row.line_items,
    'valid_until', quote_row.valid_until,
    'view_count', quote_row.view_count,
    'created_at', quote_row.created_at,
    'responded_at', quote_row.responded_at,
    'response_message', quote_row.response_message,
    'driver', coalesce(driver_payload, '{}'::jsonb)
  );
end;
$$;

create or replace function public.respond_public_driver_quote(
  quote_token text,
  decision text,
  passenger_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  token_uuid uuid;
  quote_row public.driver_quotes%rowtype;
  target_status text;
  reservation_uuid uuid;
  reservation_customer_id uuid;
  safe_source text;
  safe_phone text;
  duration_value integer;
begin
  begin
    token_uuid := quote_token::uuid;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'Orcamento invalido.');
  end;

  if decision not in ('accepted','declined') then
    return jsonb_build_object('ok', false, 'error', 'Resposta invalida.');
  end if;

  select * into quote_row
  from public.driver_quotes
  where public_token = token_uuid
  for update;

  if quote_row.id is null then
    return jsonb_build_object('ok', false, 'error', 'Orcamento nao encontrado.');
  end if;

  if quote_row.status in ('sent','viewed') and quote_row.valid_until < now() then
    update public.driver_quotes set status = 'expired' where id = quote_row.id;
    return jsonb_build_object('ok', false, 'status', 'expired', 'error', 'Este orcamento expirou.');
  end if;

  if quote_row.status not in ('sent','viewed') then
    return jsonb_build_object('ok', false, 'status', quote_row.status, 'error', 'Esta proposta nao aceita nova resposta.');
  end if;

  target_status := decision;
  update public.driver_quotes
  set
    status = target_status,
    response_message = nullif(trim(coalesce(passenger_message, '')), ''),
    responded_at = now(),
    accepted_at = case when target_status = 'accepted' then now() else accepted_at end,
    declined_at = case when target_status = 'declined' then now() else declined_at end
  where id = quote_row.id
  returning * into quote_row;

  if target_status = 'accepted' then
    reservation_uuid := quote_row.reservation_id;

    if reservation_uuid is null then
      select reservation.id into reservation_uuid
      from public.driver_reservations reservation
      where reservation.quote_id = quote_row.id
        and reservation.driver_user_id = quote_row.user_id
      order by reservation.created_at desc
      limit 1;
    end if;

    if reservation_uuid is not null then
      update public.driver_reservations
      set status = 'confirmed', quote_id = quote_row.id, updated_at = now()
      where id = reservation_uuid and driver_user_id = quote_row.user_id;
    else
      safe_phone := regexp_replace(coalesce(quote_row.customer_phone, ''), '[^0-9]', '', 'g');
      safe_source := case when quote_row.source in ('profile','qr','shared_link','whatsapp') then quote_row.source else 'shared_link' end;
      duration_value := greatest(15, least(coalesce(round(quote_row.billable_hours * 60)::integer, 60), 720));

      if length(safe_phone) between 10 and 15 then
        begin
          insert into public.driver_reservations(
            driver_user_id, passenger_name, passenger_phone, origin, destination,
            travel_date, travel_time, trip_type, passengers, notes, status,
            duration_minutes, source, campaign_id, customer_id, quote_id, contact_consent
          ) values (
            quote_row.user_id, coalesce(nullif(trim(quote_row.customer_name), ''), 'Passageiro'), safe_phone,
            quote_row.origin, quote_row.destination, quote_row.travel_date, quote_row.travel_time,
            quote_row.trip_type, 1, quote_row.notes, 'confirmed', duration_value,
            safe_source, quote_row.campaign_id, quote_row.customer_id, quote_row.id, true
          ) returning id, customer_id into reservation_uuid, reservation_customer_id;
        exception when others then
          insert into public.driver_reservations(
            driver_user_id, passenger_name, passenger_phone, origin, destination,
            travel_date, travel_time, trip_type, passengers, notes, status,
            duration_minutes, source, campaign_id, customer_id, quote_id, contact_consent
          ) values (
            quote_row.user_id, coalesce(nullif(trim(quote_row.customer_name), ''), 'Passageiro'), safe_phone,
            quote_row.origin, quote_row.destination, null, null,
            quote_row.trip_type, 1,
            concat_ws(E'\n', quote_row.notes, 'Data e horario precisam ser confirmados por possivel conflito de agenda.'),
            'confirmed', duration_value, safe_source, quote_row.campaign_id,
            quote_row.customer_id, quote_row.id, true
          ) returning id, customer_id into reservation_uuid, reservation_customer_id;
        end;
      end if;
    end if;

    if reservation_uuid is not null then
      update public.driver_quotes
      set reservation_id = reservation_uuid,
          customer_id = coalesce(customer_id, reservation_customer_id)
      where id = quote_row.id;
    end if;
  end if;

  insert into public.driver_quote_events(
    quote_id, driver_user_id, actor_type, event_type, previous_status, new_status, metadata
  ) values (
    quote_row.id,
    quote_row.user_id,
    'passenger',
    case when target_status = 'accepted' then 'passenger_accepted' else 'passenger_declined' end,
    case when quote_row.viewed_at is null then 'sent' else 'viewed' end,
    target_status,
    jsonb_build_object('reservation_id', reservation_uuid, 'has_message', passenger_message is not null)
  );

  return jsonb_build_object('ok', true, 'status', target_status, 'reservation_id', reservation_uuid);
end;
$$;

revoke all on function public.get_public_driver_quote(text) from public;
revoke all on function public.respond_public_driver_quote(text, text, text) from public;
grant execute on function public.get_public_driver_quote(text) to anon, authenticated;
grant execute on function public.respond_public_driver_quote(text, text, text) to anon, authenticated;

-- Registra um evento inicial para orcamentos anteriores sem historico.
insert into public.driver_quote_events(quote_id, driver_user_id, actor_type, event_type, new_status, metadata, created_at)
select quote.id, quote.user_id, 'system', 'quote_imported', quote.status, jsonb_build_object('version', '1.15.0'), quote.created_at
from public.driver_quotes quote
where not exists (
  select 1 from public.driver_quote_events event where event.quote_id = quote.id
);

-- ============================================================
-- JNE App 1.16.0 - Financeiro profissional do motorista
-- ============================================================

create table if not exists public.driver_finance_goals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  month_start date not null,
  gross_goal numeric(12,2) not null default 0,
  net_goal numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, month_start),
  constraint driver_finance_goals_month_start_check
    check (extract(day from month_start) = 1),
  constraint driver_finance_goals_gross_check
    check (gross_goal >= 0 and gross_goal <= 99999999.99),
  constraint driver_finance_goals_net_check
    check (net_goal >= 0 and net_goal <= 99999999.99)
);

create index if not exists driver_finance_goals_user_month_idx
  on public.driver_finance_goals(user_id, month_start desc);

alter table public.driver_finance_goals enable row level security;
grant select, insert, update, delete on public.driver_finance_goals to authenticated;
revoke all on public.driver_finance_goals from anon;

drop policy if exists "Drivers read own finance goals" on public.driver_finance_goals;
create policy "Drivers read own finance goals"
on public.driver_finance_goals
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Drivers create own finance goals" on public.driver_finance_goals;
create policy "Drivers create own finance goals"
on public.driver_finance_goals
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Drivers update own finance goals" on public.driver_finance_goals;
create policy "Drivers update own finance goals"
on public.driver_finance_goals
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Drivers delete own finance goals" on public.driver_finance_goals;
create policy "Drivers delete own finance goals"
on public.driver_finance_goals
for delete
to authenticated
using (user_id = auth.uid());

drop trigger if exists driver_finance_goals_set_updated_at on public.driver_finance_goals;
create trigger driver_finance_goals_set_updated_at
before update on public.driver_finance_goals
for each row execute function public.set_updated_at();

comment on table public.driver_finance_goals is
  'Metas mensais privadas de faturamento e resultado liquido do motorista profissional.';

-- JNE App 1.17.0 — Planos, assinaturas e controle de acesso
-- Execute depois da migration 1.16.0.

create extension if not exists pgcrypto;

create table if not exists public.app_plan_catalog (
  code text primary key check (code in ('free', 'professional', 'premium')),
  name text not null,
  description text not null,
  trial_days integer not null default 0 check (trial_days between 0 and 90),
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.app_plan_catalog (code, name, description, trial_days, features, sort_order, is_active)
values
  (
    'free',
    'Gratuito',
    'Perfil profissional, QR Code, calculadora e reservas básicas para começar.',
    0,
    '["driver_profile","qr_card","basic_reservations","calculator","basic_settings"]'::jsonb,
    10,
    true
  ),
  (
    'professional',
    'Profissional',
    'CRM, agenda, orçamentos, financeiro e exportações para organizar a operação.',
    14,
    '["driver_profile","qr_card","basic_reservations","calculator","basic_settings","crm","schedule","quotes","finance","exports"]'::jsonb,
    20,
    true
  ),
  (
    'premium',
    'Premium',
    'Todos os recursos profissionais, inteligência, campanhas e relatórios avançados.',
    14,
    '["driver_profile","qr_card","basic_reservations","calculator","basic_settings","crm","schedule","quotes","finance","exports","performance","marketing_campaigns","advanced_reports","customization"]'::jsonb,
    30,
    true
  )
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  features = excluded.features,
  sort_order = excluded.sort_order,
  updated_at = now();

drop trigger if exists app_plan_catalog_set_updated_at on public.app_plan_catalog;
create trigger app_plan_catalog_set_updated_at
before update on public.app_plan_catalog
for each row execute function public.set_updated_at();

create table if not exists public.account_subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan_code text not null references public.app_plan_catalog(code) on update cascade,
  status text not null default 'active' check (status in ('trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  trial_ends_at timestamptz,
  notes text check (notes is null or length(notes) <= 600),
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at),
  check (trial_ends_at is null or trial_ends_at > starts_at)
);

create index if not exists account_subscriptions_plan_status_idx
  on public.account_subscriptions(plan_code, status, expires_at);

create table if not exists public.account_subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('created','upgraded','downgraded','renewed','trial_started','activated','suspended','cancelled','expired','cleared','updated')),
  old_plan_code text,
  new_plan_code text,
  old_status text,
  new_status text,
  notes text check (notes is null or length(notes) <= 600),
  actor_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists account_subscription_events_user_date_idx
  on public.account_subscription_events(user_id, created_at desc);

drop trigger if exists account_subscriptions_set_updated_at on public.account_subscriptions;
create trigger account_subscriptions_set_updated_at
before update on public.account_subscriptions
for each row execute function public.set_updated_at();

-- Evita retirar recursos de quem já usava a área profissional antes dos planos.
-- Contas profissionais existentes começam com o período de teste configurado.
insert into public.account_subscriptions (
  user_id,
  plan_code,
  status,
  starts_at,
  trial_ends_at,
  notes
)
select
  profile.id,
  'professional',
  'trial',
  now(),
  now() + make_interval(days => greatest(professional_plan.trial_days, 1)),
  'Período de transição criado automaticamente na versão 1.17.0.'
from public.profiles profile
cross join lateral (
  select trial_days
  from public.app_plan_catalog
  where code = 'professional'
) professional_plan
where profile.is_professional_driver = true
  and profile.is_blocked = false
  and profile.role not in ('admin', 'vip')
  and not exists (
    select 1
    from public.account_subscriptions subscription
    where subscription.user_id = profile.id
  )
  and not exists (
    select 1
    from public.vip_entitlements entitlement
    where entitlement.user_id = profile.id
      and entitlement.is_active = true
      and entitlement.starts_at <= now()
      and (entitlement.expires_at is null or entitlement.expires_at > now())
  )
on conflict (user_id) do nothing;

insert into public.account_subscription_events (
  user_id,
  event_type,
  old_plan_code,
  new_plan_code,
  old_status,
  new_status,
  notes,
  actor_user_id
)
select
  subscription.user_id,
  'trial_started',
  null,
  subscription.plan_code,
  null,
  subscription.status,
  subscription.notes,
  null
from public.account_subscriptions subscription
where subscription.notes = 'Período de transição criado automaticamente na versão 1.17.0.'
  and not exists (
    select 1
    from public.account_subscription_events event
    where event.user_id = subscription.user_id
      and event.event_type = 'trial_started'
      and event.notes = subscription.notes
  );

alter table public.app_plan_catalog enable row level security;
alter table public.account_subscriptions enable row level security;
alter table public.account_subscription_events enable row level security;

revoke all on public.app_plan_catalog from anon;
revoke all on public.account_subscriptions from anon;
revoke all on public.account_subscription_events from anon;
grant select on public.app_plan_catalog to anon, authenticated;
grant select on public.account_subscriptions to authenticated;
grant select on public.account_subscription_events to authenticated;
grant update on public.app_plan_catalog to authenticated;

drop policy if exists "Visitors read active app plans" on public.app_plan_catalog;
create policy "Visitors read active app plans"
on public.app_plan_catalog
for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "Admins update app plans" on public.app_plan_catalog;
create policy "Admins update app plans"
on public.app_plan_catalog
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members read own account subscription" on public.account_subscriptions;
create policy "Members read own account subscription"
on public.account_subscriptions
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Members read own account subscription history" on public.account_subscription_events;
create policy "Members read own account subscription history"
on public.account_subscription_events
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create or replace function public.current_account_plan(target_user_id uuid default auth.uid())
returns table (
  plan_code text,
  plan_name text,
  status text,
  starts_at timestamptz,
  expires_at timestamptz,
  trial_ends_at timestamptz,
  source text,
  features jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.profiles%rowtype;
  assignment public.account_subscriptions%rowtype;
  selected_code text := 'free';
  selected_status text := 'active';
  selected_starts timestamptz := null;
  selected_expires timestamptz := null;
  selected_trial_ends timestamptz := null;
  selected_source text := 'default';
begin
  if target_user_id is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;

  if auth.uid() is not null and auth.uid() <> target_user_id and not public.is_admin() then
    raise exception 'Você não pode consultar o plano de outra conta.' using errcode = '42501';
  end if;

  select * into target_profile
  from public.profiles
  where id = target_user_id;

  if target_profile.id is null then
    raise exception 'Perfil não encontrado.' using errcode = 'P0002';
  end if;

  if target_profile.role = 'admin' then
    selected_code := 'premium';
    selected_status := 'active';
    selected_source := 'admin';
  else
    select * into assignment
    from public.account_subscriptions
    where user_id = target_user_id;

    if assignment.user_id is not null then
      selected_starts := assignment.starts_at;
      selected_expires := assignment.expires_at;
      selected_trial_ends := assignment.trial_ends_at;
      selected_status := assignment.status;
      selected_source := 'assignment';

      if assignment.status = 'active'
        and assignment.starts_at <= now()
        and (assignment.expires_at is null or assignment.expires_at > now())
      then
        selected_code := assignment.plan_code;
      elsif assignment.status = 'trial'
        and assignment.starts_at <= now()
        and assignment.trial_ends_at is not null
        and assignment.trial_ends_at > now()
        and (assignment.expires_at is null or assignment.expires_at > now())
      then
        selected_code := assignment.plan_code;
      else
        selected_code := 'free';
        selected_source := 'assignment_inactive';
      end if;
    elsif target_profile.role = 'vip' or exists (
      select 1
      from public.vip_entitlements entitlement
      where entitlement.user_id = target_user_id
        and entitlement.is_active = true
        and entitlement.starts_at <= now()
        and (entitlement.expires_at is null or entitlement.expires_at > now())
    ) then
      -- Compatibilidade: todo VIP já existente mantém os recursos que possuía.
      selected_code := 'premium';
      selected_status := 'active';
      selected_source := 'legacy_vip';
    end if;
  end if;

  return query
  select
    plan.code,
    plan.name,
    selected_status,
    selected_starts,
    selected_expires,
    selected_trial_ends,
    selected_source,
    plan.features
  from public.app_plan_catalog plan
  where plan.code = selected_code;
end;
$$;

revoke all on function public.current_account_plan(uuid) from public;
grant execute on function public.current_account_plan(uuid) to authenticated;

create or replace function public.account_has_feature(
  feature_key text,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((resolved.features ? feature_key), false)
  from public.current_account_plan(target_user_id) resolved;
$$;

revoke all on function public.account_has_feature(text, uuid) from public;
grant execute on function public.account_has_feature(text, uuid) to authenticated;

create or replace function public.admin_set_account_subscription(
  target_user_id uuid,
  selected_plan_code text,
  selected_status text,
  selected_starts_at timestamptz default now(),
  selected_expires_at timestamptz default null,
  selected_trial_ends_at timestamptz default null,
  admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row public.account_subscriptions%rowtype;
  plan_row public.app_plan_catalog%rowtype;
  normalized_starts timestamptz := coalesce(selected_starts_at, now());
  normalized_trial_ends timestamptz := selected_trial_ends_at;
  event_name text := 'updated';
  old_rank integer := 0;
  new_rank integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  if selected_status not in ('trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired') then
    raise exception 'Status de assinatura inválido.' using errcode = '22023';
  end if;

  select * into plan_row from public.app_plan_catalog where code = selected_plan_code;
  if plan_row.code is null then
    raise exception 'Plano não encontrado.' using errcode = 'P0002';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'Membro não encontrado.' using errcode = 'P0002';
  end if;

  if selected_status = 'trial' and normalized_trial_ends is null then
    normalized_trial_ends := normalized_starts + make_interval(days => greatest(plan_row.trial_days, 1));
  end if;

  if selected_expires_at is not null and selected_expires_at <= normalized_starts then
    raise exception 'A validade precisa ser posterior ao início.' using errcode = '22023';
  end if;

  if normalized_trial_ends is not null and normalized_trial_ends <= normalized_starts then
    raise exception 'O fim do teste precisa ser posterior ao início.' using errcode = '22023';
  end if;

  select * into old_row
  from public.account_subscriptions
  where user_id = target_user_id
  for update;

  old_rank := case old_row.plan_code when 'free' then 1 when 'professional' then 2 when 'premium' then 3 else 0 end;
  new_rank := case selected_plan_code when 'free' then 1 when 'professional' then 2 when 'premium' then 3 else 0 end;

  if old_row.user_id is null then
    event_name := case when selected_status = 'trial' then 'trial_started' else 'created' end;
  elsif selected_status = 'suspended' then
    event_name := 'suspended';
  elsif selected_status = 'cancelled' then
    event_name := 'cancelled';
  elsif selected_status = 'expired' then
    event_name := 'expired';
  elsif old_row.status <> 'active' and selected_status = 'active' then
    event_name := 'activated';
  elsif new_rank > old_rank then
    event_name := 'upgraded';
  elsif new_rank < old_rank then
    event_name := 'downgraded';
  elsif selected_expires_at is distinct from old_row.expires_at then
    event_name := 'renewed';
  end if;

  insert into public.account_subscriptions (
    user_id, plan_code, status, starts_at, expires_at, trial_ends_at, notes, assigned_by
  ) values (
    target_user_id,
    selected_plan_code,
    selected_status,
    normalized_starts,
    selected_expires_at,
    case when selected_status = 'trial' then normalized_trial_ends else null end,
    nullif(trim(admin_notes), ''),
    auth.uid()
  )
  on conflict (user_id) do update set
    plan_code = excluded.plan_code,
    status = excluded.status,
    starts_at = excluded.starts_at,
    expires_at = excluded.expires_at,
    trial_ends_at = excluded.trial_ends_at,
    notes = excluded.notes,
    assigned_by = excluded.assigned_by,
    updated_at = now();

  insert into public.account_subscription_events (
    user_id, event_type, old_plan_code, new_plan_code, old_status, new_status, notes, actor_user_id
  ) values (
    target_user_id,
    event_name,
    old_row.plan_code,
    selected_plan_code,
    old_row.status,
    selected_status,
    nullif(trim(admin_notes), ''),
    auth.uid()
  );
end;
$$;

revoke all on function public.admin_set_account_subscription(uuid, text, text, timestamptz, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.admin_set_account_subscription(uuid, text, text, timestamptz, timestamptz, timestamptz, text) to authenticated;

create or replace function public.admin_clear_account_subscription(
  target_user_id uuid,
  admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row public.account_subscriptions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  select * into old_row
  from public.account_subscriptions
  where user_id = target_user_id
  for update;

  if old_row.user_id is null then
    return;
  end if;

  delete from public.account_subscriptions where user_id = target_user_id;

  insert into public.account_subscription_events (
    user_id, event_type, old_plan_code, new_plan_code, old_status, new_status, notes, actor_user_id
  ) values (
    target_user_id, 'cleared', old_row.plan_code, null, old_row.status, null, nullif(trim(admin_notes), ''), auth.uid()
  );
end;
$$;

revoke all on function public.admin_clear_account_subscription(uuid, text) from public, anon;
grant execute on function public.admin_clear_account_subscription(uuid, text) to authenticated;

-- =========================================================
-- ENFORCEMENT DE RECURSOS PROFISSIONAIS NO BANCO
-- =========================================================

-- CRM
drop policy if exists "Drivers read own customers" on public.driver_customers;
create policy "Drivers read own customers" on public.driver_customers
for select to authenticated
using (user_id = auth.uid() and public.account_has_feature('crm', auth.uid()));

drop policy if exists "Drivers create own customers" on public.driver_customers;
create policy "Drivers create own customers" on public.driver_customers
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.account_has_feature('crm', auth.uid())
  and exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid() and profile.is_professional_driver = true and profile.is_blocked = false
  )
);

drop policy if exists "Drivers update own customers" on public.driver_customers;
create policy "Drivers update own customers" on public.driver_customers
for update to authenticated
using (user_id = auth.uid() and public.account_has_feature('crm', auth.uid()))
with check (user_id = auth.uid() and public.account_has_feature('crm', auth.uid()));

drop policy if exists "Drivers delete own customers" on public.driver_customers;
create policy "Drivers delete own customers" on public.driver_customers
for delete to authenticated
using (user_id = auth.uid() and public.account_has_feature('crm', auth.uid()));

-- Agenda
drop policy if exists "Drivers read own schedule blocks" on public.driver_schedule_blocks;
create policy "Drivers read own schedule blocks" on public.driver_schedule_blocks
for select to authenticated
using (user_id = auth.uid() and public.account_has_feature('schedule', auth.uid()));

drop policy if exists "Drivers create own schedule blocks" on public.driver_schedule_blocks;
create policy "Drivers create own schedule blocks" on public.driver_schedule_blocks
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.account_has_feature('schedule', auth.uid())
  and exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid() and profile.is_professional_driver = true and profile.is_blocked = false
  )
);

drop policy if exists "Drivers update own schedule blocks" on public.driver_schedule_blocks;
create policy "Drivers update own schedule blocks" on public.driver_schedule_blocks
for update to authenticated
using (user_id = auth.uid() and public.account_has_feature('schedule', auth.uid()))
with check (user_id = auth.uid() and public.account_has_feature('schedule', auth.uid()));

drop policy if exists "Drivers delete own schedule blocks" on public.driver_schedule_blocks;
create policy "Drivers delete own schedule blocks" on public.driver_schedule_blocks
for delete to authenticated
using (user_id = auth.uid() and public.account_has_feature('schedule', auth.uid()));

-- Orçamentos
drop policy if exists "Drivers read own quotes" on public.driver_quotes;
create policy "Drivers read own quotes" on public.driver_quotes
for select to authenticated
using (user_id = auth.uid() and public.account_has_feature('quotes', auth.uid()));

drop policy if exists "Drivers create own quotes" on public.driver_quotes;
create policy "Drivers create own quotes" on public.driver_quotes
for insert to authenticated
with check (user_id = auth.uid() and public.account_has_feature('quotes', auth.uid()));

drop policy if exists "Drivers update own quotes" on public.driver_quotes;
create policy "Drivers update own quotes" on public.driver_quotes
for update to authenticated
using (user_id = auth.uid() and public.account_has_feature('quotes', auth.uid()))
with check (user_id = auth.uid() and public.account_has_feature('quotes', auth.uid()));

drop policy if exists "Drivers delete own quotes" on public.driver_quotes;
create policy "Drivers delete own quotes" on public.driver_quotes
for delete to authenticated
using (user_id = auth.uid() and public.account_has_feature('quotes', auth.uid()));

-- Financeiro
drop policy if exists "Drivers read own trips" on public.driver_trips;
create policy "Drivers read own trips" on public.driver_trips
for select to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers create own trips" on public.driver_trips;
create policy "Drivers create own trips" on public.driver_trips
for insert to authenticated
with check (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers update own trips" on public.driver_trips;
create policy "Drivers update own trips" on public.driver_trips
for update to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()))
with check (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers delete own trips" on public.driver_trips;
create policy "Drivers delete own trips" on public.driver_trips
for delete to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers read own financial entries" on public.driver_financial_entries;
create policy "Drivers read own financial entries" on public.driver_financial_entries
for select to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers create own financial entries" on public.driver_financial_entries;
create policy "Drivers create own financial entries" on public.driver_financial_entries
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.account_has_feature('finance', auth.uid())
  and exists (select 1 from public.driver_trips trip where trip.id = trip_id and trip.user_id = auth.uid())
);

drop policy if exists "Drivers update own financial entries" on public.driver_financial_entries;
create policy "Drivers update own financial entries" on public.driver_financial_entries
for update to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()))
with check (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers delete own financial entries" on public.driver_financial_entries;
create policy "Drivers delete own financial entries" on public.driver_financial_entries
for delete to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers read own finance goals" on public.driver_finance_goals;
create policy "Drivers read own finance goals" on public.driver_finance_goals
for select to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers create own finance goals" on public.driver_finance_goals;
create policy "Drivers create own finance goals" on public.driver_finance_goals
for insert to authenticated
with check (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers update own finance goals" on public.driver_finance_goals;
create policy "Drivers update own finance goals" on public.driver_finance_goals
for update to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()))
with check (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers delete own finance goals" on public.driver_finance_goals;
create policy "Drivers delete own finance goals" on public.driver_finance_goals
for delete to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

-- Campanhas
drop policy if exists "Drivers read own marketing campaigns" on public.driver_marketing_campaigns;
create policy "Drivers read own marketing campaigns" on public.driver_marketing_campaigns
for select to authenticated
using (user_id = auth.uid() and public.account_has_feature('marketing_campaigns', auth.uid()));

drop policy if exists "Drivers create own marketing campaigns" on public.driver_marketing_campaigns;
create policy "Drivers create own marketing campaigns" on public.driver_marketing_campaigns
for insert to authenticated
with check (user_id = auth.uid() and public.account_has_feature('marketing_campaigns', auth.uid()));

drop policy if exists "Drivers update own marketing campaigns" on public.driver_marketing_campaigns;
create policy "Drivers update own marketing campaigns" on public.driver_marketing_campaigns
for update to authenticated
using (user_id = auth.uid() and public.account_has_feature('marketing_campaigns', auth.uid()))
with check (user_id = auth.uid() and public.account_has_feature('marketing_campaigns', auth.uid()));

drop policy if exists "Drivers delete own marketing campaigns" on public.driver_marketing_campaigns;
create policy "Drivers delete own marketing campaigns" on public.driver_marketing_campaigns
for delete to authenticated
using (user_id = auth.uid() and public.account_has_feature('marketing_campaigns', auth.uid()));

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

-- ============================================================
-- Release 1.19.0 - automacoes e notificacoes
-- ============================================================

-- JNE App 1.19.0 - automacoes internas e central profissional de notificacoes.
-- Migration idempotente. Execute somente este arquivo em bancos existentes.

create extension if not exists pgcrypto;

-- A central existente continua atendendo avisos editoriais e passa a suportar
-- notificacoes operacionais direcionadas ao motorista.
alter table public.notifications
  add column if not exists priority text not null default 'normal',
  add column if not exists automation_type text,
  add column if not exists source_entity_type text,
  add column if not exists source_entity_id uuid,
  add column if not exists expires_at timestamptz;

alter table public.notifications
  drop constraint if exists notifications_category_check,
  drop constraint if exists notifications_priority_check,
  drop constraint if exists notifications_automation_type_length_check,
  drop constraint if exists notifications_source_entity_type_length_check;

alter table public.notifications
  add constraint notifications_category_check
    check (category in (
      'general','videos','tutorials','apps','benefits','reservations',
      'agenda','customers','quotes','finance','network','subscription','administration'
    )),
  add constraint notifications_priority_check
    check (priority in ('low','normal','high','urgent')),
  add constraint notifications_automation_type_length_check
    check (automation_type is null or length(automation_type) between 2 and 80),
  add constraint notifications_source_entity_type_length_check
    check (source_entity_type is null or length(source_entity_type) between 2 and 80);

create index if not exists notifications_driver_automation_idx
  on public.notifications(target_user_id, category, is_published, published_at desc)
  where target_user_id is not null and automation_type is not null;

create index if not exists notifications_automation_source_idx
  on public.notifications(automation_type, source_entity_type, source_entity_id)
  where automation_type is not null;

create index if not exists notifications_expiration_idx
  on public.notifications(expires_at)
  where expires_at is not null and is_published = true;

-- Preferencias exclusivas dos alertas de trabalho. As preferencias de Web Push
-- existentes permanecem separadas e nao sao alteradas por esta release.
create table if not exists public.driver_notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  agenda_enabled boolean not null default true,
  customers_enabled boolean not null default true,
  quotes_enabled boolean not null default true,
  finance_enabled boolean not null default true,
  network_enabled boolean not null default true,
  subscription_enabled boolean not null default true,
  administration_enabled boolean not null default true,
  reservation_upcoming_hours integer not null default 24,
  reservation_unconfirmed_hours integer not null default 48,
  quote_expiring_hours integer not null default 48,
  customer_inactive_days integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_notification_preferences_windows_check check (
    reservation_upcoming_hours between 1 and 168
    and reservation_unconfirmed_hours between 1 and 336
    and quote_expiring_hours between 1 and 336
    and customer_inactive_days between 7 and 365
  )
);

create index if not exists driver_notification_preferences_updated_idx
  on public.driver_notification_preferences(updated_at desc);

drop trigger if exists driver_notification_preferences_set_updated_at
  on public.driver_notification_preferences;
create trigger driver_notification_preferences_set_updated_at
before update on public.driver_notification_preferences
for each row execute function public.set_updated_at();

alter table public.driver_notification_preferences enable row level security;
grant select, insert, update, delete on public.driver_notification_preferences to authenticated;
revoke all on public.driver_notification_preferences from anon;

drop policy if exists "Drivers read own automation preferences"
  on public.driver_notification_preferences;
create policy "Drivers read own automation preferences"
on public.driver_notification_preferences
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Drivers create own automation preferences"
  on public.driver_notification_preferences;
create policy "Drivers create own automation preferences"
on public.driver_notification_preferences
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Drivers update own automation preferences"
  on public.driver_notification_preferences;
create policy "Drivers update own automation preferences"
on public.driver_notification_preferences
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Drivers delete own automation preferences"
  on public.driver_notification_preferences;
create policy "Drivers delete own automation preferences"
on public.driver_notification_preferences
for delete to authenticated
using (user_id = auth.uid());

-- Historico tecnico das execucoes. Os dados sao visiveis apenas para admins.
create table if not exists public.driver_automation_runs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null default gen_random_uuid(),
  run_source text not null default 'cron'
    check (run_source in ('cron','admin','manual','test')),
  status text not null default 'running'
    check (status in ('running','completed','partial','failed')),
  scanned_count integer not null default 0 check (scanned_count >= 0),
  created_count integer not null default 0 check (created_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  details jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint driver_automation_runs_error_length_check
    check (error_message is null or length(error_message) <= 2000)
);

create unique index if not exists driver_automation_runs_request_unique_idx
  on public.driver_automation_runs(request_id);
create index if not exists driver_automation_runs_started_idx
  on public.driver_automation_runs(started_at desc, status);

alter table public.driver_automation_runs enable row level security;
revoke all on public.driver_automation_runs from anon, authenticated;
grant select on public.driver_automation_runs to authenticated;

drop policy if exists "Admins read automation runs" on public.driver_automation_runs;
create policy "Admins read automation runs"
on public.driver_automation_runs
for select to authenticated
using (public.is_admin());

create or replace function public.driver_notification_category_enabled(
  target_user_id uuid,
  selected_category text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case selected_category
        when 'agenda' then preference.agenda_enabled
        when 'customers' then preference.customers_enabled
        when 'quotes' then preference.quotes_enabled
        when 'finance' then preference.finance_enabled
        when 'network' then preference.network_enabled
        when 'subscription' then preference.subscription_enabled
        when 'administration' then preference.administration_enabled
        else true
      end
      from public.driver_notification_preferences preference
      where preference.user_id = target_user_id
    ),
    true
  );
$$;

revoke all on function public.driver_notification_category_enabled(uuid, text)
  from public, anon, authenticated;
grant execute on function public.driver_notification_category_enabled(uuid, text)
  to service_role;

create or replace function public.create_driver_automation_notification(
  target_user_id uuid,
  selected_category text,
  selected_priority text,
  selected_automation_type text,
  selected_title text,
  selected_message text,
  selected_action_url text,
  selected_source_key text,
  selected_source_entity_type text default null,
  selected_source_entity_id uuid default null,
  selected_expires_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  if target_user_id is null
     or nullif(trim(selected_source_key), '') is null
     or nullif(trim(selected_title), '') is null
     or nullif(trim(selected_message), '') is null then
    return false;
  end if;

  if not public.driver_notification_category_enabled(target_user_id, selected_category) then
    return false;
  end if;

  insert into public.notifications (
    title,
    message,
    audience,
    category,
    priority,
    action_url,
    is_published,
    is_featured,
    published_at,
    push_requested,
    source_key,
    target_user_id,
    automation_type,
    source_entity_type,
    source_entity_id,
    expires_at
  ) values (
    left(trim(selected_title), 180),
    left(trim(selected_message), 1000),
    'member',
    selected_category,
    selected_priority,
    nullif(trim(selected_action_url), ''),
    true,
    false,
    now(),
    false,
    trim(selected_source_key),
    target_user_id,
    trim(selected_automation_type),
    nullif(trim(selected_source_entity_type), ''),
    selected_source_entity_id,
    selected_expires_at
  )
  on conflict (source_key) where source_key is not null do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count > 0;
end;
$$;

revoke all on function public.create_driver_automation_notification(
  uuid, text, text, text, text, text, text, text, text, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_driver_automation_notification(
  uuid, text, text, text, text, text, text, text, text, uuid, timestamptz
) to service_role;

-- Alertas imediatos para indicacoes recebidas.
create or replace function public.notify_driver_referral_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_driver_automation_notification(
    new.recipient_user_id,
    'network',
    'high',
    'referral_received',
    'Nova indicação recebida',
    'Uma nova oportunidade foi enviada por ' || new.sender_display_name || '. Analise os dados antes de responder.',
    '/motorista/rede',
    'automation:referral_received:' || new.id::text,
    'driver_referral',
    new.id,
    now() + interval '30 days'
  );
  return new;
end;
$$;

revoke all on function public.notify_driver_referral_created()
  from public, anon, authenticated;

drop trigger if exists notify_driver_referral_created_trigger on public.driver_referrals;
create trigger notify_driver_referral_created_trigger
after insert on public.driver_referrals
for each row execute function public.notify_driver_referral_created();

-- Mudancas de plano feitas pelo administrador entram na central do proprio usuario.
create or replace function public.notify_account_subscription_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_title text;
  event_message text;
  event_priority text;
begin
  event_title := case new.event_type
    when 'upgraded' then 'Seu plano foi atualizado'
    when 'downgraded' then 'Seu plano foi alterado'
    when 'renewed' then 'Assinatura renovada'
    when 'trial_started' then 'Período de teste iniciado'
    when 'activated' then 'Assinatura ativada'
    when 'suspended' then 'Assinatura suspensa'
    when 'cancelled' then 'Assinatura cancelada'
    when 'expired' then 'Assinatura expirada'
    when 'cleared' then 'Atribuição de plano removida'
    else 'Configuração do plano atualizada'
  end;

  event_priority := case
    when new.event_type in ('suspended','cancelled','expired','downgraded','cleared') then 'high'
    else 'normal'
  end;

  event_message := concat_ws(
    ' ',
    case when new.new_plan_code is not null then 'Plano atual: ' || new.new_plan_code || '.' else null end,
    case when new.new_status is not null then 'Situação: ' || new.new_status || '.' else null end,
    nullif(trim(new.notes), '')
  );

  perform public.create_driver_automation_notification(
    new.user_id,
    'administration',
    event_priority,
    'subscription_changed',
    event_title,
    coalesce(nullif(trim(event_message), ''), 'Consulte a área de membros para conferir os detalhes.'),
    '/membros',
    'automation:subscription_event:' || new.id::text,
    'account_subscription_event',
    new.id,
    now() + interval '90 days'
  );
  return new;
end;
$$;

revoke all on function public.notify_account_subscription_event()
  from public, anon, authenticated;

drop trigger if exists notify_account_subscription_event_trigger
  on public.account_subscription_events;
create trigger notify_account_subscription_event_trigger
after insert on public.account_subscription_events
for each row execute function public.notify_account_subscription_event();

-- Execucao consolidada e idempotente. A chave source_key da tabela notifications
-- impede duplicacoes entre execucoes repetidas.
create or replace function public.run_driver_notification_automations(
  selected_source text default 'cron'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  run_id uuid;
  normalized_source text;
  item record;
  created_notification boolean;
  scanned_total integer := 0;
  created_total integer := 0;
  skipped_total integer := 0;
  disabled_total integer := 0;
  hidden_total integer := 0;
  current_week text := to_char(current_date, 'IYYY-IW');
  current_month text := to_char(current_date, 'YYYY-MM');
  preference record;
begin
  normalized_source := case
    when selected_source in ('cron','admin','manual','test') then selected_source
    else 'manual'
  end;

  insert into public.driver_automation_runs(run_source, status)
  values (normalized_source, 'running')
  returning id into run_id;

  begin
    -- Oculta alertas operacionais que ja perderam a validade.
    update public.notifications
    set is_published = false,
        updated_at = now()
    where automation_type is not null
      and is_published = true
      and expires_at is not null
      and expires_at <= now();
    get diagnostics hidden_total = row_count;

    -- Reservas confirmadas nas proximas horas.
    for item in
      select
        reservation.*,
        coalesce(preference.reservation_upcoming_hours, 24) as window_hours,
        ((reservation.travel_date + coalesce(reservation.travel_time, time '12:00'))
          at time zone 'America/Sao_Paulo') as scheduled_at
      from public.driver_reservations reservation
      left join public.driver_notification_preferences preference
        on preference.user_id = reservation.driver_user_id
      where reservation.status = 'confirmed'
        and reservation.travel_date is not null
        and ((reservation.travel_date + coalesce(reservation.travel_time, time '12:00'))
          at time zone 'America/Sao_Paulo') > now()
        and ((reservation.travel_date + coalesce(reservation.travel_time, time '12:00'))
          at time zone 'America/Sao_Paulo')
          <= now() + make_interval(hours => coalesce(preference.reservation_upcoming_hours, 24))
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.driver_user_id,
        'agenda',
        'high',
        'reservation_upcoming',
        'Reserva nas próximas ' || item.window_hours || ' horas',
        'O serviço de ' || item.passenger_name || ' está agendado para '
          || to_char(item.travel_date, 'DD/MM/YYYY')
          || case when item.travel_time is not null then ' às ' || to_char(item.travel_time, 'HH24:MI') else '' end || '.',
        '/motorista/reservas/' || item.id::text,
        'automation:reservation_upcoming:' || item.id::text || ':'
          || item.travel_date::text || ':' || coalesce(item.travel_time::text, 'sem-hora'),
        'driver_reservation',
        item.id,
        item.scheduled_at + interval '6 hours'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    -- Reservas ainda nao confirmadas e proximas da data prevista.
    for item in
      select
        reservation.*,
        coalesce(preference.reservation_unconfirmed_hours, 48) as window_hours,
        ((reservation.travel_date + coalesce(reservation.travel_time, time '12:00'))
          at time zone 'America/Sao_Paulo') as scheduled_at
      from public.driver_reservations reservation
      left join public.driver_notification_preferences preference
        on preference.user_id = reservation.driver_user_id
      where reservation.status in ('new','negotiating','quoted')
        and reservation.travel_date is not null
        and reservation.created_at <= now() - interval '2 hours'
        and ((reservation.travel_date + coalesce(reservation.travel_time, time '12:00'))
          at time zone 'America/Sao_Paulo') > now()
        and ((reservation.travel_date + coalesce(reservation.travel_time, time '12:00'))
          at time zone 'America/Sao_Paulo')
          <= now() + make_interval(hours => coalesce(preference.reservation_unconfirmed_hours, 48))
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.driver_user_id,
        'agenda',
        'urgent',
        'reservation_unconfirmed',
        'Reserva próxima ainda não confirmada',
        'A solicitação de ' || item.passenger_name || ' acontece em menos de '
          || item.window_hours || ' horas e ainda está como ' || item.status || '.',
        '/motorista/reservas/' || item.id::text,
        'automation:reservation_unconfirmed:' || item.id::text || ':'
          || item.travel_date::text || ':' || coalesce(item.travel_time::text, 'sem-hora'),
        'driver_reservation',
        item.id,
        item.scheduled_at + interval '6 hours'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    -- Orcamentos enviados e proximos do vencimento.
    for item in
      select quote.*, coalesce(preference.quote_expiring_hours, 48) as window_hours
      from public.driver_quotes quote
      left join public.driver_notification_preferences preference
        on preference.user_id = quote.user_id
      where quote.status in ('sent','viewed')
        and quote.valid_until > now()
        and quote.valid_until <= now() + make_interval(hours => coalesce(preference.quote_expiring_hours, 48))
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.user_id,
        'quotes',
        'high',
        'quote_expiring',
        'Orçamento próximo do vencimento',
        'O orçamento de ' || coalesce(nullif(item.customer_name, ''), 'um cliente')
          || ' vence em menos de ' || item.window_hours || ' horas.',
        '/motorista/orcamentos/' || item.id::text,
        'automation:quote_expiring:' || item.id::text || ':' || item.valid_until::date::text,
        'driver_quote',
        item.id,
        item.valid_until + interval '24 hours'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    -- Orcamentos vencidos que ainda aguardam resposta.
    for item in
      select quote.*
      from public.driver_quotes quote
      where quote.status in ('sent','viewed')
        and quote.valid_until <= now()
        and quote.valid_until >= now() - interval '30 days'
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.user_id,
        'quotes',
        'normal',
        'quote_expired',
        'Orçamento vencido sem resposta',
        'O orçamento de ' || coalesce(nullif(item.customer_name, ''), 'um cliente')
          || ' venceu. Revise antes de fazer um novo contato.',
        '/motorista/orcamentos/' || item.id::text,
        'automation:quote_expired:' || item.id::text || ':' || item.valid_until::date::text,
        'driver_quote',
        item.id,
        now() + interval '30 days'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    -- Pagamentos pendentes recebem no maximo um lembrete por semana.
    for item in
      select trip.*
      from public.driver_trips trip
      where trip.status = 'completed'
        and trip.payment_status in ('unpaid','partial')
        and trip.pending_amount > 0
        and coalesce(trip.travel_date, trip.created_at::date) >= current_date - 180
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.user_id,
        'finance',
        'high',
        'payment_pending',
        'Pagamento de viagem pendente',
        'Existe um saldo de R$ ' || replace(to_char(item.pending_amount, 'FM999999990D00'), '.', ',')
          || ' aguardando recebimento.',
        '/motorista/financeiro/' || item.id::text,
        'automation:payment_pending:' || item.id::text || ':' || current_week,
        'driver_trip',
        item.id,
        date_trunc('week', now()) + interval '8 days'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    -- Clientes sem contato recente recebem no maximo um lembrete por mes.
    for item in
      select customer.*, coalesce(preference.customer_inactive_days, 30) as inactive_days
      from public.driver_customers customer
      left join public.driver_notification_preferences preference
        on preference.user_id = customer.user_id
      where customer.is_archived = false
        and customer.contact_consent = true
        and customer.last_contact_at
          <= now() - make_interval(days => coalesce(preference.customer_inactive_days, 30))
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.user_id,
        'customers',
        'low',
        'customer_follow_up',
        'Cliente sem contato recente',
        item.display_name || ' não recebe um acompanhamento há pelo menos '
          || item.inactive_days || ' dias.',
        '/motorista/clientes/' || item.id::text,
        'automation:customer_follow_up:' || item.id::text || ':' || current_month,
        'driver_customer',
        item.id,
        date_trunc('month', now()) + interval '40 days'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    -- Backfill idempotente de indicacoes pendentes, inclusive as criadas antes do trigger.
    for item in
      select referral.*
      from public.driver_referrals referral
      where referral.status = 'pending'
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.recipient_user_id,
        'network',
        'high',
        'referral_received',
        'Indicação aguardando resposta',
        'A indicação enviada por ' || item.sender_display_name || ' ainda precisa ser analisada.',
        '/motorista/rede',
        'automation:referral_received:' || item.id::text,
        'driver_referral',
        item.id,
        item.created_at + interval '30 days'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    -- Assinaturas e testes proximos do vencimento.
    for item in
      select subscription.*,
        case when subscription.status = 'trial'
          then coalesce(subscription.trial_ends_at, subscription.expires_at)
          else subscription.expires_at
        end as deadline
      from public.account_subscriptions subscription
      where subscription.status in ('trial','active','past_due')
        and (
          case when subscription.status = 'trial'
            then coalesce(subscription.trial_ends_at, subscription.expires_at)
            else subscription.expires_at
          end
        ) > now()
        and (
          case when subscription.status = 'trial'
            then coalesce(subscription.trial_ends_at, subscription.expires_at)
            else subscription.expires_at
          end
        ) <= now() + interval '7 days'
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.user_id,
        'subscription',
        case when item.status = 'past_due' then 'urgent' else 'high' end,
        'subscription_expiring',
        case when item.status = 'trial' then 'Período de teste próximo do fim'
          else 'Assinatura próxima do vencimento' end,
        'O acesso ao plano ' || item.plan_code || ' está previsto para vencer em '
          || to_char(item.deadline at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') || '.',
        '/membros',
        'automation:subscription_expiring:' || item.user_id::text || ':' || item.deadline::date::text,
        'account_subscription',
        item.user_id,
        item.deadline + interval '14 days'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    -- Revisao financeira mensal para motoristas com acesso ao modulo.
    for item in
      select profile.id as user_id
      from public.profiles profile
      where profile.is_professional_driver = true
        and profile.is_blocked = false
        and public.account_has_feature('finance', profile.id)
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.user_id,
        'finance',
        'normal',
        'monthly_finance_review',
        'Revisão financeira do mês',
        'Confira faturamento, despesas, resultado líquido e o progresso das suas metas.',
        '/motorista/financeiro',
        'automation:monthly_finance_review:' || item.user_id::text || ':' || current_month,
        'finance_month',
        null,
        date_trunc('month', now()) + interval '40 days'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    update public.driver_automation_runs
    set status = 'completed',
        scanned_count = scanned_total,
        created_count = created_total,
        skipped_count = skipped_total,
        details = jsonb_build_object(
          'expired_hidden', hidden_total,
          'execution_month', current_month,
          'execution_week', current_week
        ),
        completed_at = now()
    where id = run_id;

    return jsonb_build_object(
      'ok', true,
      'runId', run_id,
      'source', normalized_source,
      'scanned', scanned_total,
      'created', created_total,
      'skipped', skipped_total,
      'expiredHidden', hidden_total
    );
  exception when others then
    update public.driver_automation_runs
    set status = 'failed',
        scanned_count = scanned_total,
        created_count = created_total,
        skipped_count = skipped_total,
        error_count = 1,
        error_message = left(sqlerrm, 2000),
        details = jsonb_build_object('sqlstate', sqlstate),
        completed_at = now()
    where id = run_id;

    return jsonb_build_object(
      'ok', false,
      'runId', run_id,
      'source', normalized_source,
      'scanned', scanned_total,
      'created', created_total,
      'skipped', skipped_total,
      'error', sqlerrm,
      'sqlstate', sqlstate
    );
  end;
end;
$$;

revoke all on function public.run_driver_notification_automations(text)
  from public, anon, authenticated;
grant execute on function public.run_driver_notification_automations(text)
  to service_role;

comment on table public.driver_notification_preferences is
  'Preferencias privadas do motorista para alertas internos de agenda, CRM, orcamentos, financeiro, rede e assinatura.';
comment on table public.driver_automation_runs is
  'Historico tecnico das execucoes idempotentes das automacoes internas do JNE App.';
comment on function public.run_driver_notification_automations(text) is
  'Executa alertas internos sem enviar mensagens externas e sem alterar reservas, cobrancas ou contatos.';
-- JNE App 1.20.0 - painel executivo e polimento administrativo.
-- Migration idempotente. Execute somente este arquivo em bancos existentes.

create or replace function public.admin_executive_dashboard(
  selected_start timestamptz,
  selected_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  period_start timestamptz := selected_start;
  period_end timestamptz := selected_end;
  period_length interval;
  previous_start timestamptz;
  previous_end timestamptz;
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.' using errcode = '42501';
  end if;

  if period_start is null or period_end is null or period_start >= period_end then
    raise exception 'Periodo executivo invalido.' using errcode = '22007';
  end if;

  period_length := period_end - period_start;
  if period_length > interval '370 days' then
    raise exception 'O periodo maximo e de 370 dias.' using errcode = '22023';
  end if;

  previous_end := period_start;
  previous_start := period_start - period_length;

  with plan_distribution as (
    select
      count(*) filter (where resolved.plan_code = 'free')::bigint as free_count,
      count(*) filter (where resolved.plan_code = 'professional')::bigint as professional_count,
      count(*) filter (where resolved.plan_code = 'premium')::bigint as premium_count
    from public.profiles profile
    cross join lateral public.current_account_plan(profile.id) resolved
  ),
  platform_totals as (
    select
      (select count(*) from public.profiles)::bigint as total_accounts,
      (select count(*) from public.profiles where not is_blocked)::bigint as active_accounts,
      (select count(*) from public.profiles where is_blocked)::bigint as blocked_accounts,
      (select count(*) from public.profiles where is_professional_driver)::bigint as professional_drivers,
      (select count(*) from public.driver_public_profiles where is_published)::bigint as published_drivers,
      (select count(*) from public.driver_network_settings where opted_in and verification_status = 'verified')::bigint as verified_network_drivers,
      (select count(*) from public.driver_customers where not is_archived)::bigint as active_customers,
      (select count(*) from public.driver_reservations)::bigint as reservations_total,
      (select count(*) from public.driver_quotes)::bigint as quotes_total,
      (select count(*) from public.driver_trips)::bigint as trips_total
  ),
  current_period as (
    select
      (select count(*) from public.profiles where created_at >= period_start and created_at < period_end)::bigint as new_accounts,
      (select count(*) from public.driver_customers where created_at >= period_start and created_at < period_end)::bigint as customers_created,
      (select count(*) from public.driver_reservations where created_at >= period_start and created_at < period_end)::bigint as reservations_created,
      (select count(*) from public.driver_reservations where created_at >= period_start and created_at < period_end and status = 'confirmed')::bigint as reservations_confirmed,
      (select count(*) from public.driver_reservations where created_at >= period_start and created_at < period_end and status = 'completed')::bigint as reservations_completed,
      (select count(*) from public.driver_quotes where created_at >= period_start and created_at < period_end)::bigint as quotes_created,
      (select count(*) from public.driver_quotes where created_at >= period_start and created_at < period_end and status in ('accepted','completed'))::bigint as quotes_accepted,
      (select count(*) from public.driver_quotes where created_at >= period_start and created_at < period_end and status = 'declined')::bigint as quotes_declined,
      (select count(*) from public.driver_trips where created_at >= period_start and created_at < period_end)::bigint as trips_created,
      (select count(*) from public.driver_trips where created_at >= period_start and created_at < period_end and status = 'completed')::bigint as trips_completed,
      (select count(*) from public.driver_referrals where created_at >= period_start and created_at < period_end)::bigint as referrals_created,
      (select count(*) from public.driver_referrals where created_at >= period_start and created_at < period_end and status = 'accepted')::bigint as referrals_accepted,
      (select count(*) from public.notifications where created_at >= period_start and created_at < period_end and automation_type is not null)::bigint as automation_notifications,
      (select count(*) from public.driver_automation_runs where started_at >= period_start and started_at < period_end)::bigint as automation_runs,
      (select count(*) from public.driver_automation_runs where started_at >= period_start and started_at < period_end and status = 'failed')::bigint as automation_failures
  ),
  previous_period as (
    select
      (select count(*) from public.profiles where created_at >= previous_start and created_at < previous_end)::bigint as new_accounts,
      (select count(*) from public.driver_customers where created_at >= previous_start and created_at < previous_end)::bigint as customers_created,
      (select count(*) from public.driver_reservations where created_at >= previous_start and created_at < previous_end)::bigint as reservations_created,
      (select count(*) from public.driver_reservations where created_at >= previous_start and created_at < previous_end and status = 'confirmed')::bigint as reservations_confirmed,
      (select count(*) from public.driver_reservations where created_at >= previous_start and created_at < previous_end and status = 'completed')::bigint as reservations_completed,
      (select count(*) from public.driver_quotes where created_at >= previous_start and created_at < previous_end)::bigint as quotes_created,
      (select count(*) from public.driver_quotes where created_at >= previous_start and created_at < previous_end and status in ('accepted','completed'))::bigint as quotes_accepted,
      (select count(*) from public.driver_quotes where created_at >= previous_start and created_at < previous_end and status = 'declined')::bigint as quotes_declined,
      (select count(*) from public.driver_trips where created_at >= previous_start and created_at < previous_end)::bigint as trips_created,
      (select count(*) from public.driver_trips where created_at >= previous_start and created_at < previous_end and status = 'completed')::bigint as trips_completed,
      (select count(*) from public.driver_referrals where created_at >= previous_start and created_at < previous_end)::bigint as referrals_created,
      (select count(*) from public.driver_referrals where created_at >= previous_start and created_at < previous_end and status = 'accepted')::bigint as referrals_accepted,
      (select count(*) from public.notifications where created_at >= previous_start and created_at < previous_end and automation_type is not null)::bigint as automation_notifications,
      (select count(*) from public.driver_automation_runs where started_at >= previous_start and started_at < previous_end)::bigint as automation_runs,
      (select count(*) from public.driver_automation_runs where started_at >= previous_start and started_at < previous_end and status = 'failed')::bigint as automation_failures
  ),
  attention as (
    select
      (select count(*) from public.vip_subscription_requests where status = 'pending')::bigint as pending_payments,
      (select count(*) from public.driver_network_settings where opted_in and verification_status = 'pending')::bigint as pending_driver_verifications,
      (
        select count(*)
        from public.account_subscriptions subscription
        where subscription.status in ('active','trial')
          and coalesce(
            case when subscription.status = 'trial' then subscription.trial_ends_at end,
            subscription.expires_at
          ) > now()
          and coalesce(
            case when subscription.status = 'trial' then subscription.trial_ends_at end,
            subscription.expires_at
          ) <= now() + interval '7 days'
      )::bigint as subscriptions_expiring,
      (select count(*) from public.account_subscriptions where status in ('past_due','suspended','expired'))::bigint as subscriptions_attention,
      (select count(*) from public.community_reports where status = 'pending')::bigint as pending_community_reports,
      (select count(*) from public.driver_automation_runs where status = 'failed' and started_at >= now() - interval '7 days')::bigint as automation_failures_7d,
      (
        select count(*)
        from public.notifications notification
        where notification.target_user_id is not null
          and notification.is_published
          and notification.published_at <= now()
          and (notification.expires_at is null or notification.expires_at > now())
          and not exists (
            select 1
            from public.notification_reads read_state
            where read_state.notification_id = notification.id
              and read_state.user_id = notification.target_user_id
              and read_state.read_at is not null
          )
      )::bigint as unread_targeted_notifications,
      (select count(*) from public.public_contents where publication_status = 'draft')::bigint as content_drafts,
      (select count(*) from public.profiles where is_blocked)::bigint as blocked_accounts
  )
  select jsonb_build_object(
    'period', jsonb_build_object(
      'start', period_start,
      'end', period_end,
      'previousStart', previous_start,
      'previousEnd', previous_end
    ),
    'platform', to_jsonb(platform_totals),
    'plans', to_jsonb(plan_distribution),
    'current', to_jsonb(current_period),
    'previous', to_jsonb(previous_period),
    'attention', to_jsonb(attention),
    'generatedAt', now()
  )
  into result
  from platform_totals, plan_distribution, current_period, previous_period, attention;

  return result;
end;
$$;

revoke all on function public.admin_executive_dashboard(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.admin_executive_dashboard(timestamptz, timestamptz)
  to authenticated;

create or replace function public.admin_executive_activity(
  selected_start timestamptz,
  selected_end timestamptz
)
returns table (
  bucket_start date,
  accounts bigint,
  reservations bigint,
  quotes bigint,
  trips bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  period_length interval;
  bucket_unit text;
  bucket_step interval;
  local_start timestamp;
  local_end timestamp;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.' using errcode = '42501';
  end if;

  if selected_start is null or selected_end is null or selected_start >= selected_end then
    raise exception 'Periodo executivo invalido.' using errcode = '22007';
  end if;

  period_length := selected_end - selected_start;
  if period_length > interval '370 days' then
    raise exception 'O periodo maximo e de 370 dias.' using errcode = '22023';
  end if;

  if period_length <= interval '45 days' then
    bucket_unit := 'day';
    bucket_step := interval '1 day';
  elsif period_length <= interval '150 days' then
    bucket_unit := 'week';
    bucket_step := interval '1 week';
  else
    bucket_unit := 'month';
    bucket_step := interval '1 month';
  end if;

  local_start := date_trunc(bucket_unit, selected_start at time zone 'America/Sao_Paulo');
  local_end := date_trunc(bucket_unit, (selected_end - interval '1 microsecond') at time zone 'America/Sao_Paulo');

  return query
  with buckets as (
    select generate_series(local_start, local_end, bucket_step)::date as bucket_start
  ),
  account_counts as (
    select date_trunc(bucket_unit, profile.created_at at time zone 'America/Sao_Paulo')::date as bucket_start, count(*)::bigint as amount
    from public.profiles profile
    where profile.created_at >= selected_start and profile.created_at < selected_end
    group by 1
  ),
  reservation_counts as (
    select date_trunc(bucket_unit, reservation.created_at at time zone 'America/Sao_Paulo')::date as bucket_start, count(*)::bigint as amount
    from public.driver_reservations reservation
    where reservation.created_at >= selected_start and reservation.created_at < selected_end
    group by 1
  ),
  quote_counts as (
    select date_trunc(bucket_unit, quote.created_at at time zone 'America/Sao_Paulo')::date as bucket_start, count(*)::bigint as amount
    from public.driver_quotes quote
    where quote.created_at >= selected_start and quote.created_at < selected_end
    group by 1
  ),
  trip_counts as (
    select date_trunc(bucket_unit, trip.created_at at time zone 'America/Sao_Paulo')::date as bucket_start, count(*)::bigint as amount
    from public.driver_trips trip
    where trip.created_at >= selected_start and trip.created_at < selected_end
    group by 1
  )
  select
    bucket.bucket_start,
    coalesce(account_counts.amount, 0)::bigint,
    coalesce(reservation_counts.amount, 0)::bigint,
    coalesce(quote_counts.amount, 0)::bigint,
    coalesce(trip_counts.amount, 0)::bigint
  from buckets bucket
  left join account_counts using (bucket_start)
  left join reservation_counts using (bucket_start)
  left join quote_counts using (bucket_start)
  left join trip_counts using (bucket_start)
  order by bucket.bucket_start;
end;
$$;

revoke all on function public.admin_executive_activity(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.admin_executive_activity(timestamptz, timestamptz)
  to authenticated;

comment on function public.admin_executive_dashboard(timestamptz, timestamptz) is
  'Entrega agregacoes administrativas reais, comparacao entre periodos e filas de atencao sem expor dados pessoais.';
comment on function public.admin_executive_activity(timestamptz, timestamptz) is
  'Entrega serie temporal agregada do painel executivo com granularidade automatica por periodo.';
-- JNE App 2.1.2 - isolamento de notificacoes e apresentacao do veiculo.
-- Migration idempotente para bancos que ja receberam as releases anteriores.

-- ============================================================
-- 1. Perfil publico: banner do veiculo
-- ============================================================

alter table public.driver_public_profiles
  add column if not exists vehicle_banner_url text,
  add column if not exists vehicle_banner_path text,
  add column if not exists show_vehicle_banner boolean not null default true;

alter table public.driver_public_profiles
  drop constraint if exists driver_public_profiles_vehicle_banner_path_check,
  drop constraint if exists driver_public_profiles_vehicle_banner_url_length_check;

alter table public.driver_public_profiles
  add constraint driver_public_profiles_vehicle_banner_path_check
    check (
      vehicle_banner_path is null
      or split_part(vehicle_banner_path, '/', 1) = user_id::text
    ),
  add constraint driver_public_profiles_vehicle_banner_url_length_check
    check (vehicle_banner_url is null or length(vehicle_banner_url) <= 1200);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'driver-profile-assets',
  'driver-profile-assets',
  true,
  6291456,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 6291456,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public reads driver profile assets" on storage.objects;
create policy "Public reads driver profile assets"
on storage.objects for select to public
using (bucket_id = 'driver-profile-assets');

drop policy if exists "Drivers upload own profile assets" on storage.objects;
create policy "Drivers upload own profile assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'driver-profile-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid()
      and profile.is_professional_driver = true
      and profile.is_blocked = false
  )
);

drop policy if exists "Drivers update own profile assets" on storage.objects;
create policy "Drivers update own profile assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'driver-profile-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'driver-profile-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Drivers delete own profile assets" on storage.objects;
create policy "Drivers delete own profile assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'driver-profile-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- 2. Notificacoes: isolamento por conta
-- ============================================================

alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

-- Avisos editoriais sem destinatario continuam seguindo audience.
-- Avisos operacionais com target_user_id sao visiveis somente ao titular.
drop policy if exists "Visitors read visible notifications" on public.notifications;
create policy "Visitors read visible notifications"
on public.notifications
for select
to anon, authenticated
using (
  is_published = true
  and published_at <= now()
  and (expires_at is null or expires_at > now())
  and (
    (target_user_id is null and public.can_read_notification(audience))
    or (auth.uid() is not null and target_user_id = auth.uid())
  )
);

-- O painel administrativo conserva sua policy exclusiva de leitura geral.
-- As rotas normais do aplicativo tambem aplicam filtro explicito por conta.

drop policy if exists "Members read own notification state" on public.notification_reads;
create policy "Members read own notification state"
on public.notification_reads
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Members create own notification state" on public.notification_reads;
create policy "Members create own notification state"
on public.notification_reads
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.notifications notification
    where notification.id = notification_id
      and notification.is_published = true
      and notification.published_at <= now()
      and (notification.expires_at is null or notification.expires_at > now())
      and (
        (
          notification.target_user_id is null
          and public.can_read_notification(notification.audience)
        )
        or notification.target_user_id = auth.uid()
      )
  )
);

drop policy if exists "Members update own notification state" on public.notification_reads;
create policy "Members update own notification state"
on public.notification_reads
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.notifications notification
    where notification.id = notification_id
      and (
        (
          notification.target_user_id is null
          and public.can_read_notification(notification.audience)
        )
        or notification.target_user_id = auth.uid()
      )
  )
);

drop policy if exists "Members delete own notification state" on public.notification_reads;
create policy "Members delete own notification state"
on public.notification_reads
for delete
to authenticated
using (user_id = auth.uid());

create index if not exists notifications_account_visibility_idx
  on public.notifications(target_user_id, is_published, published_at desc, expires_at);

-- Repara alertas de reservas antigas caso tenham ficado sem destinatario.
update public.notifications notification
set target_user_id = reservation.driver_user_id,
    updated_at = now()
from public.driver_reservations reservation
where notification.source_key = 'driver-reservation:' || reservation.id::text
  and notification.target_user_id is distinct from reservation.driver_user_id;

comment on column public.driver_public_profiles.vehicle_banner_url is
  'URL publica da foto de destaque do veiculo no perfil do motorista.';
comment on column public.driver_public_profiles.vehicle_banner_path is
  'Caminho do arquivo no bucket driver-profile-assets, sempre dentro da pasta do motorista.';
comment on column public.driver_public_profiles.show_vehicle_banner is
  'Controla se o banner do veiculo aparece para o passageiro.';
