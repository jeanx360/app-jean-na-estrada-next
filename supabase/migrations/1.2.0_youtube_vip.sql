-- JNE App 1.2.0 — acesso VIP por origem e integração com membros do YouTube
-- Execute depois da migração 1.1.0.

create extension if not exists pgcrypto;

-- =========================================================
-- FONTES DE ACESSO VIP
-- =========================================================
create table if not exists public.vip_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('admin', 'invite', 'youtube', 'partner', 'subscription', 'legacy')),
  source_key text not null,
  label text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, source_key)
);

create index if not exists vip_entitlements_user_active_idx
  on public.vip_entitlements(user_id, is_active, expires_at);
create index if not exists vip_entitlements_source_idx
  on public.vip_entitlements(source, source_key);

drop trigger if exists vip_entitlements_set_updated_at on public.vip_entitlements;
create trigger vip_entitlements_set_updated_at
before update on public.vip_entitlements
for each row execute function public.set_updated_at();

alter table public.vip_entitlements enable row level security;
revoke all on public.vip_entitlements from anon;
revoke insert, update, delete on public.vip_entitlements from authenticated;
grant select on public.vip_entitlements to authenticated;

drop policy if exists "Members read own VIP entitlements" on public.vip_entitlements;
create policy "Members read own VIP entitlements"
on public.vip_entitlements
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins read all VIP entitlements" on public.vip_entitlements;
create policy "Admins read all VIP entitlements"
on public.vip_entitlements
for select
to authenticated
using (public.is_admin());

create or replace function public.refresh_member_vip_role(target_user_id uuid)
returns public.member_role
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role public.member_role;
  next_role public.member_role;
begin
  if auth.uid() is not null and auth.uid() <> target_user_id and not public.is_admin() then
    raise exception 'Você não pode recalcular o acesso de outra conta.' using errcode = '42501';
  end if;

  select role into current_role
  from public.profiles
  where id = target_user_id
  for update;

  if current_role is null then
    raise exception 'Perfil não encontrado.' using errcode = 'P0002';
  end if;

  if current_role = 'admin' then
    return 'admin';
  end if;

  if exists (
    select 1
    from public.vip_entitlements e
    where e.user_id = target_user_id
      and e.is_active = true
      and e.starts_at <= now()
      and (e.expires_at is null or e.expires_at > now())
  ) then
    next_role := 'vip';
  else
    next_role := 'member';
  end if;

  update public.profiles
  set role = next_role
  where id = target_user_id
    and role is distinct from next_role;

  return next_role;
end;
$$;

revoke all on function public.refresh_member_vip_role(uuid) from public, anon;
grant execute on function public.refresh_member_vip_role(uuid) to authenticated;

create or replace function public.refresh_role_after_entitlement_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_member_vip_role(old.user_id);
    return old;
  end if;

  perform public.refresh_member_vip_role(new.user_id);

  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform public.refresh_member_vip_role(old.user_id);
  end if;

  return new;
end;
$$;

drop trigger if exists vip_entitlements_refresh_role on public.vip_entitlements;
create trigger vip_entitlements_refresh_role
after insert or update or delete on public.vip_entitlements
for each row execute function public.refresh_role_after_entitlement_change();

-- Mantém os acessos existentes durante a migração.
insert into public.vip_entitlements (user_id, source, source_key, label, is_active)
select id, 'legacy', 'pre-1.2', 'Acesso VIP existente antes da versão 1.2', true
from public.profiles
where role = 'vip'
on conflict (user_id, source, source_key)
do update set is_active = true, updated_at = now();

-- Registra como origem os convites já resgatados.
insert into public.vip_entitlements (user_id, source, source_key, label, starts_at, is_active)
select r.user_id, 'invite', r.invite_id::text, 'Convite VIP', r.redeemed_at, true
from public.vip_invite_redemptions r
on conflict (user_id, source, source_key)
do update set is_active = true, updated_at = now();

