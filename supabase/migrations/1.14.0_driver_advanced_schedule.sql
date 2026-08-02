-- JNE App 1.14.0 - agenda e reservas avancadas.
-- Migration idempotente. Execute somente este arquivo em bancos existentes.

alter table public.driver_settings
  add column if not exists schedule_buffer_minutes integer not null default 30,
  add column if not exists default_reservation_duration_minutes integer not null default 60;

alter table public.driver_settings
  drop constraint if exists driver_settings_schedule_buffer_check,
  drop constraint if exists driver_settings_default_duration_check;

alter table public.driver_settings
  add constraint driver_settings_schedule_buffer_check
    check (schedule_buffer_minutes between 0 and 240),
  add constraint driver_settings_default_duration_check
    check (default_reservation_duration_minutes between 15 and 720);

alter table public.driver_reservations
  add column if not exists duration_minutes integer not null default 60,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.driver_reservations
  drop constraint if exists driver_reservations_duration_check,
  drop constraint if exists driver_reservations_status_check;

alter table public.driver_reservations
  add constraint driver_reservations_duration_check
    check (duration_minutes between 15 and 720),
  add constraint driver_reservations_status_check
    check (status in ('new','negotiating','quoted','confirmed','in_progress','completed','cancelled','declined'));

update public.driver_reservations reservation
set duration_minutes = coalesce(
  (
    select settings.default_reservation_duration_minutes
    from public.driver_settings settings
    where settings.user_id = reservation.driver_user_id
  ),
  60
)
where duration_minutes is null or duration_minutes < 15;

create table if not exists public.driver_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  block_date date not null,
  start_time time,
  end_time time,
  is_all_day boolean not null default false,
  title text not null default 'Indisponivel',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_schedule_blocks_title_check
    check (length(trim(title)) between 2 and 80),
  constraint driver_schedule_blocks_notes_check
    check (notes is null or length(notes) <= 300),
  constraint driver_schedule_blocks_time_check
    check (
      (is_all_day = true and start_time is null and end_time is null)
      or
      (is_all_day = false and start_time is not null and end_time is not null and end_time > start_time)
    )
);

create index if not exists driver_schedule_blocks_user_date_idx
  on public.driver_schedule_blocks(user_id, block_date, start_time);

alter table public.driver_schedule_blocks enable row level security;
revoke all on public.driver_schedule_blocks from anon;
grant select, insert, update, delete on public.driver_schedule_blocks to authenticated;

drop policy if exists "Drivers read own schedule blocks" on public.driver_schedule_blocks;
create policy "Drivers read own schedule blocks"
on public.driver_schedule_blocks
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Drivers create own schedule blocks" on public.driver_schedule_blocks;
create policy "Drivers create own schedule blocks"
on public.driver_schedule_blocks
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid()
      and profile.is_professional_driver = true
      and profile.is_blocked = false
  )
);

drop policy if exists "Drivers update own schedule blocks" on public.driver_schedule_blocks;
create policy "Drivers update own schedule blocks"
on public.driver_schedule_blocks
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Drivers delete own schedule blocks" on public.driver_schedule_blocks;
create policy "Drivers delete own schedule blocks"
on public.driver_schedule_blocks
for delete
to authenticated
using (user_id = auth.uid());

drop trigger if exists driver_schedule_blocks_set_updated_at on public.driver_schedule_blocks;
create trigger driver_schedule_blocks_set_updated_at
before update on public.driver_schedule_blocks
for each row execute function public.set_updated_at();

