-- JNE App 1.17.0 — Planos, assinaturas e controle de acesso
-- Execute depois da migration 1.16.0.

create extension if not exists pgcrypto;

create table if not exists public.app_plan_catalog (
  code text primary key check (code in ('free', 'professional', 'premium')),
  name text not null,
  description text not null,
  trial_days integer not null default 0 check (trial_days between 0 and 90),
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.app_plan_catalog (code, name, description, trial_days, features, sort_order, is_active)
values
  (
    'free',
    'Gratuito',
    'Perfil profissional, QR Code, calculadora e reservas básicas para começar.',
    0,
    '["driver_profile","qr_card","basic_reservations","calculator","basic_settings"]'::jsonb,
    10,
    true
  ),
  (
    'professional',
    'Profissional',
    'CRM, agenda, orçamentos, financeiro e exportações para organizar a operação.',
    14,
    '["driver_profile","qr_card","basic_reservations","calculator","basic_settings","crm","schedule","quotes","finance","exports"]'::jsonb,
    20,
    true
  ),
  (
    'premium',
    'Premium',
    'Todos os recursos profissionais, inteligência, campanhas e relatórios avançados.',
    14,
    '["driver_profile","qr_card","basic_reservations","calculator","basic_settings","crm","schedule","quotes","finance","exports","performance","marketing_campaigns","advanced_reports","customization"]'::jsonb,
    30,
    true
  )
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  features = excluded.features,
  sort_order = excluded.sort_order,
  updated_at = now();

drop trigger if exists app_plan_catalog_set_updated_at on public.app_plan_catalog;
create trigger app_plan_catalog_set_updated_at
before update on public.app_plan_catalog
for each row execute function public.set_updated_at();

create table if not exists public.account_subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan_code text not null references public.app_plan_catalog(code) on update cascade,
  status text not null default 'active' check (status in ('trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  trial_ends_at timestamptz,
  notes text check (notes is null or length(notes) <= 600),
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at),
  check (trial_ends_at is null or trial_ends_at > starts_at)
);

create index if not exists account_subscriptions_plan_status_idx
  on public.account_subscriptions(plan_code, status, expires_at);

create table if not exists public.account_subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('created','upgraded','downgraded','renewed','trial_started','activated','suspended','cancelled','expired','cleared','updated')),
  old_plan_code text,
  new_plan_code text,
  old_status text,
  new_status text,
  notes text check (notes is null or length(notes) <= 600),
  actor_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists account_subscription_events_user_date_idx
  on public.account_subscription_events(user_id, created_at desc);

drop trigger if exists account_subscriptions_set_updated_at on public.account_subscriptions;
create trigger account_subscriptions_set_updated_at
before update on public.account_subscriptions
for each row execute function public.set_updated_at();

-- Evita retirar recursos de quem já usava a área profissional antes dos planos.
-- Contas profissionais existentes começam com o período de teste configurado.
insert into public.account_subscriptions (
  user_id,
  plan_code,
  status,
  starts_at,
  trial_ends_at,
  notes
)
select
  profile.id,
  'professional',
  'trial',
  now(),
  now() + make_interval(days => greatest(professional_plan.trial_days, 1)),
  'Período de transição criado automaticamente na versão 1.17.0.'
from public.profiles profile
cross join lateral (
  select trial_days
  from public.app_plan_catalog
  where code = 'professional'
) professional_plan
where profile.is_professional_driver = true
  and profile.is_blocked = false
  and profile.role not in ('admin', 'vip')
  and not exists (
    select 1
    from public.account_subscriptions subscription
    where subscription.user_id = profile.id
  )
  and not exists (
    select 1
    from public.vip_entitlements entitlement
    where entitlement.user_id = profile.id
      and entitlement.is_active = true
      and entitlement.starts_at <= now()
      and (entitlement.expires_at is null or entitlement.expires_at > now())
  )
on conflict (user_id) do nothing;

