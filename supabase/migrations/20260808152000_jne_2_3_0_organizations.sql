-- JNE App 2.3.0 — P2: organizações, CNPJ e membros do JNE Empresas
-- Depende de: 20260808150000_jne_2_3_0_identity_foundation.sql
-- Migração aditiva. Não altera contas, motoristas ou recursos existentes da 2.2.4.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;


create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (length(trim(legal_name)) between 2 and 180),
  trade_name text check (trade_name is null or length(trim(trade_name)) between 2 and 180),
  organization_type text not null default 'company'
    check (organization_type in (
      'company',
      'event_agency',
      'tourism',
      'hotel',
      'education',
      'healthcare',
      'condominium',
      'association',
      'cooperative',
      'other'
    )),
  status text not null default 'onboarding'
    check (status in (
      'onboarding',
      'pending_verification',
      'verified',
      'rejected',
      'suspended',
      'closed'
    )),
  city text check (city is null or length(trim(city)) between 2 and 120),
  region text check (region is null or length(trim(region)) between 2 and 120),
  created_by_identity_id uuid not null references public.jne_identities(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_status_region_idx
  on public.organizations(status, region, city);

create index if not exists organizations_created_by_idx
  on public.organizations(created_by_identity_id, created_at desc);


drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();


-- CNPJ e contatos administrativos permanecem fora do schema público/Data API.
-- O fingerprint deve ser HMAC calculado no servidor com segredo privado.
create table if not exists private.organization_pii (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  cnpj_encrypted text not null,
  cnpj_fingerprint text not null,
  contact_name text,
  phone text,
  email_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(cnpj_fingerprint)) between 32 and 256),
  check (contact_name is null or length(trim(contact_name)) between 2 and 160),
  check (phone is null or length(trim(phone)) between 8 and 40),
  check (email_contact is null or length(trim(email_contact)) between 5 and 254)
);

create unique index if not exists organization_pii_cnpj_fingerprint_unique_idx
  on private.organization_pii(cnpj_fingerprint);


drop trigger if exists organization_pii_set_updated_at on private.organization_pii;
create trigger organization_pii_set_updated_at
before update on private.organization_pii
for each row execute function public.set_updated_at();


create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  identity_id uuid not null references public.jne_identities(id) on delete restrict,
  role text not null default 'viewer'
    check (role in ('owner', 'admin', 'recruiter', 'viewer')),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'removed')),
  invited_by_identity_id uuid references public.jne_identities(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, identity_id),
  check (
    (status = 'active' and joined_at is not null)
    or status in ('inactive', 'removed')
  )
);

create index if not exists organization_members_org_status_idx
  on public.organization_members(organization_id, status, role);

create index if not exists organization_members_identity_status_idx
  on public.organization_members(identity_id, status, organization_id);


drop trigger if exists organization_members_set_updated_at on public.organization_members;
create trigger organization_members_set_updated_at
before update on public.organization_members
for each row execute function public.set_updated_at();


-- Helper SECURITY DEFINER para evitar recursão de RLS em organization_members.
create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_organization_id
      and m.identity_id = public.current_jne_identity_id()
      and m.status = 'active'
  );
$$;

revoke all on function public.is_organization_member(uuid) from public, anon;
grant execute on function public.is_organization_member(uuid) to authenticated;


create or replace function public.has_organization_role(
  target_organization_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_organization_id
      and m.identity_id = public.current_jne_identity_id()
      and m.status = 'active'
      and m.role = any(allowed_roles)
  );
$$;

revoke all on function public.has_organization_role(uuid, text[]) from public, anon;
grant execute on function public.has_organization_role(uuid, text[]) to authenticated;


-- Criação atômica da organização. Não fica disponível ao navegador.
-- O servidor deverá calcular cnpj_fingerprint via HMAC e cifrar o CNPJ antes de chamar.
create or replace function public.create_jne_organization(
  p_owner_identity_id uuid,
  p_legal_name text,
  p_trade_name text,
  p_organization_type text,
  p_city text,
  p_region text,
  p_cnpj_encrypted text,
  p_cnpj_fingerprint text,
  p_contact_name text,
  p_phone text,
  p_email_contact text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_status text;
  new_organization_id uuid;
begin
  if p_owner_identity_id is null then
    raise exception 'Identidade responsável obrigatória.' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_legal_name, '')), '') is null then
    raise exception 'Razão social obrigatória.' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_cnpj_encrypted, '')), '') is null
     or nullif(trim(coalesce(p_cnpj_fingerprint, '')), '') is null then
    raise exception 'CNPJ protegido obrigatório.' using errcode = '22023';
  end if;

  if length(trim(p_cnpj_fingerprint)) < 32 then
    raise exception 'Fingerprint de CNPJ inválido.' using errcode = '22023';
  end if;

  select i.status
    into owner_status
  from public.jne_identities i
  where i.id = p_owner_identity_id
  for update;

  if owner_status is null then
    raise exception 'Identidade JNE não encontrada.' using errcode = 'P0002';
  end if;

  if owner_status <> 'active' then
    raise exception 'A identidade responsável não está ativa.' using errcode = '42501';
  end if;

  insert into public.organizations (
    legal_name,
    trade_name,
    organization_type,
    status,
    city,
    region,
    created_by_identity_id
  )
  values (
    trim(p_legal_name),
    nullif(trim(coalesce(p_trade_name, '')), ''),
    p_organization_type,
    'onboarding',
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_region, '')), ''),
    p_owner_identity_id
  )
  returning id into new_organization_id;

  insert into private.organization_pii (
    organization_id,
    cnpj_encrypted,
    cnpj_fingerprint,
    contact_name,
    phone,
    email_contact
  )
  values (
    new_organization_id,
    p_cnpj_encrypted,
    trim(p_cnpj_fingerprint),
    nullif(trim(coalesce(p_contact_name, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(lower(trim(coalesce(p_email_contact, ''))), '')
  );

  insert into public.organization_members (
    organization_id,
    identity_id,
    role,
    status,
    invited_by_identity_id,
    joined_at
  )
  values (
    new_organization_id,
    p_owner_identity_id,
    'owner',
    'active',
    null,
    now()
  );

  return new_organization_id;
exception
  when unique_violation then
    raise exception 'Já existe uma organização vinculada a este CNPJ.' using errcode = '23505';
end;
$$;

revoke all on function public.create_jne_organization(
  uuid, text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_jne_organization(
  uuid, text, text, text, text, text, text, text, text, text, text
) to service_role;


alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

revoke all on private.organization_pii from public, anon, authenticated;

revoke all on public.organizations from anon, authenticated;
revoke all on public.organization_members from anon, authenticated;

grant select on public.organizations to authenticated;
grant select on public.organization_members to authenticated;


drop policy if exists "Organization members read own organizations" on public.organizations;
create policy "Organization members read own organizations"
on public.organizations
for select
to authenticated
using (
  public.is_organization_member(id)
  or public.is_admin()
);


drop policy if exists "Organization members read own team" on public.organization_members;
create policy "Organization members read own team"
on public.organization_members
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  or public.is_admin()
);


comment on table public.organizations is
  'Organizações do JNE Empresas. O CNPJ não é armazenado no schema público.';

comment on table private.organization_pii is
  'CNPJ e contatos administrativos da organização. Uso exclusivo do servidor e rotinas administrativas autorizadas.';

comment on table public.organization_members is
  'Vínculo entre identidades JNE e organizações, com papéis owner/admin/recruiter/viewer.';
