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
