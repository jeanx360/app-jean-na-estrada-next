-- JNE App 0.9.0 — central de notificações e Web Push
-- Execute uma única vez depois das migrações 0.6.0, 0.7.0 e 0.8.0.

create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  audience text not null default 'all'
    check (audience in ('all', 'member', 'vip', 'admin')),
  category text not null default 'general'
    check (category in ('general', 'videos', 'tutorials', 'apps', 'benefits')),
  action_url text,
  image_url text,
  is_published boolean not null default true,
  is_featured boolean not null default false,
  published_at timestamptz not null default now(),
  push_requested boolean not null default false,
  push_sent_at timestamptz,
  push_success_count integer not null default 0 check (push_success_count >= 0),
  push_failure_count integer not null default 0 check (push_failure_count >= 0),
  source_key text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists notifications_source_key_unique
  on public.notifications(source_key)
  where source_key is not null;

create index if not exists notifications_visible_idx
  on public.notifications(is_published, published_at desc, audience, category);

create index if not exists notifications_featured_idx
  on public.notifications(is_featured, is_published, published_at desc);

drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create or replace function public.can_read_notification(target_audience text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when target_audience = 'all' then true
    when auth.uid() is null then false
    when target_audience = 'member' then true
    when target_audience = 'vip' then public.has_any_role(array['vip', 'admin']::public.member_role[])
    when target_audience = 'admin' then public.is_admin()
    else false
  end;
$$;

grant execute on function public.can_read_notification(text) to anon, authenticated;

alter table public.notifications enable row level security;

grant select on public.notifications to anon, authenticated;
grant insert, update, delete on public.notifications to authenticated;

drop policy if exists "Visitors read visible notifications" on public.notifications;
create policy "Visitors read visible notifications"
on public.notifications
for select
to anon, authenticated
using (
  is_published = true
  and published_at <= now()
  and public.can_read_notification(audience)
);

drop policy if exists "Admins read all notifications" on public.notifications;
create policy "Admins read all notifications"
on public.notifications
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins insert notifications" on public.notifications;
create policy "Admins insert notifications"
on public.notifications
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins update notifications" on public.notifications;
create policy "Admins update notifications"
on public.notifications
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete notifications" on public.notifications;
create policy "Admins delete notifications"
on public.notifications
for delete
to authenticated
using (public.is_admin());

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  dismissed_at timestamptz,
  primary key (notification_id, user_id)
);

alter table public.notification_reads
  add column if not exists dismissed_at timestamptz;

create index if not exists notification_reads_user_idx
  on public.notification_reads(user_id, read_at desc);

alter table public.notification_reads enable row level security;

grant select, insert, update, delete on public.notification_reads to authenticated;

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
    from public.notifications n
    where n.id = notification_id
      and n.is_published = true
      and n.published_at <= now()
      and public.can_read_notification(n.audience)
  )
);

drop policy if exists "Members update own notification state" on public.notification_reads;
create policy "Members update own notification state"
on public.notification_reads
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Members delete own notification state" on public.notification_reads;
create policy "Members delete own notification state"
on public.notification_reads
for delete
to authenticated
using (user_id = auth.uid());

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  push_enabled boolean not null default false,
  general_enabled boolean not null default true,
  videos_enabled boolean not null default true,
  tutorials_enabled boolean not null default true,
  apps_enabled boolean not null default true,
  benefits_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

grant select, insert, update, delete on public.notification_preferences to authenticated;

drop policy if exists "Members read own notification preferences" on public.notification_preferences;
create policy "Members read own notification preferences"
on public.notification_preferences
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Members create own notification preferences" on public.notification_preferences;
create policy "Members create own notification preferences"
on public.notification_preferences
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Members update own notification preferences" on public.notification_preferences;
create policy "Members update own notification preferences"
on public.notification_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Members delete own notification preferences" on public.notification_preferences;
create policy "Members delete own notification preferences"
on public.notification_preferences
for delete
to authenticated
using (user_id = auth.uid());

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  categories jsonb not null default '{
    "general": true,
    "videos": true,
    "tutorials": true,
    "apps": true,
    "benefits": true
  }'::jsonb,
  user_agent text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id, is_active);

create index if not exists push_subscriptions_active_idx
  on public.push_subscriptions(is_active, last_seen_at desc);

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

revoke all on public.push_subscriptions from anon, authenticated;
grant select, update, delete on public.push_subscriptions to authenticated;

drop policy if exists "Admins manage push subscriptions" on public.push_subscriptions;
create policy "Admins manage push subscriptions"
on public.push_subscriptions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

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
    'benefits', coalesce((subscription_categories ->> 'benefits')::boolean, true)
  );

  insert into public.push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth_key,
    categories,
    user_agent,
    is_active,
    last_seen_at
  )
  values (
    auth.uid(),
    trim(subscription_endpoint),
    trim(subscription_p256dh),
    trim(subscription_auth_key),
    normalized_categories,
    nullif(trim(subscription_user_agent), ''),
    true,
    now()
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
      user_id,
      push_enabled,
      general_enabled,
      videos_enabled,
      tutorials_enabled,
      apps_enabled,
      benefits_enabled
    )
    values (
      auth.uid(),
      true,
      coalesce((normalized_categories ->> 'general')::boolean, true),
      coalesce((normalized_categories ->> 'videos')::boolean, true),
      coalesce((normalized_categories ->> 'tutorials')::boolean, true),
      coalesce((normalized_categories ->> 'apps')::boolean, true),
      coalesce((normalized_categories ->> 'benefits')::boolean, true)
    )
    on conflict (user_id) do update set
      push_enabled = true,
      general_enabled = excluded.general_enabled,
      videos_enabled = excluded.videos_enabled,
      tutorials_enabled = excluded.tutorials_enabled,
      apps_enabled = excluded.apps_enabled,
      benefits_enabled = excluded.benefits_enabled;
  end if;

  return saved_id;
end;
$$;

revoke all on function public.save_push_subscription(text, text, text, jsonb, text) from public;
grant execute on function public.save_push_subscription(text, text, text, jsonb, text) to anon, authenticated;

create or replace function public.remove_push_subscription(subscription_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.push_subscriptions
  set is_active = false,
      user_id = null,
      last_seen_at = now()
  where endpoint = trim(subscription_endpoint);

  if auth.uid() is not null then
    update public.notification_preferences
    set push_enabled = false
    where user_id = auth.uid();
  end if;
end;
$$;

revoke all on function public.remove_push_subscription(text) from public;
grant execute on function public.remove_push_subscription(text) to anon, authenticated;

-- Recado inicial para validar a central após a migração.
insert into public.notifications (
  title,
  message,
  audience,
  category,
  action_url,
  is_published,
  is_featured,
  source_key,
  published_at
)
values (
  'Central de notificações ativada',
  'Agora os avisos importantes, novos vídeos, tutoriais, aplicativos e benefícios aparecem em um único lugar.',
  'all',
  'general',
  '/notificacoes',
  true,
  true,
  'system:notifications-v0.9.0',
  now()
)
on conflict (source_key) where source_key is not null do nothing;