-- O painel administrativo passa a registrar a liberação manual como uma fonte.
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

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'Membro não encontrado.' using errcode = 'P0002';
  end if;

  if new_role = 'admin' then
    update public.profiles set role = 'admin' where id = target_user_id;
    return;
  end if;

  -- Retira o papel administrativo antes de recalcular o acesso efetivo.
  update public.profiles set role = 'member' where id = target_user_id;

  if new_role = 'vip' then
    insert into public.vip_entitlements (
      user_id, source, source_key, label, starts_at, expires_at, is_active, metadata
    ) values (
      target_user_id, 'admin', 'manual', 'Liberação manual pelo administrador', now(), null, true,
      jsonb_build_object('granted_by', auth.uid())
    )
    on conflict (user_id, source, source_key)
    do update set
      label = excluded.label,
      starts_at = now(),
      expires_at = null,
      is_active = true,
      metadata = excluded.metadata,
      updated_at = now();
  else
    update public.vip_entitlements
    set is_active = false, updated_at = now()
    where user_id = target_user_id
      and is_active = true;
  end if;

  perform public.refresh_member_vip_role(target_user_id);
end;
$$;

revoke all on function public.admin_update_member_role(uuid, public.member_role) from public, anon;
grant execute on function public.admin_update_member_role(uuid, public.member_role) to authenticated;

-- Convites agora criam um direito de acesso rastreável.
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
  recent_failures integer;
begin
  if auth.uid() is null then raise exception 'Faça login antes de usar um convite.' using errcode = '42501'; end if;

  select * into current_profile from public.profiles where id = auth.uid() for update;
  if current_profile.id is null then raise exception 'Perfil não encontrado.' using errcode = 'P0002'; end if;
  if current_profile.is_blocked then return 'blocked'; end if;
  if current_profile.role in ('vip','admin') then return 'already_vip'; end if;

  select count(*) into recent_failures from public.vip_invite_attempts
  where user_id = auth.uid() and success = false and attempted_at > now() - interval '15 minutes';
  if recent_failures >= 5 then return 'rate_limited'; end if;

  normalized_code := upper(trim(coalesce(invite_code, '')));
  if length(normalized_code) < 8 then
    insert into public.vip_invite_attempts(user_id, success, reason) values(auth.uid(), false, 'invalid');
    return 'invalid';
  end if;

  select * into invite_row from public.vip_invites
  where code_hash = encode(digest(normalized_code, 'sha256'), 'hex') for update;
  if invite_row.id is null then insert into public.vip_invite_attempts(user_id, success, reason) values(auth.uid(), false, 'invalid'); return 'invalid'; end if;
  if not invite_row.is_active then insert into public.vip_invite_attempts(user_id, success, reason) values(auth.uid(), false, 'inactive'); return 'inactive'; end if;
  if invite_row.expires_at is not null and invite_row.expires_at <= now() then insert into public.vip_invite_attempts(user_id, success, reason) values(auth.uid(), false, 'expired'); return 'expired'; end if;
  if invite_row.use_count >= invite_row.max_uses then insert into public.vip_invite_attempts(user_id, success, reason) values(auth.uid(), false, 'limit_reached'); return 'limit_reached'; end if;
  if exists(select 1 from public.vip_invite_redemptions where invite_id = invite_row.id and user_id = auth.uid()) then insert into public.vip_invite_attempts(user_id, success, reason) values(auth.uid(), false, 'already_used'); return 'already_used'; end if;

  insert into public.vip_invite_redemptions(invite_id, user_id) values(invite_row.id, auth.uid());
  update public.vip_invites set use_count = use_count + 1 where id = invite_row.id;

  insert into public.vip_entitlements(user_id, source, source_key, label, starts_at, is_active)
  values(auth.uid(), 'invite', invite_row.id::text, invite_row.label, now(), true)
  on conflict (user_id, source, source_key)
  do update set is_active = true, label = excluded.label, starts_at = now(), updated_at = now();

  insert into public.vip_invite_attempts(user_id, success, reason) values(auth.uid(), true, 'success');
  perform public.refresh_member_vip_role(auth.uid());
  return 'success';
