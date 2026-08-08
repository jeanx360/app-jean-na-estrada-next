-- JNE App 2.3.0 — P1: fundação de identidade profissional do JNE Empresas
-- Adiciona uma camada de identidade profissional separada de auth.users/profiles.
-- Esta migração é aditiva: não altera o comportamento dos usuários atuais da 2.2.4.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table if not exists public.jne_identities (
  id uuid primary key default gen_random_uuid(),
  display_name text,
  status text not null default 'active'
    check (status in ('active', 'pending_review', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.identity_auth_links (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.jne_identities(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  is_primary boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists identity_auth_links_one_active_user_idx
  on public.identity_auth_links(auth_user_id)
  where status = 'active';

create unique index if not exists identity_auth_links_one_active_primary_idx
  on public.identity_auth_links(identity_id)
  where status = 'active' and is_primary = true;

create index if not exists identity_auth_links_identity_idx
  on public.identity_auth_links(identity_id);

create table if not exists public.jne_identity_roles (
  identity_id uuid not null references public.jne_identities(id) on delete cascade,
  role text not null
    check (role in ('passenger', 'driver', 'enterprise_driver', 'admin')),
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (identity_id, role)
);

-- PII fica fora do schema público/Data API. CPF verificável será gravado
-- futuramente como fingerprint HMAC calculado no servidor; nunca como hash simples.
create table if not exists private.identity_pii (
  identity_id uuid primary key references public.jne_identities(id) on delete cascade,
  legal_name text,
  cpf_encrypted text,
  cpf_fingerprint text,
  birth_date date,
  phone text,
  email_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists identity_pii_cpf_fingerprint_unique_idx
  on private.identity_pii(cpf_fingerprint)
  where cpf_fingerprint is not null;

-- Reutiliza o trigger central já existente no JNE.
drop trigger if exists jne_identities_set_updated_at on public.jne_identities;
create trigger jne_identities_set_updated_at
before update on public.jne_identities
for each row execute function public.set_updated_at();

drop trigger if exists identity_auth_links_set_updated_at on public.identity_auth_links;
create trigger identity_auth_links_set_updated_at
before update on public.identity_auth_links
for each row execute function public.set_updated_at();

drop trigger if exists jne_identity_roles_set_updated_at on public.jne_identity_roles;
create trigger jne_identity_roles_set_updated_at
before update on public.jne_identity_roles
for each row execute function public.set_updated_at();

drop trigger if exists identity_pii_set_updated_at on private.identity_pii;
create trigger identity_pii_set_updated_at
before update on private.identity_pii
for each row execute function public.set_updated_at();

-- Helper seguro para políticas e código do servidor.
create or replace function public.current_jne_identity_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select l.identity_id
  from public.identity_auth_links l
  where l.auth_user_id = auth.uid()
    and l.status = 'active'
  order by l.is_primary desc, l.created_at asc
  limit 1;
$$;

revoke all on function public.current_jne_identity_id() from public, anon;
grant execute on function public.current_jne_identity_id() to authenticated;

-- Criação sob demanda. Não migra em massa usuários existentes.
-- O lock no profile evita identidades órfãs caso duas requisições do mesmo
-- usuário cheguem simultaneamente.
create or replace function public.ensure_current_jne_identity()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  existing_identity_id uuid;
  new_identity_id uuid;
  profile_name text;
  profile_role public.member_role;
  profile_is_driver boolean;
begin
  if current_user_id is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;

  perform 1
  from public.profiles p
  where p.id = current_user_id
  for update;

  if not found then
    raise exception 'Perfil JNE não encontrado.' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = current_user_id
      and p.is_blocked = true
  ) then
    raise exception 'Esta conta está bloqueada.' using errcode = '42501';
  end if;

  select l.identity_id
    into existing_identity_id
  from public.identity_auth_links l
  where l.auth_user_id = current_user_id
    and l.status = 'active'
  order by l.is_primary desc, l.created_at asc
  limit 1;

  if existing_identity_id is not null then
    return existing_identity_id;
  end if;

  select p.full_name, p.role, p.is_professional_driver
    into profile_name, profile_role, profile_is_driver
  from public.profiles p
  where p.id = current_user_id;

  insert into public.jne_identities (display_name)
  values (nullif(trim(coalesce(profile_name, '')), ''))
  returning id into new_identity_id;

  insert into public.identity_auth_links (
    identity_id,
    auth_user_id,
    is_primary,
    status
  )
  values (
    new_identity_id,
    current_user_id,
    true,
    'active'
  );

  if coalesce(profile_is_driver, false) then
    insert into public.jne_identity_roles (identity_id, role, status)
    values (new_identity_id, 'driver', 'active')
    on conflict (identity_id, role) do update set status = 'active';
  end if;

  if profile_role = 'admin'::public.member_role then
    insert into public.jne_identity_roles (identity_id, role, status)
    values (new_identity_id, 'admin', 'active')
    on conflict (identity_id, role) do update set status = 'active';
  end if;

  return new_identity_id;
end;
$$;

revoke all on function public.ensure_current_jne_identity() from public, anon;
grant execute on function public.ensure_current_jne_identity() to authenticated;

alter table public.jne_identities enable row level security;
alter table public.identity_auth_links enable row level security;
alter table public.jne_identity_roles enable row level security;

-- O schema private não é exposto ao cliente; mantemos privilégios explícitos mínimos.
revoke all on private.identity_pii from public, anon, authenticated;

revoke all on public.jne_identities from anon, authenticated;
revoke all on public.identity_auth_links from anon, authenticated;
revoke all on public.jne_identity_roles from anon, authenticated;

grant select on public.jne_identities to authenticated;
grant select on public.identity_auth_links to authenticated;
grant select on public.jne_identity_roles to authenticated;

drop policy if exists "Members read own JNE identity" on public.jne_identities;
create policy "Members read own JNE identity"
on public.jne_identities
for select
to authenticated
using (
  id = public.current_jne_identity_id()
  or public.is_admin()
);

drop policy if exists "Members read own identity auth links" on public.identity_auth_links;
create policy "Members read own identity auth links"
on public.identity_auth_links
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "Members read own JNE identity roles" on public.jne_identity_roles;
create policy "Members read own JNE identity roles"
on public.jne_identity_roles
for select
to authenticated
using (
  identity_id = public.current_jne_identity_id()
  or public.is_admin()
);

comment on table public.jne_identities is
  'Identidade persistente do ecossistema JNE. Não substitui auth.users nem public.profiles.';

comment on table public.identity_auth_links is
  'Vincula uma ou mais contas de autenticação a uma identidade JNE sem usar e-mail como identidade profissional.';

comment on table private.identity_pii is
  'PII mínima da identidade JNE. Não deve ser consultada diretamente pelo navegador.';
