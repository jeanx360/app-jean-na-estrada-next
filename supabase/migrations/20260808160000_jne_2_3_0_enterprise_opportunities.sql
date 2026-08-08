-- JNE App 2.3.0 — P4: oportunidades empresariais e feed seguro para motoristas
-- Depende de:
--   20260808150000_jne_2_3_0_identity_foundation.sql
--   20260808152000_jne_2_3_0_organizations.sql
--   20260808154000_jne_2_3_0_driver_verification.sql
-- Migração aditiva. Não cria oportunidades e não altera recursos existentes da 2.2.4.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;


-- ============================================================
-- 1. OPORTUNIDADE ESTRUTURADA
-- ============================================================
--
-- Esta tabela contém apenas os campos operacionais necessários ao
-- marketplace. Motoristas NÃO recebem SELECT direto nela.
-- O feed do motorista é fornecido exclusivamente por RPC segura,
-- que não retorna organization_id, created_by_identity_id ou detalhes
-- privados capazes de identificar a empresa antes da negociação.

create table if not exists public.enterprise_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  created_by_identity_id uuid not null references public.jne_identities(id) on delete restrict,

  status text not null default 'draft'
    check (status in (
      'draft',
      'published',
      'paused',
      'negotiating',
      'contracted',
      'expired',
      'cancelled'
    )),

  service_type text not null
    check (service_type in (
      'employee_transport',
      'executive_transport',
      'airport_transfer',
      'event_transport',
      'tourism',
      'recurring_transport',
      'professional_transport',
      'other'
    )),

  engagement_type text not null
    check (engagement_type in (
      'one_time',
      'temporary',
      'recurring',
      'ongoing'
    )),

  origin_city text not null check (length(trim(origin_city)) between 2 and 120),
  origin_region text not null check (length(trim(origin_region)) between 2 and 120),
  destination_city text check (destination_city is null or length(trim(destination_city)) between 2 and 120),
  destination_region text check (destination_region is null or length(trim(destination_region)) between 2 and 120),

  start_date date not null,
  end_date date,
  intended_duration_days smallint not null
    check (intended_duration_days between 1 and 3650),

  schedule_pattern text not null default 'flexible'
    check (schedule_pattern in (
      'one_time',
      'weekdays',
      'weekends',
      'selected_days',
      'shifts',
      'flexible',
      'other'
    )),
  daily_start_time time,
  daily_end_time time,

  required_seats smallint not null default 1
    check (required_seats between 1 and 60),
  required_vehicle_type text not null default 'any'
    check (required_vehicle_type in (
      'any',
      'hatch',
      'sedan',
      'suv',
      'minivan',
      'van',
      'pickup',
      'other'
    )),
  required_powertrain text not null default 'any'
    check (required_powertrain in (
      'any',
      'electric',
      'hybrid',
      'plug_in_hybrid',
      'combustion',
      'other'
    )),
  requires_verified_vehicle boolean not null default true,
  requires_ear boolean not null default true,

  budget_type text not null default 'negotiable'
    check (budget_type in (
      'per_trip',
      'daily',
      'weekly',
      'monthly',
      'total',
      'negotiable'
    )),
  budget_min numeric(12,2) check (budget_min is null or budget_min >= 0),
  budget_max numeric(12,2) check (budget_max is null or budget_max >= 0),
  currency_code text not null default 'BRL'
    check (currency_code ~ '^[A-Z]{3}$'),

  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (end_date is null or end_date >= start_date),
  check (
    end_date is null
    or intended_duration_days >= ((end_date - start_date) + 1)
  ),
  check (
    budget_min is null
    or budget_max is null
    or budget_max >= budget_min
  ),
  check (
    expires_at is null
    or published_at is null
    or expires_at > published_at
  )
);

create index if not exists enterprise_opportunities_org_status_idx
  on public.enterprise_opportunities(organization_id, status, created_at desc);

create index if not exists enterprise_opportunities_feed_idx
  on public.enterprise_opportunities(status, origin_region, origin_city, start_date, published_at desc);

create index if not exists enterprise_opportunities_expiration_idx
  on public.enterprise_opportunities(status, expires_at)
  where status = 'published';


drop trigger if exists enterprise_opportunities_set_updated_at on public.enterprise_opportunities;
create trigger enterprise_opportunities_set_updated_at
before update on public.enterprise_opportunities
for each row execute function public.set_updated_at();


