-- JNE App 1.19.0 - automacoes internas e central profissional de notificacoes.
-- Migration idempotente. Execute somente este arquivo em bancos existentes.

create extension if not exists pgcrypto;

-- A central existente continua atendendo avisos editoriais e passa a suportar
-- notificacoes operacionais direcionadas ao motorista.
alter table public.notifications
  add column if not exists priority text not null default 'normal',
  add column if not exists automation_type text,
  add column if not exists source_entity_type text,
  add column if not exists source_entity_id uuid,
  add column if not exists expires_at timestamptz;

alter table public.notifications
  drop constraint if exists notifications_category_check,
  drop constraint if exists notifications_priority_check,
  drop constraint if exists notifications_automation_type_length_check,
  drop constraint if exists notifications_source_entity_type_length_check;

alter table public.notifications
  add constraint notifications_category_check
    check (category in (
      'general','videos','tutorials','apps','benefits','reservations',
      'agenda','customers','quotes','finance','network','subscription','administration'
    )),
  add constraint notifications_priority_check
    check (priority in ('low','normal','high','urgent')),
  add constraint notifications_automation_type_length_check
    check (automation_type is null or length(automation_type) between 2 and 80),
  add constraint notifications_source_entity_type_length_check
    check (source_entity_type is null or length(source_entity_type) between 2 and 80);

create index if not exists notifications_driver_automation_idx
  on public.notifications(target_user_id, category, is_published, published_at desc)
  where target_user_id is not null and automation_type is not null;

create index if not exists notifications_automation_source_idx
  on public.notifications(automation_type, source_entity_type, source_entity_id)
  where automation_type is not null;

create index if not exists notifications_expiration_idx
  on public.notifications(expires_at)
  where expires_at is not null and is_published = true;

-- Preferencias exclusivas dos alertas de trabalho. As preferencias de Web Push
-- existentes permanecem separadas e nao sao alteradas por esta release.
create table if not exists public.driver_notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  agenda_enabled boolean not null default true,
  customers_enabled boolean not null default true,
  quotes_enabled boolean not null default true,
  finance_enabled boolean not null default true,
  network_enabled boolean not null default true,
  subscription_enabled boolean not null default true,
  administration_enabled boolean not null default true,
  reservation_upcoming_hours integer not null default 24,
  reservation_unconfirmed_hours integer not null default 48,
  quote_expiring_hours integer not null default 48,
  customer_inactive_days integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_notification_preferences_windows_check check (
    reservation_upcoming_hours between 1 and 168
    and reservation_unconfirmed_hours between 1 and 336
    and quote_expiring_hours between 1 and 336
    and customer_inactive_days between 7 and 365
  )
);

create index if not exists driver_notification_preferences_updated_idx
  on public.driver_notification_preferences(updated_at desc);

drop trigger if exists driver_notification_preferences_set_updated_at
  on public.driver_notification_preferences;
create trigger driver_notification_preferences_set_updated_at
before update on public.driver_notification_preferences
for each row execute function public.set_updated_at();

alter table public.driver_notification_preferences enable row level security;
grant select, insert, update, delete on public.driver_notification_preferences to authenticated;
revoke all on public.driver_notification_preferences from anon;

drop policy if exists "Drivers read own automation preferences"
  on public.driver_notification_preferences;
create policy "Drivers read own automation preferences"
on public.driver_notification_preferences
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Drivers create own automation preferences"
  on public.driver_notification_preferences;
create policy "Drivers create own automation preferences"
on public.driver_notification_preferences
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Drivers update own automation preferences"
  on public.driver_notification_preferences;
create policy "Drivers update own automation preferences"
on public.driver_notification_preferences
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Drivers delete own automation preferences"
  on public.driver_notification_preferences;
create policy "Drivers delete own automation preferences"
on public.driver_notification_preferences
for delete to authenticated
using (user_id = auth.uid());

-- Historico tecnico das execucoes. Os dados sao visiveis apenas para admins.
create table if not exists public.driver_automation_runs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null default gen_random_uuid(),
  run_source text not null default 'cron'
    check (run_source in ('cron','admin','manual','test')),
  status text not null default 'running'
    check (status in ('running','completed','partial','failed')),
  scanned_count integer not null default 0 check (scanned_count >= 0),
  created_count integer not null default 0 check (created_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  details jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint driver_automation_runs_error_length_check
    check (error_message is null or length(error_message) <= 2000)
);

create unique index if not exists driver_automation_runs_request_unique_idx
  on public.driver_automation_runs(request_id);
