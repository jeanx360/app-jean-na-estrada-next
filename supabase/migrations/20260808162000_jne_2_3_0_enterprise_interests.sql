-- JNE App 2.3.0 — P5: interesse do motorista e elegibilidade operacional
-- Depende de:
--   20260808150000_jne_2_3_0_identity_foundation.sql
--   20260808152000_jne_2_3_0_organizations.sql
--   20260808154000_jne_2_3_0_driver_verification.sql
--   20260808160000_jne_2_3_0_enterprise_opportunities.sql
-- Migração aditiva. Não inicia negociação exclusiva e não consome crédito comercial.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;


-- ============================================================
-- 1. INTERESSES
-- ============================================================
--
-- "TENHO INTERESSE" registra somente intenção do motorista.
-- Não bloqueia a oportunidade, não seleciona motorista e não cria negociação.
-- P6 será responsável pela seleção exclusiva e revalidará toda elegibilidade.

create table if not exists public.enterprise_opportunity_interests (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null
    references public.enterprise_opportunities(id) on delete cascade,
  driver_identity_id uuid not null
    references public.jne_identities(id) on delete restrict,
  vehicle_id uuid not null
    references public.vehicles(id) on delete restrict,

  status text not null default 'submitted'
    check (status in (
      'submitted',
      'selected',
      'released',
      'withdrawn',
      'rejected',
      'closed'
    )),

  submitted_at timestamptz not null default now(),
  selected_at timestamptz,
  released_at timestamptz,
  withdrawn_at timestamptz,
  rejected_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (opportunity_id, driver_identity_id)
);

create index if not exists enterprise_interests_opportunity_status_idx
  on public.enterprise_opportunity_interests(opportunity_id, status, submitted_at desc);

create index if not exists enterprise_interests_driver_status_idx
  on public.enterprise_opportunity_interests(driver_identity_id, status, submitted_at desc);

create index if not exists enterprise_interests_vehicle_idx
  on public.enterprise_opportunity_interests(vehicle_id, status);


drop trigger if exists enterprise_opportunity_interests_set_updated_at
  on public.enterprise_opportunity_interests;
create trigger enterprise_opportunity_interests_set_updated_at
before update on public.enterprise_opportunity_interests
for each row execute function public.set_updated_at();


-- ============================================================
-- 2. MOTOR DE ELEGIBILIDADE INTERNO
-- ============================================================
--
-- Esta função NÃO é exposta a anon/authenticated.
-- Ela verifica o estado atual do motorista e do veículo.
-- O resultado é apenas operacional; P6 fará nova validação transacional.