-- ============================================================
-- 2. DETALHES PRIVADOS DA OPORTUNIDADE
-- ============================================================
--
-- Endereço exato, instruções, contato e contexto que possam identificar
-- empresa/passageiros permanecem fora do schema público.
-- O backend deve cifrar estes payloads antes de chamar a RPC de criação.

create table if not exists private.enterprise_opportunity_details (
  opportunity_id uuid primary key references public.enterprise_opportunities(id) on delete cascade,
  route_details_encrypted text,
  contact_details_encrypted text,
  private_notes_encrypted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    route_details_encrypted is null
    or length(route_details_encrypted) between 16 and 20000
  ),
  check (
    contact_details_encrypted is null
    or length(contact_details_encrypted) between 16 and 10000
  ),
  check (
    private_notes_encrypted is null
    or length(private_notes_encrypted) between 16 and 20000
  )
);


drop trigger if exists enterprise_opportunity_details_set_updated_at on private.enterprise_opportunity_details;
create trigger enterprise_opportunity_details_set_updated_at
before update on private.enterprise_opportunity_details
for each row execute function public.set_updated_at();


-- ============================================================
-- 3. CRIAÇÃO ATÔMICA DE OPORTUNIDADE
-- ============================================================
--
-- Somente service_role chama esta função. O backend deve obter a
-- identidade do usuário autenticado no servidor e passá-la como ator.
-- A função confirma o vínculo empresarial no banco; não confia em UI.

create or replace function public.create_enterprise_opportunity(
  p_actor_identity_id uuid,
  p_organization_id uuid,
  p_service_type text,
  p_engagement_type text,
  p_origin_city text,
  p_origin_region text,
  p_destination_city text,
  p_destination_region text,
  p_start_date date,
  p_end_date date,
  p_intended_duration_days smallint,
  p_schedule_pattern text,
  p_daily_start_time time,
  p_daily_end_time time,
  p_required_seats smallint,
  p_required_vehicle_type text,
  p_required_powertrain text,
  p_requires_verified_vehicle boolean,
  p_requires_ear boolean,
  p_budget_type text,
  p_budget_min numeric,
  p_budget_max numeric,
  p_currency_code text,
  p_route_details_encrypted text,
  p_contact_details_encrypted text,
  p_private_notes_encrypted text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_status text;
  organization_status text;
  new_opportunity_id uuid;
begin
  if p_actor_identity_id is null or p_organization_id is null then
    raise exception 'Identidade e organização são obrigatórias.' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_origin_city, '')), '') is null
     or nullif(trim(coalesce(p_origin_region, '')), '') is null then
    raise exception 'Cidade e região de origem são obrigatórias.' using errcode = '22023';
  end if;

  select i.status
    into actor_status
  from public.jne_identities i
  where i.id = p_actor_identity_id
  for update;

  if actor_status is null then
    raise exception 'Identidade JNE não encontrada.' using errcode = 'P0002';
  end if;

  if actor_status <> 'active' then
    raise exception 'A identidade responsável não está ativa.' using errcode = '42501';
  end if;

  select o.status
    into organization_status
  from public.organizations o
  where o.id = p_organization_id
  for update;

  if organization_status is null then
    raise exception 'Organização não encontrada.' using errcode = 'P0002';
  end if;

  if organization_status in ('suspended', 'closed') then
    raise exception 'A organização não pode criar oportunidades neste estado.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.identity_id = p_actor_identity_id
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'recruiter')
  ) then
    raise exception 'Sem permissão para criar oportunidades nesta organização.' using errcode = '42501';
  end if;

  insert into public.enterprise_opportunities (
    organization_id,
    created_by_identity_id,
    status,
    service_type,
    engagement_type,
    origin_city,
    origin_region,
    destination_city,
    destination_region,
    start_date,
    end_date,
    intended_duration_days,
    schedule_pattern,
    daily_start_time,
    daily_end_time,
    required_seats,
    required_vehicle_type,
    required_powertrain,
    requires_verified_vehicle,
    requires_ear,
    budget_type,
    budget_min,
    budget_max,
    currency_code
  )
  values (
    p_organization_id,
    p_actor_identity_id,
    'draft',
    p_service_type,
    p_engagement_type,
    trim(p_origin_city),
    trim(p_origin_region),
    nullif(trim(coalesce(p_destination_city, '')), ''),
    nullif(trim(coalesce(p_destination_region, '')), ''),
    p_start_date,
    p_end_date,
    p_intended_duration_days,
    p_schedule_pattern,
    p_daily_start_time,
    p_daily_end_time,
    p_required_seats,
    p_required_vehicle_type,
    p_required_powertrain,
    coalesce(p_requires_verified_vehicle, true),
    coalesce(p_requires_ear, true),
    p_budget_type,
    p_budget_min,
    p_budget_max,
    upper(trim(coalesce(p_currency_code, 'BRL')))
  )
  returning id into new_opportunity_id;

  insert into private.enterprise_opportunity_details (
    opportunity_id,
    route_details_encrypted,
    contact_details_encrypted,
    private_notes_encrypted
  )
  values (
    new_opportunity_id,
    nullif(p_route_details_encrypted, ''),
    nullif(p_contact_details_encrypted, ''),
    nullif(p_private_notes_encrypted, '')
  );

  return new_opportunity_id;
