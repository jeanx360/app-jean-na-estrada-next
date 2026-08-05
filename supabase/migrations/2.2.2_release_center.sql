-- JNE App 2.2.2 — Central de Atualizações e Comunidade VIP
-- Execute depois da migração 2.2.1.

create extension if not exists pgcrypto;

create table if not exists public.app_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null unique
    check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$'),
  title text not null check (char_length(title) between 3 and 120),
  notification_title text not null check (char_length(notification_title) between 3 and 100),
  notification_message text not null check (char_length(notification_message) between 3 and 600),
  community_title text not null check (char_length(community_title) between 3 and 120),
  community_body text not null check (char_length(community_body) between 3 and 4000),
  highlights jsonb not null default '[]'::jsonb
    check (jsonb_typeof(highlights) = 'array'),
  audience text not null default 'all'
    check (audience in ('all', 'member', 'vip', 'admin')),
  action_url text,
  image_url text,
  publish_notification boolean not null default true,
  feature_notification boolean not null default false,
  send_push boolean not null default true,
  publish_community boolean not null default true,
  pin_community boolean not null default true,
  pin_days integer not null default 7 check (pin_days between 0 and 30),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'publishing', 'published', 'partial', 'failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  last_attempt_at timestamptz,
  community_pin_until timestamptz,
  community_unpinned_at timestamptz,
  notification_id uuid references public.notifications(id) on delete set null,
  community_post_id uuid references public.community_posts(id) on delete set null,
  push_success_count integer not null default 0 check (push_success_count >= 0),
  push_failure_count integer not null default 0 check (push_failure_count >= 0),
  error_message text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_releases_channels_check check (publish_notification or publish_community),
  constraint app_releases_push_check check (not send_push or publish_notification),
  constraint app_releases_action_url_check check (
    action_url is null or action_url = '' or action_url like '/%' or action_url like 'https://%'
  ),
  constraint app_releases_image_url_check check (
    image_url is null or image_url = '' or image_url like '/%' or image_url like 'https://%'
  ),
  constraint app_releases_schedule_check check (
    status <> 'scheduled' or scheduled_at is not null
  )
);

create index if not exists app_releases_status_schedule_idx
  on public.app_releases(status, scheduled_at)
  where status = 'scheduled';

create index if not exists app_releases_history_idx
  on public.app_releases(created_at desc);

drop trigger if exists app_releases_set_updated_at on public.app_releases;
create trigger app_releases_set_updated_at
before update on public.app_releases
for each row execute function public.set_updated_at();

alter table public.community_posts
  add column if not exists release_id uuid references public.app_releases(id) on delete set null;

create unique index if not exists community_posts_release_unique
  on public.community_posts(release_id)
  where release_id is not null;

-- Passageiros/membros não podem vincular publicações comuns a uma atualização oficial.
drop policy if exists "VIP creates own community posts" on public.community_posts;
create policy "VIP creates own community posts"
on public.community_posts for insert to authenticated
with check (
  (
    author_id = auth.uid()
    and public.community_can_post()
    and (image_path is null or split_part(image_path, '/', 1) = auth.uid()::text)
    and is_pinned = false
    and is_hidden = false
    and release_id is null
  )
  or public.is_admin()
);

insert into public.community_categories
  (slug, name, description, icon, sort_order, is_active)
values
  (
    'atualizacoes-oficiais',
    'Atualizações oficiais',
    'Novidades, melhorias e comunicados oficiais do JNE App.',
    'megaphone',
    -100,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  is_active = true;

alter table public.app_releases enable row level security;
grant select, insert, update, delete on public.app_releases to authenticated;

drop policy if exists "Admins read app releases" on public.app_releases;
create policy "Admins read app releases"
on public.app_releases for select to authenticated
using (public.is_admin());

drop policy if exists "Admins insert app releases" on public.app_releases;
create policy "Admins insert app releases"
on public.app_releases for insert to authenticated
with check (public.is_admin() and created_by = auth.uid());

drop policy if exists "Admins update app releases" on public.app_releases;
create policy "Admins update app releases"
on public.app_releases for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete app releases" on public.app_releases;
create policy "Admins delete app releases"
on public.app_releases for delete to authenticated
using (public.is_admin());

do $$
begin
  if to_regprocedure('public.capture_admin_audit()') is not null then
    execute 'drop trigger if exists audit_app_releases on public.app_releases';
    execute 'create trigger audit_app_releases after insert or update or delete on public.app_releases for each row execute function public.capture_admin_audit()';
  end if;
end $$;
