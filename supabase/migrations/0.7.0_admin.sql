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