create index if not exists driver_automation_runs_started_idx
  on public.driver_automation_runs(started_at desc, status);

alter table public.driver_automation_runs enable row level security;
revoke all on public.driver_automation_runs from anon, authenticated;
grant select on public.driver_automation_runs to authenticated;

drop policy if exists "Admins read automation runs" on public.driver_automation_runs;
create policy "Admins read automation runs"
on public.driver_automation_runs
for select to authenticated
using (public.is_admin());

create or replace function public.driver_notification_category_enabled(
  target_user_id uuid,
  selected_category text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case selected_category
        when 'agenda' then preference.agenda_enabled
        when 'customers' then preference.customers_enabled
        when 'quotes' then preference.quotes_enabled
        when 'finance' then preference.finance_enabled
        when 'network' then preference.network_enabled
        when 'subscription' then preference.subscription_enabled
        when 'administration' then preference.administration_enabled
        else true
      end
      from public.driver_notification_preferences preference
      where preference.user_id = target_user_id
    ),
    true
  );
$$;

revoke all on function public.driver_notification_category_enabled(uuid, text)
  from public, anon, authenticated;
grant execute on function public.driver_notification_category_enabled(uuid, text)
  to service_role;

create or replace function public.create_driver_automation_notification(
  target_user_id uuid,
  selected_category text,
  selected_priority text,
  selected_automation_type text,
  selected_title text,
  selected_message text,
  selected_action_url text,
  selected_source_key text,
  selected_source_entity_type text default null,
  selected_source_entity_id uuid default null,
  selected_expires_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  if target_user_id is null
     or nullif(trim(selected_source_key), '') is null
     or nullif(trim(selected_title), '') is null
     or nullif(trim(selected_message), '') is null then
    return false;
  end if;

  if not public.driver_notification_category_enabled(target_user_id, selected_category) then
    return false;
  end if;

  insert into public.notifications (
    title,
    message,
    audience,
    category,
    priority,
    action_url,
    is_published,
    is_featured,
    published_at,
    push_requested,
    source_key,
    target_user_id,
    automation_type,
    source_entity_type,
    source_entity_id,
    expires_at
  ) values (
    left(trim(selected_title), 180),
    left(trim(selected_message), 1000),
    'member',
    selected_category,
    selected_priority,
    nullif(trim(selected_action_url), ''),
    true,
    false,
    now(),
    false,
    trim(selected_source_key),
    target_user_id,
    trim(selected_automation_type),
    nullif(trim(selected_source_entity_type), ''),
    selected_source_entity_id,
    selected_expires_at
  )
  on conflict (source_key) where source_key is not null do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count > 0;
end;
$$;

revoke all on function public.create_driver_automation_notification(
  uuid, text, text, text, text, text, text, text, text, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_driver_automation_notification(
  uuid, text, text, text, text, text, text, text, text, uuid, timestamptz
) to service_role;

-- Alertas imediatos para indicacoes recebidas.
create or replace function public.notify_driver_referral_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_driver_automation_notification(
    new.recipient_user_id,
    'network',
    'high',
    'referral_received',
    'Nova indicação recebida',
    'Uma nova oportunidade foi enviada por ' || new.sender_display_name || '. Analise os dados antes de responder.',
    '/motorista/rede',
    'automation:referral_received:' || new.id::text,
    'driver_referral',
    new.id,
    now() + interval '30 days'
  );
  return new;
end;
$$;

revoke all on function public.notify_driver_referral_created()
  from public, anon, authenticated;

drop trigger if exists notify_driver_referral_created_trigger on public.driver_referrals;
create trigger notify_driver_referral_created_trigger
after insert on public.driver_referrals
for each row execute function public.notify_driver_referral_created();

-- Mudancas de plano feitas pelo administrador entram na central do proprio usuario.
create or replace function public.notify_account_subscription_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_title text;
  event_message text;
  event_priority text;
begin
  event_title := case new.event_type
    when 'upgraded' then 'Seu plano foi atualizado'
    when 'downgraded' then 'Seu plano foi alterado'
    when 'renewed' then 'Assinatura renovada'
    when 'trial_started' then 'Período de teste iniciado'
    when 'activated' then 'Assinatura ativada'
    when 'suspended' then 'Assinatura suspensa'
    when 'cancelled' then 'Assinatura cancelada'
    when 'expired' then 'Assinatura expirada'
    when 'cleared' then 'Atribuição de plano removida'
    else 'Configuração do plano atualizada'
  end;

  event_priority := case
    when new.event_type in ('suspended','cancelled','expired','downgraded','cleared') then 'high'
    else 'normal'
  end;

  event_message := concat_ws(
    ' ',
    case when new.new_plan_code is not null then 'Plano atual: ' || new.new_plan_code || '.' else null end,
    case when new.new_status is not null then 'Situação: ' || new.new_status || '.' else null end,
    nullif(trim(new.notes), '')
  );

  perform public.create_driver_automation_notification(
    new.user_id,
    'administration',
    event_priority,
    'subscription_changed',
    event_title,
    coalesce(nullif(trim(event_message), ''), 'Consulte a área de membros para conferir os detalhes.'),
    '/membros',
    'automation:subscription_event:' || new.id::text,
    'account_subscription_event',
    new.id,
    now() + interval '90 days'
  );
  return new;
end;
$$;

revoke all on function public.notify_account_subscription_event()
  from public, anon, authenticated;

drop trigger if exists notify_account_subscription_event_trigger
  on public.account_subscription_events;
create trigger notify_account_subscription_event_trigger
after insert on public.account_subscription_events
for each row execute function public.notify_account_subscription_event();

-- Execucao consolidada e idempotente. A chave source_key da tabela notifications
-- impede duplicacoes entre execucoes repetidas.
create or replace function public.run_driver_notification_automations(
  selected_source text default 'cron'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  run_id uuid;
  normalized_source text;
  item record;
  created_notification boolean;
  scanned_total integer := 0;
  created_total integer := 0;
  skipped_total integer := 0;
  disabled_total integer := 0;
  hidden_total integer := 0;
  current_week text := to_char(current_date, 'IYYY-IW');
  current_month text := to_char(current_date, 'YYYY-MM');
  preference record;
begin
  normalized_source := case
    when selected_source in ('cron','admin','manual','test') then selected_source
    else 'manual'
  end;

  insert into public.driver_automation_runs(run_source, status)
  values (normalized_source, 'running')
  returning id into run_id;

  begin
    -- Oculta alertas operacionais que ja perderam a validade.
    update public.notifications
    set is_published = false,
        updated_at = now()
    where automation_type is not null
      and is_published = true
      and expires_at is not null
      and expires_at <= now();
    get diagnostics hidden_total = row_count;

    -- Reservas confirmadas nas proximas horas.
    for item in
      select
        reservation.*,
        coalesce(preference.reservation_upcoming_hours, 24) as window_hours,
        ((reservation.travel_date + coalesce(reservation.travel_time, time '12:00'))
          at time zone 'America/Sao_Paulo') as scheduled_at
      from public.driver_reservations reservation
      left join public.driver_notification_preferences preference
        on preference.user_id = reservation.driver_user_id
      where reservation.status = 'confirmed'
        and reservation.travel_date is not null
        and ((reservation.travel_date + coalesce(reservation.travel_time, time '12:00'))
          at time zone 'America/Sao_Paulo') > now()
        and ((reservation.travel_date + coalesce(reservation.travel_time, time '12:00'))
          at time zone 'America/Sao_Paulo')
          <= now() + make_interval(hours => coalesce(preference.reservation_upcoming_hours, 24))
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.driver_user_id,
        'agenda',
        'high',
        'reservation_upcoming',
        'Reserva nas próximas ' || item.window_hours || ' horas',
        'O serviço de ' || item.passenger_name || ' está agendado para '
          || to_char(item.travel_date, 'DD/MM/YYYY')
          || case when item.travel_time is not null then ' às ' || to_char(item.travel_time, 'HH24:MI') else '' end || '.',
        '/motorista/reservas/' || item.id::text,
        'automation:reservation_upcoming:' || item.id::text || ':'
          || item.travel_date::text || ':' || coalesce(item.travel_time::text, 'sem-hora'),
        'driver_reservation',
        item.id,
        item.scheduled_at + interval '6 hours'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    -- Reservas ainda nao confirmadas e proximas da data prevista.
    for item in
      select
        reservation.*,
        coalesce(preference.reservation_unconfirmed_hours, 48) as window_hours,
        ((reservation.travel_date + coalesce(reservation.travel_time, time '12:00'))
          at time zone 'America/Sao_Paulo') as scheduled_at
      from public.driver_reservations reservation
      left join public.driver_notification_preferences preference
        on preference.user_id = reservation.driver_user_id
      where reservation.status in ('new','negotiating','quoted')
        and reservation.travel_date is not null
        and reservation.created_at <= now() - interval '2 hours'
        and ((reservation.travel_date + coalesce(reservation.travel_time, time '12:00'))
          at time zone 'America/Sao_Paulo') > now()
        and ((reservation.travel_date + coalesce(reservation.travel_time, time '12:00'))
          at time zone 'America/Sao_Paulo')
          <= now() + make_interval(hours => coalesce(preference.reservation_unconfirmed_hours, 48))
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.driver_user_id,
        'agenda',
        'urgent',
        'reservation_unconfirmed',
        'Reserva próxima ainda não confirmada',
        'A solicitação de ' || item.passenger_name || ' acontece em menos de '
          || item.window_hours || ' horas e ainda está como ' || item.status || '.',
        '/motorista/reservas/' || item.id::text,
        'automation:reservation_unconfirmed:' || item.id::text || ':'
          || item.travel_date::text || ':' || coalesce(item.travel_time::text, 'sem-hora'),
        'driver_reservation',
        item.id,
        item.scheduled_at + interval '6 hours'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    -- Orcamentos enviados e proximos do vencimento.
    for item in
      select quote.*, coalesce(preference.quote_expiring_hours, 48) as window_hours
      from public.driver_quotes quote
      left join public.driver_notification_preferences preference
        on preference.user_id = quote.user_id
      where quote.status in ('sent','viewed')
        and quote.valid_until > now()
        and quote.valid_until <= now() + make_interval(hours => coalesce(preference.quote_expiring_hours, 48))
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.user_id,
        'quotes',
        'high',
        'quote_expiring',
        'Orçamento próximo do vencimento',
        'O orçamento de ' || coalesce(nullif(item.customer_name, ''), 'um cliente')
          || ' vence em menos de ' || item.window_hours || ' horas.',
        '/motorista/orcamentos/' || item.id::text,
        'automation:quote_expiring:' || item.id::text || ':' || item.valid_until::date::text,
        'driver_quote',
        item.id,
        item.valid_until + interval '24 hours'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    -- Orcamentos vencidos que ainda aguardam resposta.
    for item in
      select quote.*
      from public.driver_quotes quote
      where quote.status in ('sent','viewed')
        and quote.valid_until <= now()
        and quote.valid_until >= now() - interval '30 days'
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.user_id,
        'quotes',
        'normal',
        'quote_expired',
        'Orçamento vencido sem resposta',
        'O orçamento de ' || coalesce(nullif(item.customer_name, ''), 'um cliente')
          || ' venceu. Revise antes de fazer um novo contato.',
        '/motorista/orcamentos/' || item.id::text,
        'automation:quote_expired:' || item.id::text || ':' || item.valid_until::date::text,
        'driver_quote',
        item.id,
        now() + interval '30 days'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    -- Pagamentos pendentes recebem no maximo um lembrete por semana.
    for item in
      select trip.*
      from public.driver_trips trip
      where trip.status = 'completed'
        and trip.payment_status in ('unpaid','partial')
        and trip.pending_amount > 0
        and coalesce(trip.travel_date, trip.created_at::date) >= current_date - 180
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.user_id,
        'finance',
        'high',
        'payment_pending',
        'Pagamento de viagem pendente',
        'Existe um saldo de R$ ' || replace(to_char(item.pending_amount, 'FM999999990D00'), '.', ',')
          || ' aguardando recebimento.',
        '/motorista/financeiro/' || item.id::text,
        'automation:payment_pending:' || item.id::text || ':' || current_week,
        'driver_trip',
        item.id,
        date_trunc('week', now()) + interval '8 days'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    -- Clientes sem contato recente recebem no maximo um lembrete por mes.
    for item in
      select customer.*, coalesce(preference.customer_inactive_days, 30) as inactive_days
      from public.driver_customers customer
      left join public.driver_notification_preferences preference
        on preference.user_id = customer.user_id
      where customer.is_archived = false
        and customer.contact_consent = true
        and customer.last_contact_at
          <= now() - make_interval(days => coalesce(preference.customer_inactive_days, 30))
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.user_id,
        'customers',
        'low',
        'customer_follow_up',
        'Cliente sem contato recente',
        item.display_name || ' não recebe um acompanhamento há pelo menos '
          || item.inactive_days || ' dias.',
        '/motorista/clientes/' || item.id::text,
        'automation:customer_follow_up:' || item.id::text || ':' || current_month,
        'driver_customer',
        item.id,
        date_trunc('month', now()) + interval '40 days'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    -- Backfill idempotente de indicacoes pendentes, inclusive as criadas antes do trigger.
    for item in
      select referral.*
      from public.driver_referrals referral
      where referral.status = 'pending'
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.recipient_user_id,
        'network',
        'high',
        'referral_received',
        'Indicação aguardando resposta',
        'A indicação enviada por ' || item.sender_display_name || ' ainda precisa ser analisada.',
        '/motorista/rede',
        'automation:referral_received:' || item.id::text,
        'driver_referral',
        item.id,
        item.created_at + interval '30 days'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    -- Assinaturas e testes proximos do vencimento.
    for item in
      select subscription.*,
        case when subscription.status = 'trial'
          then coalesce(subscription.trial_ends_at, subscription.expires_at)
          else subscription.expires_at
        end as deadline
      from public.account_subscriptions subscription
      where subscription.status in ('trial','active','past_due')
        and (
          case when subscription.status = 'trial'
            then coalesce(subscription.trial_ends_at, subscription.expires_at)
            else subscription.expires_at
          end
        ) > now()
        and (
          case when subscription.status = 'trial'
            then coalesce(subscription.trial_ends_at, subscription.expires_at)
            else subscription.expires_at
          end
        ) <= now() + interval '7 days'
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.user_id,
        'subscription',
        case when item.status = 'past_due' then 'urgent' else 'high' end,
        'subscription_expiring',
        case when item.status = 'trial' then 'Período de teste próximo do fim'
          else 'Assinatura próxima do vencimento' end,
        'O acesso ao plano ' || item.plan_code || ' está previsto para vencer em '
          || to_char(item.deadline at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') || '.',
        '/membros',
        'automation:subscription_expiring:' || item.user_id::text || ':' || item.deadline::date::text,
        'account_subscription',
        item.user_id,
        item.deadline + interval '14 days'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    -- Revisao financeira mensal para motoristas com acesso ao modulo.
    for item in
      select profile.id as user_id
      from public.profiles profile
      where profile.is_professional_driver = true
        and profile.is_blocked = false
        and public.account_has_feature('finance', profile.id)
    loop
      scanned_total := scanned_total + 1;
      created_notification := public.create_driver_automation_notification(
        item.user_id,
        'finance',
        'normal',
        'monthly_finance_review',
        'Revisão financeira do mês',
        'Confira faturamento, despesas, resultado líquido e o progresso das suas metas.',
        '/motorista/financeiro',
        'automation:monthly_finance_review:' || item.user_id::text || ':' || current_month,
        'finance_month',
        null,
        date_trunc('month', now()) + interval '40 days'
      );
      if created_notification then created_total := created_total + 1;
      else skipped_total := skipped_total + 1; end if;
    end loop;

    update public.driver_automation_runs
    set status = 'completed',
        scanned_count = scanned_total,
        created_count = created_total,
        skipped_count = skipped_total,
        details = jsonb_build_object(
          'expired_hidden', hidden_total,
          'execution_month', current_month,
          'execution_week', current_week
        ),
        completed_at = now()
    where id = run_id;

    return jsonb_build_object(
      'ok', true,
      'runId', run_id,
      'source', normalized_source,
      'scanned', scanned_total,
      'created', created_total,
      'skipped', skipped_total,
      'expiredHidden', hidden_total
    );
  exception when others then
    update public.driver_automation_runs
    set status = 'failed',
        scanned_count = scanned_total,
        created_count = created_total,
        skipped_count = skipped_total,
        error_count = 1,
        error_message = left(sqlerrm, 2000),
        details = jsonb_build_object('sqlstate', sqlstate),
        completed_at = now()
    where id = run_id;

    return jsonb_build_object(
      'ok', false,
      'runId', run_id,
      'source', normalized_source,
      'scanned', scanned_total,
      'created', created_total,
      'skipped', skipped_total,
      'error', sqlerrm,
      'sqlstate', sqlstate
    );
  end;
end;
$$;

revoke all on function public.run_driver_notification_automations(text)
  from public, anon, authenticated;
grant execute on function public.run_driver_notification_automations(text)
  to service_role;

comment on table public.driver_notification_preferences is
  'Preferencias privadas do motorista para alertas internos de agenda, CRM, orcamentos, financeiro, rede e assinatura.';
comment on table public.driver_automation_runs is
  'Historico tecnico das execucoes idempotentes das automacoes internas do JNE App.';
comment on function public.run_driver_notification_automations(text) is
  'Executa alertas internos sem enviar mensagens externas e sem alterar reservas, cobrancas ou contatos.';
