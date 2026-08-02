-- JNE App 1.16.0 - Financeiro profissional do motorista
-- Migration idempotente. Execute somente este arquivo em bancos existentes.

create table if not exists public.driver_finance_goals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  month_start date not null,
  gross_goal numeric(12,2) not null default 0,
  net_goal numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, month_start),
  constraint driver_finance_goals_month_start_check
    check (extract(day from month_start) = 1),
  constraint driver_finance_goals_gross_check
    check (gross_goal >= 0 and gross_goal <= 99999999.99),
  constraint driver_finance_goals_net_check
    check (net_goal >= 0 and net_goal <= 99999999.99)
);

create index if not exists driver_finance_goals_user_month_idx
  on public.driver_finance_goals(user_id, month_start desc);

alter table public.driver_finance_goals enable row level security;
grant select, insert, update, delete on public.driver_finance_goals to authenticated;
revoke all on public.driver_finance_goals from anon;

drop policy if exists "Drivers read own finance goals" on public.driver_finance_goals;
create policy "Drivers read own finance goals"
on public.driver_finance_goals
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Drivers create own finance goals" on public.driver_finance_goals;
create policy "Drivers create own finance goals"
on public.driver_finance_goals
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Drivers update own finance goals" on public.driver_finance_goals;
create policy "Drivers update own finance goals"
on public.driver_finance_goals
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Drivers delete own finance goals" on public.driver_finance_goals;
create policy "Drivers delete own finance goals"
on public.driver_finance_goals
for delete
to authenticated
using (user_id = auth.uid());

drop trigger if exists driver_finance_goals_set_updated_at on public.driver_finance_goals;
create trigger driver_finance_goals_set_updated_at
before update on public.driver_finance_goals
for each row execute function public.set_updated_at();

comment on table public.driver_finance_goals is
  'Metas mensais privadas de faturamento e resultado liquido do motorista profissional.';
