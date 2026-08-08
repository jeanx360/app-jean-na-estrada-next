-- JNE App 2.3.0 — P3: motorista profissional, veículos e verificação do JNE Empresas
-- Depende de:
--   20260808150000_jne_2_3_0_identity_foundation.sql
--   20260808152000_jne_2_3_0_organizations.sql
-- Migração aditiva. Não altera o verification_status legado da Rede de Motoristas da 2.2.4.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;


-- ============================================================
-- 1. PERFIL PROFISSIONAL B2B
-- ============================================================

create table if not exists public.driver_profiles (
  identity_id uuid primary key references public.jne_identities(id) on delete cascade,
  professional_status text not null default 'not_started'
    check (professional_status in (
      'not_started',
      'pending',
      'under_review',
      'approved',
      'rejected',
      'expired',
      'suspended'
    )),
  city text check (city is null or length(trim(city)) between 2 and 120),
  region text check (region is null or length(trim(region)) between 2 and 120),
  bio text check (bio is null or length(bio) <= 2000),
  availability_status text not null default 'available'
    check (availability_status in ('available', 'limited', 'unavailable')),
  verified_at timestamptz,
  verification_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    verification_expires_at is null
    or verified_at is null
    or verification_expires_at > verified_at
  )
);

create index if not exists driver_profiles_status_region_idx
  on public.driver_profiles(professional_status, region, city);


drop trigger if exists driver_profiles_set_updated_at on public.driver_profiles;
create trigger driver_profiles_set_updated_at
before update on public.driver_profiles
for each row execute function public.set_updated_at();


-- Opt-in seguro ao módulo profissional do JNE Empresas.
-- Não substitui public.profiles e exige que a conta já esteja habilitada
-- como motorista profissional no JNE atual.
create or replace function public.ensure_enterprise_driver_profile()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_identity_id uuid;
  current_identity_status text;
  account_is_driver boolean;
  account_is_blocked boolean;
begin
  if current_user_id is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;

  select p.is_professional_driver, p.is_blocked
    into account_is_driver, account_is_blocked
  from public.profiles p
  where p.id = current_user_id
  for update;

  if not found then
    raise exception 'Perfil JNE não encontrado.' using errcode = 'P0002';
  end if;

  if coalesce(account_is_blocked, false) then
    raise exception 'Esta conta está bloqueada.' using errcode = '42501';
  end if;

  if not coalesce(account_is_driver, false) then
    raise exception 'Ative primeiro o perfil de motorista profissional do JNE.' using errcode = '42501';
  end if;

  current_identity_id := public.ensure_current_jne_identity();

  select i.status
    into current_identity_status
  from public.jne_identities i
  where i.id = current_identity_id
  for update;

  if current_identity_status is distinct from 'active' then
    raise exception 'A identidade JNE não está ativa.' using errcode = '42501';
  end if;

  insert into public.jne_identity_roles (identity_id, role, status)
  values (current_identity_id, 'enterprise_driver', 'active')
  on conflict (identity_id, role)
  do update set status = 'active';

  insert into public.driver_profiles (identity_id)
  values (current_identity_id)
  on conflict (identity_id) do nothing;

  return current_identity_id;
end;
$$;

revoke all on function public.ensure_enterprise_driver_profile() from public, anon;
grant execute on function public.ensure_enterprise_driver_profile() to authenticated;


-- ============================================================
-- 2. VEÍCULOS E PLACA PRIVADA
-- ============================================================

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.jne_identities(id) on delete cascade,
  nickname text check (nickname is null or length(trim(nickname)) between 1 and 80),
  brand text not null check (length(trim(brand)) between 1 and 80),
  model text not null check (length(trim(model)) between 1 and 120),
  model_year smallint not null check (model_year between 1950 and 2200),
  seats smallint not null check (seats between 1 and 60),
  vehicle_type text not null default 'other'
    check (vehicle_type in (
      'hatch',
      'sedan',
      'suv',
      'minivan',
      'van',
      'pickup',
      'other'
    )),
  powertrain text not null default 'other'
    check (powertrain in (
      'electric',
      'hybrid',
      'plug_in_hybrid',
      'combustion',
      'other'
    )),
  status text not null default 'draft'
    check (status in (
      'draft',
      'pending_verification',
      'verified',
      'rejected',
      'expired',
      'inactive'
    )),
  is_primary boolean not null default false,
  verified_at timestamptz,
  verification_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    verification_expires_at is null
    or verified_at is null
    or verification_expires_at > verified_at
  )
);

