-- JNE App 1.15.0 - orcamentos profissionais.
-- Migration idempotente. Execute somente este arquivo em bancos existentes.

alter table public.driver_quotes
  add column if not exists customer_phone text,
  add column if not exists customer_id uuid references public.driver_customers(id) on delete set null,
  add column if not exists reservation_id uuid references public.driver_reservations(id) on delete set null,
  add column if not exists public_token uuid default gen_random_uuid(),
  add column if not exists valid_until timestamptz default (now() + interval '7 days'),
  add column if not exists travel_time time,
  add column if not exists conditions text,
  add column if not exists line_items jsonb default '[]'::jsonb,
  add column if not exists view_count integer not null default 0,
  add column if not exists sent_at timestamptz,
  add column if not exists viewed_at timestamptz,
  add column if not exists responded_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists response_message text,
  add column if not exists version integer not null default 1,
  add column if not exists source text,
  add column if not exists campaign_id uuid references public.driver_marketing_campaigns(id) on delete set null;

update public.driver_quotes
set public_token = gen_random_uuid()
where public_token is null;

update public.driver_quotes
set valid_until = coalesce(created_at, now()) + interval '7 days'
where valid_until is null;

update public.driver_quotes
set line_items = jsonb_build_array(
  jsonb_build_object('kind', 'distance', 'label', 'Deslocamento', 'amount', distance_charge),
  jsonb_build_object('kind', 'travel_time', 'label', 'Tempo em viagem', 'amount', time_charge),
  jsonb_build_object('kind', 'waiting', 'label', 'Tempo de espera', 'amount', waiting_charge),
  jsonb_build_object('kind', 'maintenance', 'label', 'Reserva operacional e manutencao', 'amount', maintenance_reserve),
  jsonb_build_object('kind', 'other', 'label', 'Pedagios e custos adicionais', 'amount', direct_costs),
  jsonb_build_object('kind', 'discount', 'label', 'Desconto', 'amount', -discount)
)
where line_items is null or line_items = '[]'::jsonb;

update public.driver_quotes quote
set
  reservation_id = coalesce(quote.reservation_id, reservation.id),
  customer_id = coalesce(quote.customer_id, reservation.customer_id),
  customer_phone = coalesce(quote.customer_phone, reservation.passenger_phone),
  travel_time = coalesce(quote.travel_time, reservation.travel_time),
  source = coalesce(quote.source, reservation.source),
  campaign_id = coalesce(quote.campaign_id, reservation.campaign_id)
from public.driver_reservations reservation
where reservation.quote_id = quote.id
  and reservation.driver_user_id = quote.user_id;

alter table public.driver_quotes
  alter column public_token set not null,
  alter column valid_until set not null,
  alter column line_items set not null;

alter table public.driver_quotes
  drop constraint if exists driver_quotes_status_check,
  drop constraint if exists driver_quotes_customer_phone_check,
  drop constraint if exists driver_quotes_conditions_check,
  drop constraint if exists driver_quotes_line_items_check,
  drop constraint if exists driver_quotes_view_count_check,
  drop constraint if exists driver_quotes_version_check,
  drop constraint if exists driver_quotes_response_message_check;

alter table public.driver_quotes
  add constraint driver_quotes_status_check
    check (status in ('draft','sent','viewed','accepted','declined','expired','completed','cancelled')),
  add constraint driver_quotes_customer_phone_check
    check (customer_phone is null or customer_phone ~ '^[0-9]{10,15}$'),
  add constraint driver_quotes_conditions_check
    check (conditions is null or length(conditions) <= 2500),
  add constraint driver_quotes_line_items_check
    check (jsonb_typeof(line_items) = 'array'),
  add constraint driver_quotes_view_count_check
    check (view_count >= 0),
  add constraint driver_quotes_version_check
    check (version >= 1),
  add constraint driver_quotes_response_message_check
    check (response_message is null or length(response_message) <= 500);

