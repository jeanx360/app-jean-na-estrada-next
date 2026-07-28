-- JNE App 1.0.0 — perfil, aceite legal, métricas, downloads, auditoria e proteção de convites
-- Execute depois da migração 0.9.0.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists bio text,
  add column if not exists avatar_path text;

create or replace function public.update_own_profile(
  new_full_name text,
  new_bio text default null,
  new_avatar_url text default null,
  new_avatar_path text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text := trim(coalesce(new_full_name, ''));
  normalized_bio text := nullif(trim(coalesce(new_bio, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and is_blocked = true) then
    raise exception 'Esta conta está bloqueada.' using errcode = '42501';
  end if;
  if length(normalized_name) < 2 or length(normalized_name) > 80 then
    raise exception 'O nome precisa ter entre 2 e 80 caracteres.' using errcode = '22023';
  end if;
  if length(coalesce(normalized_bio, '')) > 280 then
    raise exception 'A apresentação pode ter no máximo 280 caracteres.' using errcode = '22023';
  end if;
  if new_avatar_path is not null and split_part(new_avatar_path, '/', 1) <> auth.uid()::text then
    raise exception 'Caminho de avatar inválido.' using errcode = '42501';
  end if;
  if new_avatar_path is null and nullif(trim(coalesce(new_avatar_url, '')), '') is not null then
    raise exception 'Avatar inválido.' using errcode = '22023';
  end if;
  if new_avatar_path is not null and strpos(coalesce(new_avatar_url, ''), '/storage/v1/object/public/avatars/' || new_avatar_path) = 0 then
    raise exception 'URL de avatar inválida.' using errcode = '22023';
  end if;

  update public.profiles
  set full_name = normalized_name,
      bio = normalized_bio,
      avatar_url = nullif(trim(coalesce(new_avatar_url, '')), ''),
      avatar_path = nullif(trim(coalesce(new_avatar_path, '')), '')
  where id = auth.uid();
end;
$$;

revoke all on function public.update_own_profile(text, text, text, text) from public, anon;
grant execute on function public.update_own_profile(text, text, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Members upload own avatar" on storage.objects;
create policy "Members upload own avatar" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Members update own avatar" on storage.objects;
create policy "Members update own avatar" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Members delete own avatar" on storage.objects;
create policy "Members delete own avatar" on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.user_legal_acceptances (
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null check (document_type in ('terms','privacy','apk_disclaimer')),
  version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, document_type)
);

alter table public.user_legal_acceptances enable row level security;
grant select, insert, update on public.user_legal_acceptances to authenticated;

drop policy if exists "Members read own legal acceptances" on public.user_legal_acceptances;
create policy "Members read own legal acceptances" on public.user_legal_acceptances for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Members create own legal acceptances" on public.user_legal_acceptances;
create policy "Members create own legal acceptances" on public.user_legal_acceptances for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Members update own legal acceptances" on public.user_legal_acceptances;
create policy "Members update own legal acceptances" on public.user_legal_acceptances for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.vip_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  content_id uuid references public.vip_content(id) on delete set null,
  user_agent_hash text,
  downloaded_at timestamptz not null default now()
);
create index if not exists vip_downloads_user_idx on public.vip_downloads(user_id, downloaded_at desc);
create index if not exists vip_downloads_content_idx on public.vip_downloads(content_id, downloaded_at desc);
alter table public.vip_downloads enable row level security;
grant select, insert on public.vip_downloads to authenticated;

drop policy if exists "VIP records own downloads" on public.vip_downloads;
create policy "VIP records own downloads" on public.vip_downloads for insert to authenticated
with check (user_id = auth.uid() and public.has_any_role(array['vip','admin']::public.member_role[]));

drop policy if exists "Admins read downloads" on public.vip_downloads;
create policy "Admins read downloads" on public.vip_downloads for select to authenticated
using (public.is_admin());

create table if not exists public.vip_invite_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  success boolean not null default false,
  reason text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists vip_invite_attempts_rate_idx on public.vip_invite_attempts(user_id, attempted_at desc);
alter table public.vip_invite_attempts enable row level security;
grant select on public.vip_invite_attempts to authenticated;
drop policy if exists "Admins read invite attempts" on public.vip_invite_attempts;
create policy "Admins read invite attempts" on public.vip_invite_attempts for select to authenticated using (public.is_admin());

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
  update public.profiles set role = 'vip' where id = auth.uid();
  insert into public.vip_invite_attempts(user_id, success, reason) values(auth.uid(), true, 'success');
  return 'success';
end;
$$;

revoke all on function public.redeem_vip_invite(text) from public, anon;
grant execute on function public.redeem_vip_invite(text) to authenticated;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);
create index if not exists admin_audit_logs_actor_idx on public.admin_audit_logs(actor_user_id, created_at desc);
alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from anon;
grant select on public.admin_audit_logs to authenticated;
drop policy if exists "Admins read audit logs" on public.admin_audit_logs;
create policy "Admins read audit logs" on public.admin_audit_logs for select to authenticated using (public.is_admin());

create or replace function public.capture_admin_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_json jsonb;
  new_json jsonb;
  record_id text;
begin
  if auth.uid() is null or not public.is_admin() then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  old_json := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  new_json := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  record_id := coalesce(new_json ->> 'id', old_json ->> 'id', new_json ->> 'user_id', old_json ->> 'user_id');
  insert into public.admin_audit_logs(actor_user_id, action, entity_type, entity_id, old_data, new_data)
  values(auth.uid(), tg_op, tg_table_name, record_id, old_json, new_json);
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

revoke all on function public.capture_admin_audit() from public, anon, authenticated;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['profiles','vip_invites','announcements','vip_content','public_contents','notifications']
  LOOP
    EXECUTE format('drop trigger if exists %I_admin_audit on public.%I', table_name, table_name);
    EXECUTE format('create trigger %I_admin_audit after insert or update or delete on public.%I for each row execute function public.capture_admin_audit()', table_name, table_name);
  END LOOP;
END $$;

create or replace function public.admin_dashboard_metrics()
returns table (
  total_members bigint,
  vip_members bigint,
  blocked_members bigint,
  recent_members bigint,
  total_downloads bigint,
  downloads_last_7_days bigint,
  invite_redemptions bigint,
  audit_events bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário.' using errcode = '42501'; end if;
  return query select
    (select count(*) from public.profiles),
    (select count(*) from public.profiles where role = 'vip'),
    (select count(*) from public.profiles where is_blocked = true),
    (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    (select count(*) from public.vip_downloads),
    (select count(*) from public.vip_downloads where downloaded_at > now() - interval '7 days'),
    (select count(*) from public.vip_invite_redemptions),
    (select count(*) from public.admin_audit_logs);
end;
$$;
revoke all on function public.admin_dashboard_metrics() from public, anon;
grant execute on function public.admin_dashboard_metrics() to authenticated;