create index if not exists vehicles_identity_status_idx
  on public.vehicles(identity_id, status, created_at desc);

create unique index if not exists vehicles_one_primary_per_identity_idx
  on public.vehicles(identity_id)
  where is_primary = true;


drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();


-- Placa nunca fica na tabela pública. O fingerprint deve ser HMAC
-- calculado pelo servidor com segredo privado, nunca SHA simples.
create table if not exists private.vehicle_pii (
  vehicle_id uuid primary key references public.vehicles(id) on delete cascade,
  plate_encrypted text not null,
  plate_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(plate_fingerprint)) between 32 and 256)
);

create unique index if not exists vehicle_pii_plate_fingerprint_unique_idx
  on private.vehicle_pii(plate_fingerprint);


drop trigger if exists vehicle_pii_set_updated_at on private.vehicle_pii;
create trigger vehicle_pii_set_updated_at
before update on private.vehicle_pii
for each row execute function public.set_updated_at();


-- Criação atômica de veículo + placa protegida.
-- Somente backend service_role poderá chamar esta função.
create or replace function public.create_enterprise_vehicle(
  p_identity_id uuid,
  p_nickname text,
  p_brand text,
  p_model text,
  p_model_year smallint,
  p_seats smallint,
  p_vehicle_type text,
  p_powertrain text,
  p_plate_encrypted text,
  p_plate_fingerprint text,
  p_is_primary boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  identity_status text;
  new_vehicle_id uuid;
begin
  if p_identity_id is null then
    raise exception 'Identidade do motorista obrigatória.' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_brand, '')), '') is null
     or nullif(trim(coalesce(p_model, '')), '') is null then
    raise exception 'Marca e modelo são obrigatórios.' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_plate_encrypted, '')), '') is null
     or nullif(trim(coalesce(p_plate_fingerprint, '')), '') is null then
    raise exception 'Placa protegida obrigatória.' using errcode = '22023';
  end if;

  if length(trim(p_plate_fingerprint)) < 32 then
    raise exception 'Fingerprint de placa inválido.' using errcode = '22023';
  end if;

  select i.status
    into identity_status
  from public.jne_identities i
  where i.id = p_identity_id
  for update;

  if identity_status is null then
    raise exception 'Identidade JNE não encontrada.' using errcode = 'P0002';
  end if;

  if identity_status <> 'active' then
    raise exception 'A identidade do motorista não está ativa.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.driver_profiles dp
    where dp.identity_id = p_identity_id
      and dp.professional_status <> 'suspended'
  ) then
    raise exception 'Perfil profissional empresarial não encontrado.' using errcode = 'P0002';
  end if;

  if coalesce(p_is_primary, false) then
    update public.vehicles
    set is_primary = false
    where identity_id = p_identity_id
      and is_primary = true;
  end if;

  insert into public.vehicles (
    identity_id,
    nickname,
    brand,
    model,
    model_year,
    seats,
    vehicle_type,
    powertrain,
    status,
    is_primary
  )
  values (
    p_identity_id,
    nullif(trim(coalesce(p_nickname, '')), ''),
    trim(p_brand),
    trim(p_model),
    p_model_year,
    p_seats,
    p_vehicle_type,
    p_powertrain,
    'draft',
    coalesce(p_is_primary, false)
  )
  returning id into new_vehicle_id;

  insert into private.vehicle_pii (
    vehicle_id,
    plate_encrypted,
    plate_fingerprint
  )
  values (
    new_vehicle_id,
    p_plate_encrypted,
    trim(p_plate_fingerprint)
  );

  return new_vehicle_id;
exception
  when unique_violation then
    raise exception 'Já existe um veículo vinculado a esta placa.' using errcode = '23505';