create unique index if not exists driver_quotes_public_token_uidx
  on public.driver_quotes(public_token);

create index if not exists driver_quotes_user_validity_idx
  on public.driver_quotes(user_id, status, valid_until, created_at desc);

create index if not exists driver_quotes_customer_idx
  on public.driver_quotes(user_id, customer_id, created_at desc)
  where customer_id is not null;

create index if not exists driver_quotes_reservation_idx
  on public.driver_quotes(reservation_id)
  where reservation_id is not null;

create table if not exists public.driver_quote_events (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.driver_quotes(id) on delete cascade,
  driver_user_id uuid not null references public.profiles(id) on delete cascade,
  actor_type text not null default 'system' check (actor_type in ('driver','passenger','system')),
  event_type text not null,
  previous_status text,
  new_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint driver_quote_events_type_check check (length(trim(event_type)) between 2 and 80),
  constraint driver_quote_events_metadata_check check (jsonb_typeof(metadata) = 'object')
);

create index if not exists driver_quote_events_quote_created_idx
  on public.driver_quote_events(quote_id, created_at desc);

alter table public.driver_quote_events enable row level security;
revoke all on public.driver_quote_events from anon;
grant select, insert on public.driver_quote_events to authenticated;

 drop policy if exists "Drivers read own quote events" on public.driver_quote_events;
create policy "Drivers read own quote events"
on public.driver_quote_events
for select
to authenticated
using (driver_user_id = auth.uid());

drop policy if exists "Drivers create own quote events" on public.driver_quote_events;
create policy "Drivers create own quote events"
on public.driver_quote_events
for insert
to authenticated
with check (driver_user_id = auth.uid());

create or replace function public.prepare_driver_quote_workflow()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();

  if new.status = 'sent' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.sent_at := coalesce(new.sent_at, now());
    new.cancelled_at := null;
  elsif new.status = 'viewed' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.viewed_at := coalesce(new.viewed_at, now());
  elsif new.status = 'accepted' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.accepted_at := coalesce(new.accepted_at, now());
    new.responded_at := coalesce(new.responded_at, now());
  elsif new.status = 'declined' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.declined_at := coalesce(new.declined_at, now());
    new.responded_at := coalesce(new.responded_at, now());
  elsif new.status = 'cancelled' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  end if;

  if new.status = 'draft' and tg_op = 'UPDATE' and old.status is distinct from new.status then
    new.sent_at := null;
    new.viewed_at := null;
    new.responded_at := null;
    new.accepted_at := null;
    new.declined_at := null;
    new.cancelled_at := null;
    new.response_message := null;
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_driver_quote_workflow_trigger on public.driver_quotes;
create trigger prepare_driver_quote_workflow_trigger
before insert or update on public.driver_quotes
for each row execute function public.prepare_driver_quote_workflow();

