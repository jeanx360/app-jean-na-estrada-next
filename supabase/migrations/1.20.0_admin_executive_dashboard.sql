-- JNE App 1.20.0 - painel executivo e polimento administrativo.
-- Migration idempotente. Execute somente este arquivo em bancos existentes.

create or replace function public.admin_executive_dashboard(
  selected_start timestamptz,
  selected_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  period_start timestamptz := selected_start;
  period_end timestamptz := selected_end;
  period_length interval;
  previous_start timestamptz;
  previous_end timestamptz;
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.' using errcode = '42501';
  end if;

  if period_start is null or period_end is null or period_start >= period_end then
    raise exception 'Periodo executivo invalido.' using errcode = '22007';
  end if;

  period_length := period_end - period_start;
  if period_length > interval '370 days' then
    raise exception 'O periodo maximo e de 370 dias.' using errcode = '22023';
  end if;

  previous_end := period_start;
  previous_start := period_start - period_length;

  with plan_distribution as (
    select
      count(*) filter (where resolved.plan_code = 'free')::bigint as free_count,
      count(*) filter (where resolved.plan_code = 'professional')::bigint as professional_count,
      count(*) filter (where resolved.plan_code = 'premium')::bigint as premium_count
    from public.profiles profile
    cross join lateral public.current_account_plan(profile.id) resolved
  ),
  platform_totals as (
    select
      (select count(*) from public.profiles)::bigint as total_accounts,
      (select count(*) from public.profiles where not is_blocked)::bigint as active_accounts,
      (select count(*) from public.profiles where is_blocked)::bigint as blocked_accounts,
      (select count(*) from public.profiles where is_professional_driver)::bigint as professional_drivers,
      (select count(*) from public.driver_public_profiles where is_published)::bigint as published_drivers,
      (select count(*) from public.driver_network_settings where opted_in and verification_status = 'verified')::bigint as verified_network_drivers,
      (select count(*) from public.driver_customers where not is_archived)::bigint as active_customers,
      (select count(*) from public.driver_reservations)::bigint as reservations_total,
      (select count(*) from public.driver_quotes)::bigint as quotes_total,
      (select count(*) from public.driver_trips)::bigint as trips_total
  ),
  current_period as (
    select
      (select count(*) from public.profiles where created_at >= period_start and created_at < period_end)::bigint as new_accounts,
      (select count(*) from public.driver_customers where created_at >= period_start and created_at < period_end)::bigint as customers_created,
      (select count(*) from public.driver_reservations where created_at >= period_start and created_at < period_end)::bigint as reservations_created,
      (select count(*) from public.driver_reservations where created_at >= period_start and created_at < period_end and status = 'confirmed')::bigint as reservations_confirmed,
      (select count(*) from public.driver_reservations where created_at >= period_start and created_at < period_end and status = 'completed')::bigint as reservations_completed,
      (select count(*) from public.driver_quotes where created_at >= period_start and created_at < period_end)::bigint as quotes_created,
      (select count(*) from public.driver_quotes where created_at >= period_start and created_at < period_end and status in ('accepted','completed'))::bigint as quotes_accepted,
      (select count(*) from public.driver_quotes where created_at >= period_start and created_at < period_end and status = 'declined')::bigint as quotes_declined,
      (select count(*) from public.driver_trips where created_at >= period_start and created_at < period_end)::bigint as trips_created,
      (select count(*) from public.driver_trips where created_at >= period_start and created_at < period_end and status = 'completed')::bigint as trips_completed,
      (select count(*) from public.driver_referrals where created_at >= period_start and created_at < period_end)::bigint as referrals_created,
      (select count(*) from public.driver_referrals where created_at >= period_start and created_at < period_end and status = 'accepted')::bigint as referrals_accepted,
      (select count(*) from public.notifications where created_at >= period_start and created_at < period_end and automation_type is not null)::bigint as automation_notifications,
      (select count(*) from public.driver_automation_runs where started_at >= period_start and started_at < period_end)::bigint as automation_runs,
      (select count(*) from public.driver_automation_runs where started_at >= period_start and started_at < period_end and status = 'failed')::bigint as automation_failures
  ),
  previous_period as (
    select
      (select count(*) from public.profiles where created_at >= previous_start and created_at < previous_end)::bigint as new_accounts,
      (select count(*) from public.driver_customers where created_at >= previous_start and created_at < previous_end)::bigint as customers_created,
      (select count(*) from public.driver_reservations where created_at >= previous_start and created_at < previous_end)::bigint as reservations_created,
      (select count(*) from public.driver_reservations where created_at >= previous_start and created_at < previous_end and status = 'confirmed')::bigint as reservations_confirmed,
      (select count(*) from public.driver_reservations where created_at >= previous_start and created_at < previous_end and status = 'completed')::bigint as reservations_completed,
      (select count(*) from public.driver_quotes where created_at >= previous_start and created_at < previous_end)::bigint as quotes_created,
      (select count(*) from public.driver_quotes where created_at >= previous_start and created_at < previous_end and status in ('accepted','completed'))::bigint as quotes_accepted,
      (select count(*) from public.driver_quotes where created_at >= previous_start and created_at < previous_end and status = 'declined')::bigint as quotes_declined,
      (select count(*) from public.driver_trips where created_at >= previous_start and created_at < previous_end)::bigint as trips_created,
      (select count(*) from public.driver_trips where created_at >= previous_start and created_at < previous_end and status = 'completed')::bigint as trips_completed,
      (select count(*) from public.driver_referrals where created_at >= previous_start and created_at < previous_end)::bigint as referrals_created,
      (select count(*) from public.driver_referrals where created_at >= previous_start and created_at < previous_end and status = 'accepted')::bigint as referrals_accepted,
      (select count(*) from public.notifications where created_at >= previous_start and created_at < previous_end and automation_type is not null)::bigint as automation_notifications,
      (select count(*) from public.driver_automation_runs where started_at >= previous_start and started_at < previous_end)::bigint as automation_runs,
      (select count(*) from public.driver_automation_runs where started_at >= previous_start and started_at < previous_end and status = 'failed')::bigint as automation_failures
  ),
  attention as (
    select
      (select count(*) from public.vip_subscription_requests where status = 'pending')::bigint as pending_payments,
      (select count(*) from public.driver_network_settings where opted_in and verification_status = 'pending')::bigint as pending_driver_verifications,
      (
        select count(*)
        from public.account_subscriptions subscription
        where subscription.status in ('active','trial')
          and coalesce(
            case when subscription.status = 'trial' then subscription.trial_ends_at end,
            subscription.expires_at
          ) > now()
          and coalesce(
            case when subscription.status = 'trial' then subscription.trial_ends_at end,
            subscription.expires_at
          ) <= now() + interval '7 days'
      )::bigint as subscriptions_expiring,
      (select count(*) from public.account_subscriptions where status in ('past_due','suspended','expired'))::bigint as subscriptions_attention,
      (select count(*) from public.community_reports where status = 'pending')::bigint as pending_community_reports,
      (select count(*) from public.driver_automation_runs where status = 'failed' and started_at >= now() - interval '7 days')::bigint as automation_failures_7d,
      (
        select count(*)
        from public.notifications notification
        where notification.target_user_id is not null
          and notification.is_published
          and notification.published_at <= now()
          and (notification.expires_at is null or notification.expires_at > now())
          and not exists (
            select 1
            from public.notification_reads read_state
            where read_state.notification_id = notification.id
              and read_state.user_id = notification.target_user_id
              and read_state.read_at is not null
          )
      )::bigint as unread_targeted_notifications,
      (select count(*) from public.public_contents where publication_status = 'draft')::bigint as content_drafts,
      (select count(*) from public.profiles where is_blocked)::bigint as blocked_accounts
  )
  select jsonb_build_object(
    'period', jsonb_build_object(
      'start', period_start,
      'end', period_end,
      'previousStart', previous_start,
      'previousEnd', previous_end
    ),
    'platform', to_jsonb(platform_totals),
    'plans', to_jsonb(plan_distribution),
    'current', to_jsonb(current_period),
    'previous', to_jsonb(previous_period),
    'attention', to_jsonb(attention),
    'generatedAt', now()
  )
  into result
  from platform_totals, plan_distribution, current_period, previous_period, attention;

  return result;
end;
$$;

revoke all on function public.admin_executive_dashboard(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.admin_executive_dashboard(timestamptz, timestamptz)
  to authenticated;

create or replace function public.admin_executive_activity(
  selected_start timestamptz,
  selected_end timestamptz
)
returns table (
  bucket_start date,
  accounts bigint,
  reservations bigint,
  quotes bigint,
  trips bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  period_length interval;
  bucket_unit text;
  bucket_step interval;
  local_start timestamp;
  local_end timestamp;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.' using errcode = '42501';
  end if;

  if selected_start is null or selected_end is null or selected_start >= selected_end then
    raise exception 'Periodo executivo invalido.' using errcode = '22007';
  end if;

  period_length := selected_end - selected_start;
  if period_length > interval '370 days' then
    raise exception 'O periodo maximo e de 370 dias.' using errcode = '22023';
  end if;

  if period_length <= interval '45 days' then
    bucket_unit := 'day';
    bucket_step := interval '1 day';
  elsif period_length <= interval '150 days' then
    bucket_unit := 'week';
    bucket_step := interval '1 week';
  else
    bucket_unit := 'month';
    bucket_step := interval '1 month';
  end if;

  local_start := date_trunc(bucket_unit, selected_start at time zone 'America/Sao_Paulo');
  local_end := date_trunc(bucket_unit, (selected_end - interval '1 microsecond') at time zone 'America/Sao_Paulo');

  return query
  with buckets as (
    select generate_series(local_start, local_end, bucket_step)::date as bucket_start
  ),
  account_counts as (
    select date_trunc(bucket_unit, profile.created_at at time zone 'America/Sao_Paulo')::date as bucket_start, count(*)::bigint as amount
    from public.profiles profile
    where profile.created_at >= selected_start and profile.created_at < selected_end
    group by 1
  ),
  reservation_counts as (
    select date_trunc(bucket_unit, reservation.created_at at time zone 'America/Sao_Paulo')::date as bucket_start, count(*)::bigint as amount
    from public.driver_reservations reservation
    where reservation.created_at >= selected_start and reservation.created_at < selected_end
    group by 1
  ),
  quote_counts as (
    select date_trunc(bucket_unit, quote.created_at at time zone 'America/Sao_Paulo')::date as bucket_start, count(*)::bigint as amount
    from public.driver_quotes quote
    where quote.created_at >= selected_start and quote.created_at < selected_end
    group by 1
  ),
  trip_counts as (
    select date_trunc(bucket_unit, trip.created_at at time zone 'America/Sao_Paulo')::date as bucket_start, count(*)::bigint as amount
    from public.driver_trips trip
    where trip.created_at >= selected_start and trip.created_at < selected_end
    group by 1
  )
  select
    bucket.bucket_start,
    coalesce(account_counts.amount, 0)::bigint,
    coalesce(reservation_counts.amount, 0)::bigint,
    coalesce(quote_counts.amount, 0)::bigint,
    coalesce(trip_counts.amount, 0)::bigint
  from buckets bucket
  left join account_counts using (bucket_start)
  left join reservation_counts using (bucket_start)
  left join quote_counts using (bucket_start)
  left join trip_counts using (bucket_start)
  order by bucket.bucket_start;
end;
$$;

revoke all on function public.admin_executive_activity(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.admin_executive_activity(timestamptz, timestamptz)
  to authenticated;

comment on function public.admin_executive_dashboard(timestamptz, timestamptz) is
  'Entrega agregacoes administrativas reais, comparacao entre periodos e filas de atencao sem expor dados pessoais.';
comment on function public.admin_executive_activity(timestamptz, timestamptz) is
  'Entrega serie temporal agregada do painel executivo com granularidade automatica por periodo.';