insert into public.account_subscription_events (
  user_id,
  event_type,
  old_plan_code,
  new_plan_code,
  old_status,
  new_status,
  notes,
  actor_user_id
)
select
  subscription.user_id,
  'trial_started',
  null,
  subscription.plan_code,
  null,
  subscription.status,
  subscription.notes,
  null
from public.account_subscriptions subscription
where subscription.notes = 'Período de transição criado automaticamente na versão 1.17.0.'
  and not exists (
    select 1
    from public.account_subscription_events event
    where event.user_id = subscription.user_id
      and event.event_type = 'trial_started'
      and event.notes = subscription.notes
  );

alter table public.app_plan_catalog enable row level security;
alter table public.account_subscriptions enable row level security;
alter table public.account_subscription_events enable row level security;

revoke all on public.app_plan_catalog from anon;
revoke all on public.account_subscriptions from anon;
revoke all on public.account_subscription_events from anon;
grant select on public.app_plan_catalog to anon, authenticated;
grant select on public.account_subscriptions to authenticated;
grant select on public.account_subscription_events to authenticated;
grant update on public.app_plan_catalog to authenticated;

drop policy if exists "Visitors read active app plans" on public.app_plan_catalog;
create policy "Visitors read active app plans"
on public.app_plan_catalog
for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "Admins update app plans" on public.app_plan_catalog;
create policy "Admins update app plans"
on public.app_plan_catalog
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members read own account subscription" on public.account_subscriptions;
create policy "Members read own account subscription"
on public.account_subscriptions
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Members read own account subscription history" on public.account_subscription_events;
create policy "Members read own account subscription history"
on public.account_subscription_events
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create or replace function public.current_account_plan(target_user_id uuid default auth.uid())
returns table (
  plan_code text,
  plan_name text,
  status text,
  starts_at timestamptz,
  expires_at timestamptz,
  trial_ends_at timestamptz,
  source text,
  features jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.profiles%rowtype;
  assignment public.account_subscriptions%rowtype;
  selected_code text := 'free';
  selected_status text := 'active';
  selected_starts timestamptz := null;
  selected_expires timestamptz := null;
  selected_trial_ends timestamptz := null;
  selected_source text := 'default';
begin
  if target_user_id is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;

  if auth.uid() is not null and auth.uid() <> target_user_id and not public.is_admin() then
    raise exception 'Você não pode consultar o plano de outra conta.' using errcode = '42501';
  end if;

  select * into target_profile
  from public.profiles
  where id = target_user_id;

  if target_profile.id is null then
    raise exception 'Perfil não encontrado.' using errcode = 'P0002';
  end if;

  if target_profile.role = 'admin' then
    selected_code := 'premium';
    selected_status := 'active';
    selected_source := 'admin';
  else
    select * into assignment
    from public.account_subscriptions
    where user_id = target_user_id;

    if assignment.user_id is not null then
      selected_starts := assignment.starts_at;
      selected_expires := assignment.expires_at;
      selected_trial_ends := assignment.trial_ends_at;
      selected_status := assignment.status;
      selected_source := 'assignment';

      if assignment.status = 'active'
        and assignment.starts_at <= now()
        and (assignment.expires_at is null or assignment.expires_at > now())
      then
        selected_code := assignment.plan_code;
      elsif assignment.status = 'trial'
        and assignment.starts_at <= now()
        and assignment.trial_ends_at is not null
        and assignment.trial_ends_at > now()
        and (assignment.expires_at is null or assignment.expires_at > now())
      then
        selected_code := assignment.plan_code;
      else
        selected_code := 'free';
        selected_source := 'assignment_inactive';
      end if;
    elsif target_profile.role = 'vip' or exists (
      select 1
      from public.vip_entitlements entitlement
      where entitlement.user_id = target_user_id
        and entitlement.is_active = true
        and entitlement.starts_at <= now()
        and (entitlement.expires_at is null or entitlement.expires_at > now())
    ) then
      -- Compatibilidade: todo VIP já existente mantém os recursos que possuía.
      selected_code := 'premium';
      selected_status := 'active';
      selected_source := 'legacy_vip';
    end if;
  end if;

  return query
  select
    plan.code,
    plan.name,
    selected_status,
    selected_starts,
    selected_expires,
    selected_trial_ends,
    selected_source,
    plan.features
  from public.app_plan_catalog plan
  where plan.code = selected_code;
end;
$$;

revoke all on function public.current_account_plan(uuid) from public;
grant execute on function public.current_account_plan(uuid) to authenticated;

create or replace function public.account_has_feature(
  feature_key text,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((resolved.features ? feature_key), false)
  from public.current_account_plan(target_user_id) resolved;
$$;

revoke all on function public.account_has_feature(text, uuid) from public;
grant execute on function public.account_has_feature(text, uuid) to authenticated;

create or replace function public.admin_set_account_subscription(
  target_user_id uuid,
  selected_plan_code text,
  selected_status text,
  selected_starts_at timestamptz default now(),
  selected_expires_at timestamptz default null,
  selected_trial_ends_at timestamptz default null,
  admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row public.account_subscriptions%rowtype;
  plan_row public.app_plan_catalog%rowtype;
  normalized_starts timestamptz := coalesce(selected_starts_at, now());
  normalized_trial_ends timestamptz := selected_trial_ends_at;
  event_name text := 'updated';
  old_rank integer := 0;
  new_rank integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  if selected_status not in ('trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired') then
    raise exception 'Status de assinatura inválido.' using errcode = '22023';
  end if;

  select * into plan_row from public.app_plan_catalog where code = selected_plan_code;
  if plan_row.code is null then
    raise exception 'Plano não encontrado.' using errcode = 'P0002';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'Membro não encontrado.' using errcode = 'P0002';
  end if;

  if selected_status = 'trial' and normalized_trial_ends is null then
    normalized_trial_ends := normalized_starts + make_interval(days => greatest(plan_row.trial_days, 1));
  end if;

  if selected_expires_at is not null and selected_expires_at <= normalized_starts then
    raise exception 'A validade precisa ser posterior ao início.' using errcode = '22023';
  end if;

  if normalized_trial_ends is not null and normalized_trial_ends <= normalized_starts then
    raise exception 'O fim do teste precisa ser posterior ao início.' using errcode = '22023';
  end if;

  select * into old_row
  from public.account_subscriptions
  where user_id = target_user_id
  for update;

  old_rank := case old_row.plan_code when 'free' then 1 when 'professional' then 2 when 'premium' then 3 else 0 end;
  new_rank := case selected_plan_code when 'free' then 1 when 'professional' then 2 when 'premium' then 3 else 0 end;

  if old_row.user_id is null then
    event_name := case when selected_status = 'trial' then 'trial_started' else 'created' end;
  elsif selected_status = 'suspended' then
    event_name := 'suspended';
  elsif selected_status = 'cancelled' then
    event_name := 'cancelled';
  elsif selected_status = 'expired' then
    event_name := 'expired';
  elsif old_row.status <> 'active' and selected_status = 'active' then
    event_name := 'activated';
  elsif new_rank > old_rank then
    event_name := 'upgraded';
  elsif new_rank < old_rank then
    event_name := 'downgraded';
  elsif selected_expires_at is distinct from old_row.expires_at then
    event_name := 'renewed';
  end if;

  insert into public.account_subscriptions (
    user_id, plan_code, status, starts_at, expires_at, trial_ends_at, notes, assigned_by
  ) values (
    target_user_id,
    selected_plan_code,
    selected_status,
    normalized_starts,
    selected_expires_at,
    case when selected_status = 'trial' then normalized_trial_ends else null end,
    nullif(trim(admin_notes), ''),
    auth.uid()
  )
  on conflict (user_id) do update set
    plan_code = excluded.plan_code,
    status = excluded.status,
    starts_at = excluded.starts_at,
    expires_at = excluded.expires_at,
    trial_ends_at = excluded.trial_ends_at,
    notes = excluded.notes,
    assigned_by = excluded.assigned_by,
    updated_at = now();

  insert into public.account_subscription_events (
    user_id, event_type, old_plan_code, new_plan_code, old_status, new_status, notes, actor_user_id
  ) values (
    target_user_id,
    event_name,
    old_row.plan_code,
    selected_plan_code,
    old_row.status,
    selected_status,
    nullif(trim(admin_notes), ''),
    auth.uid()
  );
end;
$$;

revoke all on function public.admin_set_account_subscription(uuid, text, text, timestamptz, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.admin_set_account_subscription(uuid, text, text, timestamptz, timestamptz, timestamptz, text) to authenticated;

create or replace function public.admin_clear_account_subscription(
  target_user_id uuid,
  admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row public.account_subscriptions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  select * into old_row
  from public.account_subscriptions
  where user_id = target_user_id
  for update;

  if old_row.user_id is null then
    return;
  end if;

  delete from public.account_subscriptions where user_id = target_user_id;

  insert into public.account_subscription_events (
    user_id, event_type, old_plan_code, new_plan_code, old_status, new_status, notes, actor_user_id
  ) values (
    target_user_id, 'cleared', old_row.plan_code, null, old_row.status, null, nullif(trim(admin_notes), ''), auth.uid()
  );
end;
$$;

revoke all on function public.admin_clear_account_subscription(uuid, text) from public, anon;
grant execute on function public.admin_clear_account_subscription(uuid, text) to authenticated;

-- =========================================================
-- ENFORCEMENT DE RECURSOS PROFISSIONAIS NO BANCO
-- =========================================================

-- CRM
drop policy if exists "Drivers read own customers" on public.driver_customers;
create policy "Drivers read own customers" on public.driver_customers
for select to authenticated
using (user_id = auth.uid() and public.account_has_feature('crm', auth.uid()));

drop policy if exists "Drivers create own customers" on public.driver_customers;
create policy "Drivers create own customers" on public.driver_customers
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.account_has_feature('crm', auth.uid())
  and exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid() and profile.is_professional_driver = true and profile.is_blocked = false
  )
);

drop policy if exists "Drivers update own customers" on public.driver_customers;
create policy "Drivers update own customers" on public.driver_customers
for update to authenticated
using (user_id = auth.uid() and public.account_has_feature('crm', auth.uid()))
with check (user_id = auth.uid() and public.account_has_feature('crm', auth.uid()));

drop policy if exists "Drivers delete own customers" on public.driver_customers;
create policy "Drivers delete own customers" on public.driver_customers
for delete to authenticated
using (user_id = auth.uid() and public.account_has_feature('crm', auth.uid()));

-- Agenda
drop policy if exists "Drivers read own schedule blocks" on public.driver_schedule_blocks;
create policy "Drivers read own schedule blocks" on public.driver_schedule_blocks
for select to authenticated
using (user_id = auth.uid() and public.account_has_feature('schedule', auth.uid()));

drop policy if exists "Drivers create own schedule blocks" on public.driver_schedule_blocks;
create policy "Drivers create own schedule blocks" on public.driver_schedule_blocks
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.account_has_feature('schedule', auth.uid())
  and exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid() and profile.is_professional_driver = true and profile.is_blocked = false
  )
);

drop policy if exists "Drivers update own schedule blocks" on public.driver_schedule_blocks;
create policy "Drivers update own schedule blocks" on public.driver_schedule_blocks
for update to authenticated
using (user_id = auth.uid() and public.account_has_feature('schedule', auth.uid()))
with check (user_id = auth.uid() and public.account_has_feature('schedule', auth.uid()));

drop policy if exists "Drivers delete own schedule blocks" on public.driver_schedule_blocks;
create policy "Drivers delete own schedule blocks" on public.driver_schedule_blocks
for delete to authenticated
using (user_id = auth.uid() and public.account_has_feature('schedule', auth.uid()));

-- Orçamentos
drop policy if exists "Drivers read own quotes" on public.driver_quotes;
create policy "Drivers read own quotes" on public.driver_quotes
for select to authenticated
using (user_id = auth.uid() and public.account_has_feature('quotes', auth.uid()));

drop policy if exists "Drivers create own quotes" on public.driver_quotes;
create policy "Drivers create own quotes" on public.driver_quotes
for insert to authenticated
with check (user_id = auth.uid() and public.account_has_feature('quotes', auth.uid()));

drop policy if exists "Drivers update own quotes" on public.driver_quotes;
create policy "Drivers update own quotes" on public.driver_quotes
for update to authenticated
using (user_id = auth.uid() and public.account_has_feature('quotes', auth.uid()))
with check (user_id = auth.uid() and public.account_has_feature('quotes', auth.uid()));

drop policy if exists "Drivers delete own quotes" on public.driver_quotes;
create policy "Drivers delete own quotes" on public.driver_quotes
for delete to authenticated
using (user_id = auth.uid() and public.account_has_feature('quotes', auth.uid()));

-- Financeiro
drop policy if exists "Drivers read own trips" on public.driver_trips;
create policy "Drivers read own trips" on public.driver_trips
for select to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers create own trips" on public.driver_trips;
create policy "Drivers create own trips" on public.driver_trips
for insert to authenticated
with check (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers update own trips" on public.driver_trips;
create policy "Drivers update own trips" on public.driver_trips
for update to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()))
with check (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers delete own trips" on public.driver_trips;
create policy "Drivers delete own trips" on public.driver_trips
for delete to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers read own financial entries" on public.driver_financial_entries;
create policy "Drivers read own financial entries" on public.driver_financial_entries
for select to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers create own financial entries" on public.driver_financial_entries;
create policy "Drivers create own financial entries" on public.driver_financial_entries
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.account_has_feature('finance', auth.uid())
  and exists (select 1 from public.driver_trips trip where trip.id = trip_id and trip.user_id = auth.uid())
);