end;
$$;

revoke all on function public.create_enterprise_opportunity(
  uuid, uuid, text, text, text, text, text, text, date, date, smallint,
  text, time, time, smallint, text, text, boolean, boolean, text,
  numeric, numeric, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.create_enterprise_opportunity(
  uuid, uuid, text, text, text, text, text, text, date, date, smallint,
  text, time, time, smallint, text, text, boolean, boolean, text,
  numeric, numeric, text, text, text, text
) to service_role;


-- ============================================================
-- 4. PUBLICAÇÃO / PAUSA / CANCELAMENTO
-- ============================================================
--
-- P4 só permite à empresa controlar draft/published/paused/cancelled.
-- negotiating e contracted serão controlados pelas transações de P6/P7.

create or replace function public.publish_enterprise_opportunity(
  p_opportunity_id uuid,
  p_actor_identity_id uuid,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  opportunity_organization_id uuid;
  opportunity_status text;
  opportunity_end_date date;
  organization_status text;
begin
  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'Prazo de publicação inválido.' using errcode = '22023';
  end if;

  select eo.organization_id, eo.status, eo.end_date
    into opportunity_organization_id, opportunity_status, opportunity_end_date
  from public.enterprise_opportunities eo
  where eo.id = p_opportunity_id
  for update;

  if opportunity_organization_id is null then
    raise exception 'Oportunidade não encontrada.' using errcode = 'P0002';
  end if;

  if opportunity_status not in ('draft', 'paused') then
    raise exception 'A oportunidade não pode ser publicada neste estado.' using errcode = '23514';
  end if;

  if opportunity_end_date is not null and opportunity_end_date < current_date then
    raise exception 'A oportunidade já terminou.' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.jne_identities i
    where i.id = p_actor_identity_id
      and i.status = 'active'
  ) then
    raise exception 'Identidade responsável inválida.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_members m
    where m.organization_id = opportunity_organization_id
      and m.identity_id = p_actor_identity_id
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'recruiter')
  ) then
    raise exception 'Sem permissão para publicar esta oportunidade.' using errcode = '42501';
  end if;

  select o.status
    into organization_status
  from public.organizations o
  where o.id = opportunity_organization_id
  for update;

  if organization_status <> 'verified' then
    raise exception 'Somente organizações verificadas podem publicar oportunidades.' using errcode = '42501';
  end if;

  update public.enterprise_opportunities
  set
    status = 'published',
    published_at = coalesce(published_at, now()),
    expires_at = p_expires_at
  where id = p_opportunity_id;

  return p_opportunity_id;
end;
$$;

