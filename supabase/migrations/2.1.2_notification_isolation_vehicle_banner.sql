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