create or replace function public.driver_schedule_conflicts(
  p_driver_user_id uuid,
  p_travel_date date,
  p_travel_time time,
  p_duration_minutes integer default 60,
  p_exclude_reservation_id uuid default null
)
returns table (
  conflict_type text,
  conflict_id uuid,
  conflict_label text,
  starts_at timestamp,
  ends_at timestamp
)
language sql
stable
security definer
set search_path = public
as $$
  with config as (
    select coalesce(settings.schedule_buffer_minutes, 30)::integer as buffer_minutes
    from (select 1) seed
    left join public.driver_settings settings on settings.user_id = p_driver_user_id
  ),
  candidate as (
    select
      (p_travel_date + p_travel_time)::timestamp as starts_at,
      (p_travel_date + p_travel_time)::timestamp
        + make_interval(mins => greatest(15, least(coalesce(p_duration_minutes, 60), 720))) as ends_at,
      config.buffer_minutes
    from config
  ),
  reservation_conflicts as (
    select
      'reservation'::text as conflict_type,
      reservation.id as conflict_id,
      reservation.passenger_name::text as conflict_label,
      (reservation.travel_date + reservation.travel_time)::timestamp as starts_at,
      (reservation.travel_date + reservation.travel_time)::timestamp
        + make_interval(mins => reservation.duration_minutes) as ends_at
    from public.driver_reservations reservation
    cross join candidate
    where reservation.driver_user_id = p_driver_user_id
      and reservation.id is distinct from p_exclude_reservation_id
      and reservation.travel_date is not null
      and reservation.travel_time is not null
      and reservation.status in ('new','negotiating','quoted','confirmed','in_progress')
      and candidate.starts_at < (
        (reservation.travel_date + reservation.travel_time)::timestamp
        + make_interval(mins => reservation.duration_minutes + candidate.buffer_minutes)
      )
      and candidate.ends_at + make_interval(mins => candidate.buffer_minutes) >
        (reservation.travel_date + reservation.travel_time)::timestamp
  ),
  block_conflicts as (
    select
      'block'::text as conflict_type,
      block.id as conflict_id,
      block.title::text as conflict_label,
      case
        when block.is_all_day then block.block_date::timestamp
        else (block.block_date + block.start_time)::timestamp
      end as starts_at,
      case
        when block.is_all_day then block.block_date::timestamp + interval '1 day'
        else (block.block_date + block.end_time)::timestamp
      end as ends_at
    from public.driver_schedule_blocks block
    cross join candidate
    where block.user_id = p_driver_user_id
      and block.block_date = p_travel_date
      and candidate.starts_at < case
        when block.is_all_day then block.block_date::timestamp + interval '1 day'
        else (block.block_date + block.end_time)::timestamp
      end
      and candidate.ends_at > case
        when block.is_all_day then block.block_date::timestamp
        else (block.block_date + block.start_time)::timestamp
      end
  )
  select * from reservation_conflicts
  union all
  select * from block_conflicts
  order by starts_at asc;
$$;

revoke all on function public.driver_schedule_conflicts(uuid, date, time, integer, uuid) from public, anon;
grant execute on function public.driver_schedule_conflicts(uuid, date, time, integer, uuid) to authenticated, service_role;

create or replace function public.enforce_driver_reservation_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  found_conflict record;
begin
  if new.travel_date is null
     or new.travel_time is null
     or new.status in ('completed','cancelled','declined') then
    return new;
  end if;

  select * into found_conflict
  from public.driver_schedule_conflicts(
    new.driver_user_id,
    new.travel_date,
    new.travel_time,
    new.duration_minutes,
    case when tg_op = 'UPDATE' then new.id else null end
  )
  limit 1;

  if found_conflict.conflict_id is not null then
    raise exception 'AGENDA_CONFLICT:%:%', found_conflict.conflict_type, found_conflict.conflict_label
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_driver_reservation_schedule_trigger on public.driver_reservations;
create trigger enforce_driver_reservation_schedule_trigger
before insert or update of driver_user_id, travel_date, travel_time, duration_minutes, status
on public.driver_reservations
for each row execute function public.enforce_driver_reservation_schedule();

create or replace function public.prepare_driver_reservation_terminal_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('cancelled', 'declined') then
    new.cancellation_reason := nullif(trim(coalesce(new.cancellation_reason, '')), '');
    new.cancelled_at := coalesce(new.cancelled_at, now());
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    new.cancellation_reason := null;
    new.cancelled_at := null;
  end if;

  if new.status = 'in_progress' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.started_at := coalesce(new.started_at, now());
  end if;

  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.completed_at := coalesce(new.completed_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_driver_reservation_terminal_state_trigger on public.driver_reservations;
create trigger prepare_driver_reservation_terminal_state_trigger
before insert or update of status, cancellation_reason, cancelled_at, started_at, completed_at
on public.driver_reservations
for each row execute function public.prepare_driver_reservation_terminal_state();

create index if not exists driver_reservations_driver_schedule_idx
  on public.driver_reservations(driver_user_id, travel_date, travel_time, status)
  where travel_date is not null and travel_time is not null;
