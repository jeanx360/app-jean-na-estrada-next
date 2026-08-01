-- JNE App 1.3.0 — VIP manual, assinatura direta e exclusão administrativa
-- Execute depois da migração 1.2.0.

create extension if not exists pgcrypto;

-- =========================================================
-- CONFIGURAÇÃO DO PLANO VIP
-- =========================================================
create table if not exists public.vip_plan_settings (
  id smallint primary key default 1 check (id = 1),
  plan_name text not null default 'JNE App VIP',
  description text not null default 'Conteúdos, arquivos e benefícios exclusivos para membros do JNE App.',
  price_cents integer not null default 990 check (price_cents >= 0 and price_cents <= 10000000),
  billing_days integer not null default 30 check (billing_days between 1 and 366),
  recurring_payment_link text,
  pix_enabled boolean not null default false,
  pix_key_type text check (pix_key_type is null or pix_key_type in ('cpf', 'cnpj', 'email', 'phone', 'random')),
  pix_key text,
  pix_holder_name text,
  pix_instructions text,
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.vip_plan_settings (id)
values (1)
on conflict (id) do nothing;

drop trigger if exists vip_plan_settings_set_updated_at on public.vip_plan_settings;
create trigger vip_plan_settings_set_updated_at
before update on public.vip_plan_settings
for each row execute function public.set_updated_at();

alter table public.vip_plan_settings enable row level security;
revoke all on public.vip_plan_settings from anon;
grant select, update on public.vip_plan_settings to authenticated;

drop policy if exists "Members read active VIP plan" on public.vip_plan_settings;
create policy "Members read active VIP plan"
on public.vip_plan_settings
for select
to authenticated
using (is_active = true or public.is_admin());

drop policy if exists "Admins update VIP plan" on public.vip_plan_settings;
create policy "Admins update VIP plan"
on public.vip_plan_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- =========================================================
-- PEDIDOS DE ASSINATURA E COMPROVANTES
-- =========================================================
create table if not exists public.vip_subscription_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_method text not null check (payment_method in ('payment_link', 'pix')),
  amount_cents integer not null check (amount_cents >= 0),
  payment_reference text,
  proof_path text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  admin_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vip_subscription_requests_user_idx
  on public.vip_subscription_requests(user_id, created_at desc);
create index if not exists vip_subscription_requests_status_idx
  on public.vip_subscription_requests(status, created_at desc);

drop trigger if exists vip_subscription_requests_set_updated_at on public.vip_subscription_requests;
create trigger vip_subscription_requests_set_updated_at
before update on public.vip_subscription_requests
for each row execute function public.set_updated_at();

alter table public.vip_subscription_requests enable row level security;
revoke all on public.vip_subscription_requests from anon;
grant select, insert, update on public.vip_subscription_requests to authenticated;

drop policy if exists "Members read own subscription requests" on public.vip_subscription_requests;
create policy "Members read own subscription requests"
on public.vip_subscription_requests
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Members create own subscription requests" on public.vip_subscription_requests;
create policy "Members create own subscription requests"
on public.vip_subscription_requests
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Members cancel own pending subscription requests" on public.vip_subscription_requests;

drop policy if exists "Admins manage subscription requests" on public.vip_subscription_requests;
create policy "Admins manage subscription requests"
on public.vip_subscription_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vip-payment-proofs',
  'vip-payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members upload own VIP payment proofs" on storage.objects;
create policy "Members upload own VIP payment proofs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vip-payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Members read own VIP payment proofs" on storage.objects;
create policy "Members read own VIP payment proofs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vip-payment-proofs'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists "Members delete own VIP payment proofs" on storage.objects;
create policy "Members delete own VIP payment proofs"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vip-payment-proofs'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

-- =========================================================
-- ADMINISTRAÇÃO MANUAL DO VIP
-- =========================================================
create or replace function public.admin_set_member_admin(
  target_user_id uuid,
  make_admin boolean
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
    raise exception 'Você não pode alterar o nível administrativo da própria conta.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'Membro não encontrado.' using errcode = 'P0002';
  end if;

  if make_admin then
    update public.profiles set role = 'admin' where id = target_user_id;
  else
    update public.profiles set role = 'member' where id = target_user_id;
    perform public.refresh_member_vip_role(target_user_id);
  end if;
end;
$$;

revoke all on function public.admin_set_member_admin(uuid, boolean) from public, anon;
grant execute on function public.admin_set_member_admin(uuid, boolean) to authenticated;

create or replace function public.admin_upsert_vip_entitlement(
  target_user_id uuid,
  entitlement_source text,
  entitlement_label text default null,
  entitlement_expires_at timestamptz default null,
  entitlement_no_expiry boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  entitlement_id uuid;
  normalized_source text;
  normalized_expiry timestamptz;
  normalized_key text;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'Membro não encontrado.' using errcode = 'P0002';
  end if;

  normalized_source := lower(trim(coalesce(entitlement_source, '')));
  if normalized_source not in ('admin', 'youtube', 'partner', 'subscription') then
    raise exception 'Origem de acesso inválida.' using errcode = '22023';
  end if;

  normalized_expiry := case when entitlement_no_expiry then null else entitlement_expires_at end;
  if not entitlement_no_expiry and normalized_expiry is null then
    raise exception 'Informe a validade ou marque sem validade.' using errcode = '22023';
  end if;
  if normalized_expiry is not null and normalized_expiry <= now() then
    raise exception 'A validade precisa estar no futuro.' using errcode = '22023';
  end if;

  normalized_key := 'manual:' || normalized_source;

  insert into public.vip_entitlements (
    user_id,
    source,
    source_key,
    label,
    starts_at,
    expires_at,
    is_active,
    metadata
  ) values (
    target_user_id,
    normalized_source,
    normalized_key,
    nullif(trim(entitlement_label), ''),
    now(),
    normalized_expiry,
    true,
    jsonb_build_object('managed_manually', true, 'granted_by', auth.uid())
  )
  on conflict (user_id, source, source_key)
  do update set
    label = excluded.label,
    starts_at = now(),
    expires_at = excluded.expires_at,
    is_active = true,
    metadata = excluded.metadata,
    updated_at = now()
  returning id into entitlement_id;

  perform public.refresh_member_vip_role(target_user_id);
  return entitlement_id;
end;
$$;

revoke all on function public.admin_upsert_vip_entitlement(uuid, text, text, timestamptz, boolean) from public, anon;
grant execute on function public.admin_upsert_vip_entitlement(uuid, text, text, timestamptz, boolean) to authenticated;

create or replace function public.admin_revoke_vip_entitlement(target_entitlement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  update public.vip_entitlements
  set is_active = false, updated_at = now()
  where id = target_entitlement_id
  returning user_id into target_user_id;

  if target_user_id is null then
    raise exception 'Acesso VIP não encontrado.' using errcode = 'P0002';
  end if;

  perform public.refresh_member_vip_role(target_user_id);
end;
$$;

revoke all on function public.admin_revoke_vip_entitlement(uuid) from public, anon;
grant execute on function public.admin_revoke_vip_entitlement(uuid) to authenticated;

create or replace function public.admin_refresh_all_vip_roles()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  row_record record;
  refreshed integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  for row_record in select id from public.profiles where role <> 'admin' loop
    perform public.refresh_member_vip_role(row_record.id);
    refreshed := refreshed + 1;
  end loop;

  return refreshed;
end;
$$;

revoke all on function public.admin_refresh_all_vip_roles() from public, anon;
grant execute on function public.admin_refresh_all_vip_roles() to authenticated;

-- Aprovação ou rejeição atômica de pedidos de assinatura.
create or replace function public.admin_review_subscription_request(
  target_request_id uuid,
  approve_request boolean,
  entitlement_expires_at timestamptz default null,
  entitlement_no_expiry boolean default false,
  review_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.vip_subscription_requests%rowtype;
  normalized_expiry timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  select * into request_row
  from public.vip_subscription_requests
  where id = target_request_id
  for update;

  if request_row.id is null then
    raise exception 'Pedido não encontrado.' using errcode = 'P0002';
  end if;

  if request_row.status <> 'pending' then
    raise exception 'Este pedido já foi analisado.' using errcode = '22023';
  end if;

  if approve_request then
    normalized_expiry := case when entitlement_no_expiry then null else entitlement_expires_at end;
    if not entitlement_no_expiry and normalized_expiry is null then
      raise exception 'Informe a validade ou marque sem validade.' using errcode = '22023';
    end if;
    if normalized_expiry is not null and normalized_expiry <= now() then
      raise exception 'A validade precisa estar no futuro.' using errcode = '22023';
    end if;

    insert into public.vip_entitlements (
      user_id, source, source_key, label, starts_at, expires_at, is_active, metadata
    ) values (
      request_row.user_id,
      'subscription',
      request_row.id::text,
      'Assinatura direta do JNE App',
      now(),
      normalized_expiry,
      true,
      jsonb_build_object(
        'request_id', request_row.id,
        'payment_method', request_row.payment_method,
        'amount_cents', request_row.amount_cents,
        'approved_by', auth.uid()
      )
    )
    on conflict (user_id, source, source_key)
    do update set
      starts_at = now(),
      expires_at = excluded.expires_at,
      is_active = true,
      metadata = excluded.metadata,
      updated_at = now();

    update public.vip_subscription_requests
    set status = 'approved', admin_notes = nullif(trim(review_notes), ''), reviewed_by = auth.uid(), reviewed_at = now()
    where id = target_request_id;
  else
    update public.vip_subscription_requests
    set status = 'rejected', admin_notes = nullif(trim(review_notes), ''), reviewed_by = auth.uid(), reviewed_at = now()
    where id = target_request_id;
  end if;

  perform public.refresh_member_vip_role(request_row.user_id);
end;
$$;

revoke all on function public.admin_review_subscription_request(uuid, boolean, timestamptz, boolean, text) from public, anon;
grant execute on function public.admin_review_subscription_request(uuid, boolean, timestamptz, boolean, text) to authenticated;

-- Inclui as novas tabelas nos registros administrativos.
do $$
declare table_name text;
begin
  foreach table_name in array array['vip_plan_settings', 'vip_subscription_requests'] loop
    execute format('drop trigger if exists %I_admin_audit on public.%I', table_name, table_name);
    execute format('create trigger %I_admin_audit after insert or update or delete on public.%I for each row execute function public.capture_admin_audit()', table_name, table_name);
  end loop;
end $$;