drop policy if exists "Drivers update own financial entries" on public.driver_financial_entries;
create policy "Drivers update own financial entries" on public.driver_financial_entries
for update to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()))
with check (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers delete own financial entries" on public.driver_financial_entries;
create policy "Drivers delete own financial entries" on public.driver_financial_entries
for delete to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers read own finance goals" on public.driver_finance_goals;
create policy "Drivers read own finance goals" on public.driver_finance_goals
for select to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers create own finance goals" on public.driver_finance_goals;
create policy "Drivers create own finance goals" on public.driver_finance_goals
for insert to authenticated
with check (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers update own finance goals" on public.driver_finance_goals;
create policy "Drivers update own finance goals" on public.driver_finance_goals
for update to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()))
with check (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

drop policy if exists "Drivers delete own finance goals" on public.driver_finance_goals;
create policy "Drivers delete own finance goals" on public.driver_finance_goals
for delete to authenticated
using (user_id = auth.uid() and public.account_has_feature('finance', auth.uid()));

-- Campanhas
drop policy if exists "Drivers read own marketing campaigns" on public.driver_marketing_campaigns;
create policy "Drivers read own marketing campaigns" on public.driver_marketing_campaigns
for select to authenticated
using (user_id = auth.uid() and public.account_has_feature('marketing_campaigns', auth.uid()));

drop policy if exists "Drivers create own marketing campaigns" on public.driver_marketing_campaigns;
create policy "Drivers create own marketing campaigns" on public.driver_marketing_campaigns
for insert to authenticated
with check (user_id = auth.uid() and public.account_has_feature('marketing_campaigns', auth.uid()));

drop policy if exists "Drivers update own marketing campaigns" on public.driver_marketing_campaigns;
create policy "Drivers update own marketing campaigns" on public.driver_marketing_campaigns
for update to authenticated
using (user_id = auth.uid() and public.account_has_feature('marketing_campaigns', auth.uid()))
with check (user_id = auth.uid() and public.account_has_feature('marketing_campaigns', auth.uid()));

drop policy if exists "Drivers delete own marketing campaigns" on public.driver_marketing_campaigns;
create policy "Drivers delete own marketing campaigns" on public.driver_marketing_campaigns
for delete to authenticated
using (user_id = auth.uid() and public.account_has_feature('marketing_campaigns', auth.uid()));