create or replace function public.get_public_driver_quote(quote_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  token_uuid uuid;
  quote_row public.driver_quotes%rowtype;
  driver_payload jsonb;
begin
  begin
    token_uuid := quote_token::uuid;
  exception when others then
    return null;
  end;

  select * into quote_row
  from public.driver_quotes
  where public_token = token_uuid;

  if quote_row.id is null or quote_row.status = 'draft' then
    return null;
  end if;

  if quote_row.status in ('sent','viewed') and quote_row.valid_until < now() then
    update public.driver_quotes
    set status = 'expired'
    where id = quote_row.id
    returning * into quote_row;

    insert into public.driver_quote_events(quote_id, driver_user_id, actor_type, event_type, previous_status, new_status)
    values (quote_row.id, quote_row.user_id, 'system', 'quote_expired', 'viewed', 'expired');
  elsif quote_row.status in ('sent','viewed') then
    update public.driver_quotes
    set
      status = case when status = 'sent' then 'viewed' else status end,
      viewed_at = coalesce(viewed_at, now()),
      view_count = view_count + 1
    where id = quote_row.id
    returning * into quote_row;

    insert into public.driver_quote_events(quote_id, driver_user_id, actor_type, event_type, previous_status, new_status, metadata)
    values (
      quote_row.id,
      quote_row.user_id,
      'passenger',
      'quote_viewed',
      case when quote_row.view_count = 1 then 'sent' else 'viewed' end,
      'viewed',
      jsonb_build_object('view_count', quote_row.view_count)
    );
  end if;

  select jsonb_build_object(
    'display_name', coalesce(profile.display_name, member.full_name, 'Motorista profissional'),
    'slug', profile.slug,
    'headline', profile.headline,
    'city', profile.city,
    'service_area', profile.service_area,
    'whatsapp_phone', profile.whatsapp_phone,
    'vehicle_name', profile.vehicle_name,
    'vehicle_details', profile.vehicle_details,
    'photo_url', profile.photo_url
  ) into driver_payload
  from public.profiles member
  left join public.driver_public_profiles profile on profile.user_id = member.id
  where member.id = quote_row.user_id;

  return jsonb_build_object(
    'id', quote_row.id,
    'customer_name', quote_row.customer_name,
    'origin', quote_row.origin,
    'destination', quote_row.destination,
    'travel_date', quote_row.travel_date,
    'travel_time', quote_row.travel_time,
    'trip_type', quote_row.trip_type,
    'total_distance_km', quote_row.total_distance_km,
    'billable_hours', quote_row.billable_hours,
    'rounded_total', quote_row.rounded_total,
    'discount', quote_row.discount,
    'status', quote_row.status,
    'notes', quote_row.notes,
    'conditions', quote_row.conditions,
    'line_items', quote_row.line_items,
    'valid_until', quote_row.valid_until,
    'view_count', quote_row.view_count,
    'created_at', quote_row.created_at,
    'responded_at', quote_row.responded_at,
    'response_message', quote_row.response_message,
    'driver', coalesce(driver_payload, '{}'::jsonb)
  );
end;
$$;

create or replace function public.respond_public_driver_quote(
  quote_token text,
  decision text,
  passenger_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  token_uuid uuid;
  quote_row public.driver_quotes%rowtype;
  target_status text;
  reservation_uuid uuid;
  reservation_customer_id uuid;
  safe_source text;
  safe_phone text;
  duration_value integer;
begin
  begin
    token_uuid := quote_token::uuid;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'Orcamento invalido.');
  end;

  if decision not in ('accepted','declined') then
    return jsonb_build_object('ok', false, 'error', 'Resposta invalida.');
  end if;

  select * into quote_row
  from public.driver_quotes
  where public_token = token_uuid
  for update;

  if quote_row.id is null then
    return jsonb_build_object('ok', false, 'error', 'Orcamento nao encontrado.');
  end if;

  if quote_row.status in ('sent','viewed') and quote_row.valid_until < now() then
    update public.driver_quotes set status = 'expired' where id = quote_row.id;
    return jsonb_build_object('ok', false, 'status', 'expired', 'error', 'Este orcamento expirou.');
  end if;

  if quote_row.status not in ('sent','viewed') then
    return jsonb_build_object('ok', false, 'status', quote_row.status, 'error', 'Esta proposta nao aceita nova resposta.');
  end if;

  target_status := decision;
  update public.driver_quotes
  set
    status = target_status,
    response_message = nullif(trim(coalesce(passenger_message, '')), ''),
    responded_at = now(),
    accepted_at = case when target_status = 'accepted' then now() else accepted_at end,
    declined_at = case when target_status = 'declined' then now() else declined_at end
  where id = quote_row.id
  returning * into quote_row;

  if target_status = 'accepted' then
    reservation_uuid := quote_row.reservation_id;

    if reservation_uuid is null then
      select reservation.id into reservation_uuid
      from public.driver_reservations reservation
      where reservation.quote_id = quote_row.id
        and reservation.driver_user_id = quote_row.user_id
      order by reservation.created_at desc
      limit 1;
    end if;

    if reservation_uuid is not null then
      update public.driver_reservations
      set status = 'confirmed', quote_id = quote_row.id, updated_at = now()
      where id = reservation_uuid and driver_user_id = quote_row.user_id;
    else
      safe_phone := regexp_replace(coalesce(quote_row.customer_phone, ''), '[^0-9]', '', 'g');
      safe_source := case when quote_row.source in ('profile','qr','shared_link','whatsapp') then quote_row.source else 'shared_link' end;
      duration_value := greatest(15, least(coalesce(round(quote_row.billable_hours * 60)::integer, 60), 720));

      if length(safe_phone) between 10 and 15 then
        begin
          insert into public.driver_reservations(
            driver_user_id, passenger_name, passenger_phone, origin, destination,
            travel_date, travel_time, trip_type, passengers, notes, status,
            duration_minutes, source, campaign_id, customer_id, quote_id, contact_consent
          ) values (
            quote_row.user_id, coalesce(nullif(trim(quote_row.customer_name), ''), 'Passageiro'), safe_phone,
            quote_row.origin, quote_row.destination, quote_row.travel_date, quote_row.travel_time,
            quote_row.trip_type, 1, quote_row.notes, 'confirmed', duration_value,
            safe_source, quote_row.campaign_id, quote_row.customer_id, quote_row.id, true
          ) returning id, customer_id into reservation_uuid, reservation_customer_id;
        exception when others then
          insert into public.driver_reservations(
            driver_user_id, passenger_name, passenger_phone, origin, destination,
            travel_date, travel_time, trip_type, passengers, notes, status,
            duration_minutes, source, campaign_id, customer_id, quote_id, contact_consent
          ) values (
            quote_row.user_id, coalesce(nullif(trim(quote_row.customer_name), ''), 'Passageiro'), safe_phone,
            quote_row.origin, quote_row.destination, null, null,
            quote_row.trip_type, 1,
            concat_ws(E'\n', quote_row.notes, 'Data e horario precisam ser confirmados por possivel conflito de agenda.'),
            'confirmed', duration_value, safe_source, quote_row.campaign_id,
            quote_row.customer_id, quote_row.id, true
          ) returning id, customer_id into reservation_uuid, reservation_customer_id;
        end;
      end if;
    end if;

    if reservation_uuid is not null then
      update public.driver_quotes
      set reservation_id = reservation_uuid,
          customer_id = coalesce(customer_id, reservation_customer_id)
      where id = quote_row.id;
    end if;
  end if;

  insert into public.driver_quote_events(
    quote_id, driver_user_id, actor_type, event_type, previous_status, new_status, metadata
  ) values (
    quote_row.id,
    quote_row.user_id,
    'passenger',
    case when target_status = 'accepted' then 'passenger_accepted' else 'passenger_declined' end,
    case when quote_row.viewed_at is null then 'sent' else 'viewed' end,
    target_status,
    jsonb_build_object('reservation_id', reservation_uuid, 'has_message', passenger_message is not null)
  );

  return jsonb_build_object('ok', true, 'status', target_status, 'reservation_id', reservation_uuid);
end;
$$;

revoke all on function public.get_public_driver_quote(text) from public;
revoke all on function public.respond_public_driver_quote(text, text, text) from public;
grant execute on function public.get_public_driver_quote(text) to anon, authenticated;
grant execute on function public.respond_public_driver_quote(text, text, text) to anon, authenticated;

-- Registra um evento inicial para orcamentos anteriores sem historico.
insert into public.driver_quote_events(quote_id, driver_user_id, actor_type, event_type, new_status, metadata, created_at)
select quote.id, quote.user_id, 'system', 'quote_imported', quote.status, jsonb_build_object('version', '1.15.0'), quote.created_at
from public.driver_quotes quote
where not exists (
  select 1 from public.driver_quote_events event where event.quote_id = quote.id
);