end;
$$;

revoke all on function public.create_enterprise_vehicle(
  uuid, text, text, text, smallint, smallint, text, text, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.create_enterprise_vehicle(
  uuid, text, text, text, smallint, smallint, text, text, text, text, boolean
) to service_role;


-- ============================================================
-- 3. VERIFICAÇÕES PROFISSIONAIS
-- ============================================================

create table if not exists public.driver_verifications (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.jne_identities(id) on delete cascade,
  verification_type text not null
    check (verification_type in (
      'identity',
      'cpf',
      'cnh',
      'ear',
      'phone',
      'email',
      'vehicle',
      'liveness'
    )),
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  status text not null default 'pending'
    check (status in (
      'pending',
      'processing',
      'approved',
      'rejected',
      'expired',
      'manual_review'
    )),
  user_reason_code text check (user_reason_code is null or length(user_reason_code) <= 100),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  expires_at timestamptz,
  supersedes_verification_id uuid references public.driver_verifications(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (verification_type = 'vehicle' and vehicle_id is not null)
    or (verification_type <> 'vehicle' and vehicle_id is null)
  ),
  check (expires_at is null or expires_at > submitted_at)
);

create index if not exists driver_verifications_identity_type_status_idx
  on public.driver_verifications(identity_id, verification_type, status, created_at desc);

create index if not exists driver_verifications_vehicle_idx
  on public.driver_verifications(vehicle_id, status, created_at desc)
  where vehicle_id is not null;


drop trigger if exists driver_verifications_set_updated_at on public.driver_verifications;
create trigger driver_verifications_set_updated_at
before update on public.driver_verifications
for each row execute function public.set_updated_at();


-- Impede vincular uma verificação de veículo a veículo de outra identidade.
create or replace function public.validate_driver_verification_vehicle_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  vehicle_identity_id uuid;
begin
  if new.verification_type <> 'vehicle' then
    return new;
  end if;

  select v.identity_id
    into vehicle_identity_id
  from public.vehicles v
  where v.id = new.vehicle_id;

  if vehicle_identity_id is null then
    raise exception 'Veículo não encontrado.' using errcode = 'P0002';
  end if;

  if vehicle_identity_id <> new.identity_id then
    raise exception 'O veículo não pertence à identidade informada.' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_driver_verification_vehicle_owner() from public, anon, authenticated;


drop trigger if exists driver_verifications_validate_vehicle_owner on public.driver_verifications;
create trigger driver_verifications_validate_vehicle_owner
before insert or update of identity_id, verification_type, vehicle_id
on public.driver_verifications
for each row execute function public.validate_driver_verification_vehicle_owner();


-- Metadados do provedor, referências externas e observações antifraude
-- permanecem privados e nunca são entregues às empresas.
create table if not exists private.verification_internal (
  verification_id uuid primary key references public.driver_verifications(id) on delete cascade,
  provider text,
  provider_reference text,
  internal_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (provider is null or length(trim(provider)) <= 120),
  check (provider_reference is null or length(trim(provider_reference)) <= 300),
  check (internal_reason is null or length(internal_reason) <= 4000)
);


drop trigger if exists verification_internal_set_updated_at on private.verification_internal;
create trigger verification_internal_set_updated_at
before update on private.verification_internal
for each row execute function public.set_updated_at();


-- ============================================================
-- 4. DOCUMENTOS PRIVADOS + STORAGE
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'jne-driver-documents',
  'jne-driver-documents',
  false,
  8388608,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Intencionalmente NÃO há policy de storage para anon/authenticated.
-- Uploads e URLs temporárias serão emitidos pelo backend usando fluxo assinado.
-- service_role continua podendo operar o bucket no servidor.

create table if not exists private.verification_documents (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.driver_verifications(id) on delete cascade,
  identity_id uuid not null references public.jne_identities(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  document_type text not null
    check (document_type in (
      'identity_document',
      'cpf_evidence',
      'cnh_front',
      'cnh_back',
      'ear_evidence',
      'vehicle_registration',
      'selfie',
      'liveness_evidence',
      'other'
    )),
  bucket_id text not null default 'jne-driver-documents'
    check (bucket_id = 'jne-driver-documents'),
  object_path text not null unique,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 1 and 8388608),
  status text not null default 'uploaded'
    check (status in ('uploaded', 'accepted', 'rejected', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(object_path)) between 3 and 1000),
  check (split_part(object_path, '/', 1) = identity_id::text)
);

create index if not exists verification_documents_verification_idx
  on private.verification_documents(verification_id, status, created_at desc);

create index if not exists verification_documents_identity_idx
  on private.verification_documents(identity_id, created_at desc);


drop trigger if exists verification_documents_set_updated_at on private.verification_documents;
create trigger verification_documents_set_updated_at
before update on private.verification_documents
for each row execute function public.set_updated_at();


create or replace function private.validate_verification_document_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_identity_id uuid;
  expected_vehicle_id uuid;
begin
  select dv.identity_id, dv.vehicle_id
    into expected_identity_id, expected_vehicle_id
  from public.driver_verifications dv
  where dv.id = new.verification_id;

  if expected_identity_id is null then
    raise exception 'Verificação não encontrada.' using errcode = 'P0002';
  end if;

  if new.identity_id <> expected_identity_id then
    raise exception 'Documento não pertence à identidade da verificação.' using errcode = '23514';
  end if;

  if new.vehicle_id is distinct from expected_vehicle_id then
    raise exception 'Veículo do documento não corresponde à verificação.' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_verification_document_scope() from public, anon, authenticated;


drop trigger if exists verification_documents_validate_scope on private.verification_documents;
create trigger verification_documents_validate_scope
before insert or update of verification_id, identity_id, vehicle_id
on private.verification_documents
for each row execute function private.validate_verification_document_scope();


-- ============================================================
-- 5. RLS / PRIVILÉGIOS
-- ============================================================

alter table public.driver_profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.driver_verifications enable row level security;

revoke all on private.vehicle_pii from public, anon, authenticated;
revoke all on private.verification_internal from public, anon, authenticated;
revoke all on private.verification_documents from public, anon, authenticated;

revoke all on public.driver_profiles from anon, authenticated;
revoke all on public.vehicles from anon, authenticated;
revoke all on public.driver_verifications from anon, authenticated;

grant select on public.driver_profiles to authenticated;
grant select on public.vehicles to authenticated;
grant select on public.driver_verifications to authenticated;


drop policy if exists "Drivers read own enterprise profile" on public.driver_profiles;
create policy "Drivers read own enterprise profile"
on public.driver_profiles
for select
to authenticated
using (
  identity_id = public.current_jne_identity_id()
  or public.is_admin()
);


drop policy if exists "Drivers read own enterprise vehicles" on public.vehicles;
create policy "Drivers read own enterprise vehicles"
on public.vehicles
for select
to authenticated
using (
  identity_id = public.current_jne_identity_id()
  or public.is_admin()
);


drop policy if exists "Drivers read own enterprise verifications" on public.driver_verifications;
create policy "Drivers read own enterprise verifications"
on public.driver_verifications
for select
to authenticated
using (
  identity_id = public.current_jne_identity_id()
  or public.is_admin()
);


comment on table public.driver_profiles is
  'Perfil profissional B2B do JNE Empresas. Não substitui profiles nem driver_public_profiles da 2.2.4.';

comment on table public.vehicles is
  'Veículos estruturados do motorista para compatibilidade no JNE Empresas. A placa fica exclusivamente no schema private.';

comment on table private.vehicle_pii is
  'Placa protegida do veículo. Fingerprint deve usar HMAC calculado pelo servidor.';

comment on table public.driver_verifications is
  'Histórico de verificações profissionais do motorista JNE Empresas. Empresas não recebem documentos ou detalhes antifraude.';

comment on table private.verification_internal is
  'Metadados mínimos de provedor e informações internas de revisão/antifraude.';

comment on table private.verification_documents is
  'Metadados de documentos privados do processo de verificação. Arquivos ficam no bucket privado jne-driver-documents.';
