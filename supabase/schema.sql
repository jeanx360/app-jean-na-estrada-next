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