revoke all on function public.publish_enterprise_opportunity(uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.publish_enterprise_opportunity(uuid, uuid, timestamptz)
  to service_role;


create or replace function public.pause_enterprise_opportunity(
  p_opportunity_id uuid,
  p_actor_identity_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  opportunity_organization_id uuid;
  opportunity_status text;
begin
  select eo.organization_id, eo.status
    into opportunity_organization_id, opportunity_status
  from public.enterprise_opportunities eo
  where eo.id = p_opportunity_id
  for update;

  if opportunity_organization_id is null then
    raise exception 'Oportunidade não encontrada.' using errcode = 'P0002';
  end if;

  if opportunity_status <> 'published' then
    raise exception 'Somente oportunidade publicada pode ser pausada.' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.jne_identities i
    where i.id = p_actor_identity_id
      and i.status = 'active'
  ) then
    raise exception 'Identidade responsável inválida.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_members m
    where m.organization_id = opportunity_organization_id
      and m.identity_id = p_actor_identity_id
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'recruiter')
  ) then
    raise exception 'Sem permissão para pausar esta oportunidade.' using errcode = '42501';
  end if;

  update public.enterprise_opportunities
  set status = 'paused'
  where id = p_opportunity_id;

  return p_opportunity_id;
end;
$$;

revoke all on function public.pause_enterprise_opportunity(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.pause_enterprise_opportunity(uuid, uuid)
  to service_role;


create or replace function public.cancel_enterprise_opportunity(
  p_opportunity_id uuid,
  p_actor_identity_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  opportunity_organization_id uuid;
  opportunity_status text;
begin
  select eo.organization_id, eo.status
    into opportunity_organization_id, opportunity_status
  from public.enterprise_opportunities eo
  where eo.id = p_opportunity_id
  for update;

  if opportunity_organization_id is null then
    raise exception 'Oportunidade não encontrada.' using errcode = 'P0002';
  end if;

  if opportunity_status not in ('draft', 'published', 'paused') then
    raise exception 'A oportunidade não pode ser cancelada neste estado.' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.jne_identities i
    where i.id = p_actor_identity_id
      and i.status = 'active'
  ) then
    raise exception 'Identidade responsável inválida.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_members m
    where m.organization_id = opportunity_organization_id
      and m.identity_id = p_actor_identity_id
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'recruiter')
  ) then
    raise exception 'Sem permissão para cancelar esta oportunidade.' using errcode = '42501';
  end if;

  update public.enterprise_opportunities
  set status = 'cancelled'
  where id = p_opportunity_id;

  return p_opportunity_id;
end;
$$;

revoke all on function public.cancel_enterprise_opportunity(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.cancel_enterprise_opportunity(uuid, uuid)
  to service_role;


-- ============================================================
-- 5. AUTORIZAÇÃO DO MOTORISTA PARA O FEED SEGURO
-- ============================================================

create or replace function public.can_browse_enterprise_opportunities()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.jne_identities i
    join public.driver_profiles dp
      on dp.identity_id = i.id
    join public.jne_identity_roles r
      on r.identity_id = i.id
     and r.role = 'enterprise_driver'
     and r.status = 'active'
    where i.id = public.current_jne_identity_id()
      and i.status = 'active'
      and dp.professional_status <> 'suspended'
  );
$$;

revoke all on function public.can_browse_enterprise_opportunities() from public, anon;
grant execute on function public.can_browse_enterprise_opportunities() to authenticated;


-- ============================================================
-- 6. FEED ANONIMIZADO DO MOTORISTA
-- ============================================================
--
-- Deliberadamente NÃO retorna:
--   organization_id
--   created_by_identity_id
--   razão social / nome fantasia / CNPJ
--   contato / telefone / e-mail
--   endereço exato / instruções privadas
--   qualquer texto livre da empresa
--
-- O motorista recebe apenas dados estruturados suficientes para decidir
-- se deseja demonstrar interesse. P5 adicionará interesse + elegibilidade.