create or replace function private.evaluate_enterprise_interest_eligibility(
  p_opportunity_id uuid,
  p_identity_id uuid,
  p_vehicle_id uuid
)
returns table (
  eligible boolean,
  reason_code text,
  driver_verified boolean,
  vehicle_verified boolean,
  ear_verified boolean,
  seats_ok boolean,
  vehicle_type_ok boolean,
  powertrain_ok boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_opportunity_status text;
  v_opportunity_expires_at timestamptz;
  v_opportunity_end_date date;
  v_required_seats smallint;
  v_required_vehicle_type text;
  v_required_powertrain text;
  v_requires_verified_vehicle boolean;
  v_requires_ear boolean;

  v_identity_status text;
  v_driver_status text;
  v_driver_availability text;
  v_driver_verified_at timestamptz;
  v_driver_verification_expires_at timestamptz;
  v_has_enterprise_driver_role boolean := false;

  v_vehicle_identity_id uuid;
  v_vehicle_status text;
  v_vehicle_verified_at timestamptz;
  v_vehicle_verification_expires_at timestamptz;
  v_vehicle_seats smallint;
  v_vehicle_type text;
  v_vehicle_powertrain text;
  v_vehicle_active boolean := false;

  v_driver_verified boolean := false;
  v_vehicle_verified boolean := false;
  v_ear_verified boolean := false;
  v_seats_ok boolean := false;
  v_vehicle_type_ok boolean := false;
  v_powertrain_ok boolean := false;
  v_reason_code text := 'eligible';
begin
  if p_opportunity_id is null then
    return query select
      false, 'opportunity_required', false, false, false, false, false, false;
    return;
  end if;

  if p_identity_id is null then
    return query select
      false, 'identity_required', false, false, false, false, false, false;
    return;
  end if;

  if p_vehicle_id is null then
    return query select
      false, 'vehicle_required', false, false, false, false, false, false;
    return;
  end if;

  select
    eo.status,
    eo.expires_at,
    eo.end_date,
    eo.required_seats,
    eo.required_vehicle_type,
    eo.required_powertrain,
    eo.requires_verified_vehicle,
    eo.requires_ear
  into
    v_opportunity_status,
    v_opportunity_expires_at,
    v_opportunity_end_date,
    v_required_seats,
    v_required_vehicle_type,
    v_required_powertrain,
    v_requires_verified_vehicle,
    v_requires_ear
  from public.enterprise_opportunities eo
  where eo.id = p_opportunity_id;

  if not found then
    return query select
      false, 'opportunity_not_found', false, false, false, false, false, false;
    return;
  end if;

  if v_opportunity_status <> 'published'
     or v_opportunity_expires_at is null
     or v_opportunity_expires_at <= now()
     or (v_opportunity_end_date is not null and v_opportunity_end_date < current_date) then
    return query select
      false, 'opportunity_not_open', false, false, false, false, false, false;
    return;
  end if;

  select
    i.status,
    dp.professional_status,
    dp.availability_status,
    dp.verified_at,
    dp.verification_expires_at
  into
    v_identity_status,
    v_driver_status,
    v_driver_availability,
    v_driver_verified_at,
    v_driver_verification_expires_at
  from public.jne_identities i
  left join public.driver_profiles dp
    on dp.identity_id = i.id
  where i.id = p_identity_id;

  if not found or v_identity_status <> 'active' then
    return query select
      false, 'driver_identity_inactive', false, false, false, false, false, false;
    return;
  end if;

  select exists (
    select 1
    from public.jne_identity_roles r
    where r.identity_id = p_identity_id
      and r.role = 'enterprise_driver'
      and r.status = 'active'
  ) into v_has_enterprise_driver_role;

  v_driver_verified :=
    v_has_enterprise_driver_role
    and v_driver_status = 'approved'
    and v_driver_verified_at is not null
    and (
      v_driver_verification_expires_at is null
      or v_driver_verification_expires_at > now()
    );

  if not v_has_enterprise_driver_role then
    v_reason_code := 'enterprise_driver_role_required';
  elsif v_driver_status is null then
    v_reason_code := 'driver_profile_required';
  elsif not v_driver_verified then
    v_reason_code := 'driver_verification_required';
  elsif v_driver_availability = 'unavailable' then
    v_reason_code := 'driver_unavailable';
  end if;

  select
    v.identity_id,
    v.status,
    v.verified_at,
    v.verification_expires_at,
    v.seats,
    v.vehicle_type,
    v.powertrain
  into
    v_vehicle_identity_id,
    v_vehicle_status,
    v_vehicle_verified_at,
    v_vehicle_verification_expires_at,
    v_vehicle_seats,
    v_vehicle_type,
    v_vehicle_powertrain
  from public.vehicles v
  where v.id = p_vehicle_id;

  if not found or v_vehicle_identity_id <> p_identity_id then
    return query select
      false,
      'vehicle_not_owned',
      v_driver_verified,
      false,
      false,
      false,
      false,
      false;
    return;
  end if;

  v_vehicle_active := v_vehicle_status in ('pending_verification', 'verified');

  v_vehicle_verified :=
    v_vehicle_status = 'verified'
    and v_vehicle_verified_at is not null
    and (
      v_vehicle_verification_expires_at is null
      or v_vehicle_verification_expires_at > now()
    );

  v_seats_ok := v_vehicle_seats >= v_required_seats;
  v_vehicle_type_ok :=
    v_required_vehicle_type = 'any'
    or v_vehicle_type = v_required_vehicle_type;
  v_powertrain_ok :=
    v_required_powertrain = 'any'
    or v_vehicle_powertrain = v_required_powertrain;

  select exists (
    select 1
    from public.driver_verifications dv
    where dv.identity_id = p_identity_id
      and dv.verification_type = 'ear'
      and dv.status = 'approved'
      and (dv.expires_at is null or dv.expires_at > now())
  ) into v_ear_verified;

  if v_reason_code = 'eligible' and not v_vehicle_active then
    v_reason_code := 'vehicle_not_active';
  end if;

  if v_reason_code = 'eligible'
     and v_requires_verified_vehicle
     and not v_vehicle_verified then
    v_reason_code := 'verified_vehicle_required';
  end if;

  if v_reason_code = 'eligible' and not v_seats_ok then
    v_reason_code := 'insufficient_seats';
  end if;

  if v_reason_code = 'eligible' and not v_vehicle_type_ok then
    v_reason_code := 'vehicle_type_mismatch';
  end if;

  if v_reason_code = 'eligible' and not v_powertrain_ok then
    v_reason_code := 'powertrain_mismatch';
  end if;

  if v_reason_code = 'eligible'
     and v_requires_ear
     and not v_ear_verified then
    v_reason_code := 'ear_required';
  end if;

  return query select
    v_reason_code = 'eligible',
    v_reason_code,
    v_driver_verified,
    v_vehicle_verified,
    v_ear_verified,
    v_seats_ok,
    v_vehicle_type_ok,
    v_powertrain_ok;
end;
$$;

revoke all on function private.evaluate_enterprise_interest_eligibility(uuid, uuid, uuid)
  from public, anon, authenticated;


-- ============================================================
-- 3. ELEGIBILIDADE SEGURA PARA O MOTORISTA
-- ============================================================
--
-- Deriva a identidade de auth.uid(). O cliente não informa CPF,
-- identidade profissional ou qualquer atributo de confiança.

create or replace function public.get_enterprise_opportunity_interest_eligibility(
  p_opportunity_id uuid,
  p_vehicle_id uuid
)
returns table (
  eligible boolean,
  reason_code text,
  driver_verified boolean,
  vehicle_verified boolean,
  ear_verified boolean,
  seats_ok boolean,
  vehicle_type_ok boolean,
  powertrain_ok boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_identity_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;

  v_identity_id := public.current_jne_identity_id();

  if v_identity_id is null then
    raise exception 'Identidade JNE necessária.' using errcode = '42501';
  end if;

  return query
  select *
  from private.evaluate_enterprise_interest_eligibility(
    p_opportunity_id,
    v_identity_id,
    p_vehicle_id
  );
end;
$$;

revoke all on function public.get_enterprise_opportunity_interest_eligibility(uuid, uuid)
  from public, anon;
grant execute on function public.get_enterprise_opportunity_interest_eligibility(uuid, uuid)
  to authenticated;


-- ============================================================
-- 4. TENHO INTERESSE
-- ============================================================
--
-- Idempotente para interesse ainda submitted.
-- withdrawn/released podem voltar para submitted quando a oportunidade
-- estiver novamente aberta. selected/rejected/closed exigem outro fluxo.
-- Nenhum crédito comercial é consumido aqui.

create or replace function public.submit_enterprise_opportunity_interest(
  p_opportunity_id uuid,
  p_vehicle_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identity_id uuid;
  v_opportunity_status text;
  v_opportunity_expires_at timestamptz;
  v_opportunity_end_date date;
  v_eligibility record;
  v_interest_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;

  v_identity_id := public.current_jne_identity_id();

  if v_identity_id is null then
    raise exception 'Identidade JNE necessária.' using errcode = '42501';
  end if;

  -- O lock impede que P6 altere a oportunidade entre a validação e o insert.
  select eo.status, eo.expires_at, eo.end_date
    into v_opportunity_status, v_opportunity_expires_at, v_opportunity_end_date
  from public.enterprise_opportunities eo
  where eo.id = p_opportunity_id
  for share;

  if not found then
    raise exception 'Oportunidade não encontrada.' using errcode = 'P0002';
  end if;

  if v_opportunity_status <> 'published'
     or v_opportunity_expires_at is null
     or v_opportunity_expires_at <= now()
     or (v_opportunity_end_date is not null and v_opportunity_end_date < current_date) then
    raise exception 'A oportunidade não está disponível para novos interesses.' using errcode = '23514';
  end if;

  select *
    into v_eligibility
  from private.evaluate_enterprise_interest_eligibility(
    p_opportunity_id,
    v_identity_id,
    p_vehicle_id
  );

  if v_eligibility.eligible is distinct from true then
    raise exception 'Motorista não elegível para esta oportunidade: %',
      coalesce(v_eligibility.reason_code, 'unknown')
      using errcode = '42501';
  end if;

  insert into public.enterprise_opportunity_interests (
    opportunity_id,
    driver_identity_id,
    vehicle_id,
    status,
    submitted_at,
    selected_at,
    released_at,
    withdrawn_at,
    rejected_at,
    closed_at
  )
  values (
    p_opportunity_id,
    v_identity_id,
    p_vehicle_id,
    'submitted',
    now(),
    null,
    null,
    null,
    null,
    null
  )
  on conflict (opportunity_id, driver_identity_id)
  do update set
    vehicle_id = excluded.vehicle_id,
    status = 'submitted',
    submitted_at = case
      when public.enterprise_opportunity_interests.status in ('withdrawn', 'released')
        then now()
      else public.enterprise_opportunity_interests.submitted_at
    end,
    selected_at = null,
    released_at = null,
    withdrawn_at = null
  where public.enterprise_opportunity_interests.status in (
    'submitted',
    'withdrawn',
    'released'
  )
  returning id into v_interest_id;

  if v_interest_id is null then
    raise exception 'Este interesse não pode ser reenviado no estado atual.' using errcode = '23514';
  end if;

  return v_interest_id;
end;
$$;

revoke all on function public.submit_enterprise_opportunity_interest(uuid, uuid)
  from public, anon;
grant execute on function public.submit_enterprise_opportunity_interest(uuid, uuid)
  to authenticated;


-- ============================================================
-- 5. RETIRAR INTERESSE
-- ============================================================
--
-- O motorista pode retirar apenas enquanto estiver submitted.
-- Se já foi selected, P6 controlará o encerramento da negociação.

create or replace function public.withdraw_enterprise_opportunity_interest(
  p_interest_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identity_id uuid;
  v_interest_owner uuid;
  v_interest_status text;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;

  v_identity_id := public.current_jne_identity_id();

  if v_identity_id is null then
    raise exception 'Identidade JNE necessária.' using errcode = '42501';
  end if;

  select eoi.driver_identity_id, eoi.status
    into v_interest_owner, v_interest_status
  from public.enterprise_opportunity_interests eoi
  where eoi.id = p_interest_id
  for update;

  if not found then
    raise exception 'Interesse não encontrado.' using errcode = 'P0002';
  end if;

  if v_interest_owner <> v_identity_id then
    raise exception 'Sem permissão para retirar este interesse.' using errcode = '42501';
  end if;

  if v_interest_status <> 'submitted' then
    raise exception 'Somente interesse enviado pode ser retirado diretamente.' using errcode = '23514';
  end if;

  update public.enterprise_opportunity_interests
  set
    status = 'withdrawn',
    withdrawn_at = now()
  where id = p_interest_id;

  return p_interest_id;
end;
$$;

revoke all on function public.withdraw_enterprise_opportunity_interest(uuid)
  from public, anon;
grant execute on function public.withdraw_enterprise_opportunity_interest(uuid)
  to authenticated;


-- ============================================================
-- 6. CANDIDATOS SEGUROS PARA A EMPRESA
-- ============================================================
--
-- A empresa selecionará o interest_id no P6.
-- Não são retornados identity_id, nome, CPF, CNH, placa, telefone ou e-mail.
-- O alias é derivado do próprio interesse e não permite correlacionar o
-- motorista entre oportunidades diferentes.

create or replace function public.list_safe_enterprise_opportunity_candidates(
  p_opportunity_id uuid,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  interest_id uuid,
  interest_status text,
  submitted_at timestamptz,
  driver_alias text,
  vehicle_brand text,
  vehicle_model text,
  vehicle_model_year smallint,
  vehicle_seats smallint,
  vehicle_type text,
  vehicle_powertrain text,
  driver_verified boolean,
  vehicle_verified boolean,
  ear_verified boolean,
  eligible_now boolean,
  eligibility_reason_code text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_identity_id uuid;
  v_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;

  v_identity_id := public.current_jne_identity_id();

  if v_identity_id is null then
    raise exception 'Identidade JNE necessária.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.jne_identities i
    where i.id = v_identity_id
      and i.status = 'active'
  ) then
    raise exception 'Identidade JNE inativa.' using errcode = '42501';
  end if;

  select eo.organization_id
    into v_organization_id
  from public.enterprise_opportunities eo
  where eo.id = p_opportunity_id;

  if not found then
    raise exception 'Oportunidade não encontrada.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.organization_members m
    where m.organization_id = v_organization_id
      and m.identity_id = v_identity_id
      and m.status = 'active'
  ) and not public.is_admin() then
    raise exception 'Sem permissão para visualizar candidatos desta oportunidade.' using errcode = '42501';
  end if;

  return query
  select
    eoi.id,
    eoi.status,
    eoi.submitted_at,
    ('Motorista JNE ' || upper(substr(replace(eoi.id::text, '-', ''), 1, 6)))::text,
    v.brand,
    v.model,
    v.model_year,
    v.seats,
    v.vehicle_type,
    v.powertrain,
    elig.driver_verified,
    elig.vehicle_verified,
    elig.ear_verified,
    elig.eligible,
    elig.reason_code
  from public.enterprise_opportunity_interests eoi
  join public.vehicles v
    on v.id = eoi.vehicle_id
  cross join lateral private.evaluate_enterprise_interest_eligibility(
    eoi.opportunity_id,
    eoi.driver_identity_id,
    eoi.vehicle_id
  ) elig
  where eoi.opportunity_id = p_opportunity_id
    and eoi.status in ('submitted', 'selected')
  order by
    case when eoi.status = 'selected' then 0 else 1 end,
    elig.eligible desc,
    eoi.submitted_at asc,
    eoi.id
  limit greatest(1, least(coalesce(p_limit, 100), 200))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.list_safe_enterprise_opportunity_candidates(uuid, integer, integer)
  from public, anon;
grant execute on function public.list_safe_enterprise_opportunity_candidates(uuid, integer, integer)
  to authenticated;


-- ============================================================
-- 7. RLS / PRIVILÉGIOS
-- ============================================================

alter table public.enterprise_opportunity_interests enable row level security;

revoke all on public.enterprise_opportunity_interests from anon, authenticated;
grant select on public.enterprise_opportunity_interests to authenticated;

-- Motorista lê somente seus próprios interesses. Empresa usa a RPC segura
-- de candidatos e não recebe SELECT direto sobre a tabela bruta.
drop policy if exists "Drivers read own enterprise opportunity interests"
  on public.enterprise_opportunity_interests;
create policy "Drivers read own enterprise opportunity interests"
on public.enterprise_opportunity_interests
for select
to authenticated
using (
  driver_identity_id = public.current_jne_identity_id()
  or public.is_admin()
);


comment on table public.enterprise_opportunity_interests is
  'Interesses de motoristas em oportunidades JNE Empresas. Interesse não inicia negociação nem consome crédito comercial.';

comment on function private.evaluate_enterprise_interest_eligibility(uuid, uuid, uuid) is
  'Motor interno de elegibilidade operacional; P6 deve revalidar tudo transacionalmente antes de iniciar negociação.';

comment on function public.submit_enterprise_opportunity_interest(uuid, uuid) is
  'Registra TENHO INTERESSE para motorista autenticado e elegível, sem bloquear oportunidade ou iniciar negociação.';

comment on function public.list_safe_enterprise_opportunity_candidates(uuid, integer, integer) is
  'Lista candidatos de forma pseudonimizada para a organização dona da oportunidade, sem PII ou identidade profissional bruta.';