end;
$$;

revoke all on function public.redeem_vip_invite(text) from public, anon;
grant execute on function public.redeem_vip_invite(text) to authenticated;

-- =========================================================
-- CONEXÃO DO CANAL E CATÁLOGO DE MEMBROS DO YOUTUBE
-- =========================================================
create table if not exists public.youtube_creator_connections (
  connection_key text primary key default 'primary' check (connection_key = 'primary'),
  creator_channel_id text not null,
  creator_channel_title text,
  encrypted_refresh_token text not null,
  granted_scopes text[] not null default '{}'::text[],
  status text not null default 'connected' check (status in ('connected', 'error', 'disconnected')),
  connected_by uuid references public.profiles(id) on delete set null,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  last_member_count integer not null default 0,
  last_unidentifiable_count integer not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists youtube_creator_connections_set_updated_at on public.youtube_creator_connections;
create trigger youtube_creator_connections_set_updated_at
before update on public.youtube_creator_connections
for each row execute function public.set_updated_at();

alter table public.youtube_creator_connections enable row level security;
revoke all on public.youtube_creator_connections from anon, authenticated;

create table if not exists public.youtube_membership_levels (
  id text primary key,
  creator_channel_id text not null,
  display_name text not null,
  synced_at timestamptz not null default now()
);

alter table public.youtube_membership_levels enable row level security;
revoke all on public.youtube_membership_levels from anon;
grant select on public.youtube_membership_levels to authenticated;
drop policy if exists "Admins read YouTube membership levels" on public.youtube_membership_levels;
create policy "Admins read YouTube membership levels"
on public.youtube_membership_levels for select to authenticated using (public.is_admin());

create table if not exists public.youtube_members (
  member_channel_id text primary key,
  creator_channel_id text not null,
  display_name text,
  profile_image_url text,
  channel_url text,
  highest_level_id text,
  highest_level_name text,
  accessible_level_ids text[] not null default '{}'::text[],
  member_since timestamptz,
  total_duration_months integer,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists youtube_members_active_idx
  on public.youtube_members(is_active, last_seen_at desc);
create index if not exists youtube_members_level_idx
  on public.youtube_members(highest_level_id, is_active);

drop trigger if exists youtube_members_set_updated_at on public.youtube_members;
create trigger youtube_members_set_updated_at
before update on public.youtube_members
for each row execute function public.set_updated_at();

alter table public.youtube_members enable row level security;
revoke all on public.youtube_members from anon;
grant select on public.youtube_members to authenticated;
drop policy if exists "Admins read YouTube members" on public.youtube_members;
create policy "Admins read YouTube members"
on public.youtube_members for select to authenticated using (public.is_admin());

create table if not exists public.youtube_member_links (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  member_channel_id text not null unique references public.youtube_members(member_channel_id) on delete cascade,
  display_name text,
  profile_image_url text,
  linked_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now()
);

create index if not exists youtube_member_links_channel_idx
  on public.youtube_member_links(member_channel_id);

alter table public.youtube_member_links enable row level security;
revoke all on public.youtube_member_links from anon;
revoke insert, update, delete on public.youtube_member_links from authenticated;
grant select on public.youtube_member_links to authenticated;

drop policy if exists "Members read own YouTube link" on public.youtube_member_links;
create policy "Members read own YouTube link"
on public.youtube_member_links
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins read all YouTube links" on public.youtube_member_links;
create policy "Admins read all YouTube links"
on public.youtube_member_links
for select
to authenticated
using (public.is_admin());

-- Atualiza todos os perfis migrados para refletir os direitos existentes.
do $$
declare
  profile_row record;
begin
  for profile_row in
    select id from public.profiles where role <> 'admin'
  loop
    perform public.refresh_member_vip_role(profile_row.id);
  end loop;
end;
$$;