create or replace function public.list_safe_enterprise_opportunities(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  service_type text,
  engagement_type text,
  origin_city text,
  origin_region text,
  destination_city text,
  destination_region text,
  start_date date,
  end_date date,
  intended_duration_days smallint,
  schedule_pattern text,
  daily_start_time time,
  daily_end_time time,
  required_seats smallint,
  required_vehicle_type text,
  required_powertrain text,
  requires_verified_vehicle boolean,
  requires_ear boolean,
  budget_type text,
  budget_min numeric,
  budget_max numeric,
  currency_code text,
  published_at timestamptz,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_browse_enterprise_opportunities() then
    raise exception 'Perfil de motorista empresarial necessário.' using errcode = '42501';
  end if;

  return query
  select
    eo.id,
    eo.service_type,
    eo.engagement_type,
    eo.origin_city,
    eo.origin_region,
    eo.destination_city,
    eo.destination_region,
    eo.start_date,
    eo.end_date,
    eo.intended_duration_days,
    eo.schedule_pattern,
    eo.daily_start_time,
    eo.daily_end_time,
    eo.required_seats,
    eo.required_vehicle_type,
    eo.required_powertrain,
    eo.requires_verified_vehicle,
    eo.requires_ear,
    eo.budget_type,
    eo.budget_min,
    eo.budget_max,
    eo.currency_code,
    eo.published_at,
    eo.expires_at
  from public.enterprise_opportunities eo
  where eo.status = 'published'
    and eo.expires_at is not null
    and eo.expires_at > now()
    and (eo.end_date is null or eo.end_date >= current_date)
  order by eo.published_at desc, eo.id
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.list_safe_enterprise_opportunities(integer, integer)
  from public, anon;
grant execute on function public.list_safe_enterprise_opportunities(integer, integer)
  to authenticated;


create or replace function public.get_safe_enterprise_opportunity(
  p_opportunity_id uuid
)
returns table (
  id uuid,
  service_type text,
  engagement_type text,
  origin_city text,
  origin_region text,
  destination_city text,
  destination_region text,
  start_date date,
  end_date date,
  intended_duration_days smallint,
  schedule_pattern text,
  daily_start_time time,
  daily_end_time time,
  required_seats smallint,
  required_vehicle_type text,
  required_powertrain text,
  requires_verified_vehicle boolean,
  requires_ear boolean,
  budget_type text,
  budget_min numeric,
  budget_max numeric,
  currency_code text,
  published_at timestamptz,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_browse_enterprise_opportunities() then
    raise exception 'Perfil de motorista empresarial necessário.' using errcode = '42501';
  end if;

  return query
  select
    eo.id,
    eo.service_type,
    eo.engagement_type,
    eo.origin_city,
    eo.origin_region,
    eo.destination_city,
    eo.destination_region,
    eo.start_date,
    eo.end_date,
    eo.intended_duration_days,
    eo.schedule_pattern,
    eo.daily_start_time,
    eo.daily_end_time,
    eo.required_seats,
    eo.required_vehicle_type,
    eo.required_powertrain,
    eo.requires_verified_vehicle,
    eo.requires_ear,
    eo.budget_type,
    eo.budget_min,
    eo.budget_max,
    eo.currency_code,
    eo.published_at,
    eo.expires_at
  from public.enterprise_opportunities eo
  where eo.id = p_opportunity_id
    and eo.status = 'published'
    and eo.expires_at is not null
    and eo.expires_at > now()
    and (eo.end_date is null or eo.end_date >= current_date)
  limit 1;
end;
$$;

revoke all on function public.get_safe_enterprise_opportunity(uuid)
  from public, anon;
grant execute on function public.get_safe_enterprise_opportunity(uuid)
  to authenticated;


-- ============================================================
-- 7. RLS / PRIVILÉGIOS
-- ============================================================

alter table public.enterprise_opportunities enable row level security;

revoke all on private.enterprise_opportunity_details from public, anon, authenticated;
revoke all on public.enterprise_opportunities from anon, authenticated;

-- SELECT direto serve apenas à empresa dona da oportunidade (e admin),
-- controlado pela policy abaixo. Motorista usa as RPCs seguras.
grant select on public.enterprise_opportunities to authenticated;


drop policy if exists "Organization members read own enterprise opportunities"
  on public.enterprise_opportunities;
create policy "Organization members read own enterprise opportunities"
on public.enterprise_opportunities
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  or public.is_admin()
);


comment on table public.enterprise_opportunities is
  'Oportunidades de transporte do JNE Empresas. SELECT direto é restrito à organização; motoristas usam RPC anonimizada.';

comment on table private.enterprise_opportunity_details is
  'Detalhes cifrados e identificadores privados da oportunidade. Nunca expostos no feed pré-negociação.';

comment on function public.list_safe_enterprise_opportunities(integer, integer) is
  'Feed estruturado e anonimizado para motoristas do JNE Empresas; não retorna identidade da organização nem dados privados.';

comment on function public.get_safe_enterprise_opportunity(uuid) is
  'Detalhe seguro de uma oportunidade publicada para o motorista, mantendo anonimato pré-negociação.';
