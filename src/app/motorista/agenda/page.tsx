import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Inbox,
  MapPin,
  Trash2,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { deleteDriverScheduleBlockAction } from "@/app/motorista/agenda/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { DriverScheduleBlockForm } from "@/components/DriverScheduleBlockForm";
import { PageHeader } from "@/components/PageHeader";
import { SmartBackButton } from "@/components/SmartBackButton";
import { requireDriverFeature } from "@/lib/account-plan";
import { formatBrazilTime } from "@/lib/date-time";
import { DRIVER_RESERVATION_STATUS_LABELS, type DriverReservation } from "@/lib/driver-public";
import {
  addMonths,
  calendarDays,
  dateKeyInTimeZone,
  dateLabel,
  durationLabel,
  monthBounds,
  monthKeyInTimeZone,
  monthLabel,
  normalizeDateKey,
  normalizeMonthKey,
  reservationScheduleLabel,
  scheduleSortKey,
  type DriverScheduleBlock,
} from "@/lib/driver-schedule";

export const metadata: Metadata = { title: "Agenda do motorista" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ month?: string; day?: string }>;
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const TERMINAL_STATUSES = new Set(["completed", "cancelled", "declined"]);

function dayNumber(dateKey: string) {
  return String(Number(dateKey.slice(-2)));
}

type ScheduleEntry = {
  reservation: DriverReservation;
  leg: "outbound" | "return";
  date: string;
  time: string | null;
  durationMinutes: number;
};

function scheduleTime(item: ScheduleEntry) {
  return item.time ? formatBrazilTime(item.time) : "A combinar";
}

function entryRouteLabel(item: ScheduleEntry) {
  if (item.leg === "return") {
    return [item.reservation.destination, item.reservation.origin].filter(Boolean).join(" → ") || "Rota da volta";
  }
  return reservationScheduleLabel(item.reservation);
}

export default async function DriverAgendaPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, userId } = await requireDriverFeature("schedule", "/motorista/agenda");

  const today = dateKeyInTimeZone();
  const currentMonth = monthKeyInTimeZone();
  const month = normalizeMonthKey(query.month, currentMonth);
  const bounds = monthBounds(month);
  const selectedDayCandidate = normalizeDateKey(query.day, month === currentMonth ? today : bounds.start);
  const selectedDay = selectedDayCandidate.startsWith(`${month}-`) ? selectedDayCandidate : bounds.start;

  const [{ data: reservationData }, { data: blockData }, { data: settingsData }] = await Promise.all([
    supabase
      .from("driver_reservations")
      .select("*, driver_service_packages(id,title,pricing_type,price)")
      .eq("driver_user_id", userId)
      .or(`and(travel_date.gte.${bounds.start},travel_date.lte.${bounds.end}),and(return_date.gte.${bounds.start},return_date.lte.${bounds.end})`)
      .order("travel_date", { ascending: true })
      .order("travel_time", { ascending: true }),
    supabase
      .from("driver_schedule_blocks")
      .select("*")
      .eq("user_id", userId)
      .gte("block_date", bounds.start)
      .lte("block_date", bounds.end)
      .order("block_date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("driver_settings")
      .select("schedule_buffer_minutes,default_reservation_duration_minutes")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const reservations = ((reservationData ?? []) as DriverReservation[]).sort((first, second) => scheduleSortKey(first).localeCompare(scheduleSortKey(second)));
  const blocks = (blockData ?? []) as DriverScheduleBlock[];
  const entries: ScheduleEntry[] = reservations.flatMap((reservation) => {
    const result: ScheduleEntry[] = [];
    if (reservation.travel_date) {
      result.push({
        reservation,
        leg: "outbound",
        date: reservation.travel_date,
        time: reservation.travel_time,
        durationMinutes: reservation.duration_minutes || 60,
      });
    }
    if (reservation.has_return && reservation.return_date) {
      result.push({
        reservation,
        leg: "return",
        date: reservation.return_date,
        time: reservation.return_time,
        durationMinutes: reservation.route_duration_seconds
          ? Math.max(15, Math.ceil(reservation.route_duration_seconds / 60))
          : reservation.duration_minutes || 60,
      });
    }
    return result;
  }).sort((first, second) => `${first.date}T${first.time || "99:99"}`.localeCompare(`${second.date}T${second.time || "99:99"}`));
  const dayEntries = entries.filter((item) => item.date === selectedDay);
  const dayBlocks = blocks.filter((item) => item.block_date === selectedDay);
  const activeReservations = reservations.filter((item) => !TERMINAL_STATUSES.has(item.status));
  const confirmedCount = activeReservations.filter((item) => ["confirmed", "in_progress"].includes(item.status)).length;
  const pendingCount = activeReservations.filter((item) => ["new", "negotiating", "quoted"].includes(item.status)).length;
  const days = calendarDays(month);
  const reservationsByDay = new Map<string, ScheduleEntry[]>();
  const blocksByDay = new Map<string, DriverScheduleBlock[]>();

  for (const entry of entries) {
    reservationsByDay.set(entry.date, [...(reservationsByDay.get(entry.date) ?? []), entry]);
  }
  for (const block of blocks) {
    blocksByDay.set(block.block_date, [...(blocksByDay.get(block.block_date) ?? []), block]);
  }

  const previousMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);
  const bufferMinutes = Number(settingsData?.schedule_buffer_minutes || 30);
  const defaultDuration = Number(settingsData?.default_reservation_duration_minutes || 60);

  return (
    <div className="page-stack driver-page">
      <SmartBackButton className="text-link driver-back-link" fallbackHref="/motorista" label="Voltar ao painel" />
      <PageHeader
        icon={<CalendarDays size={24} />}
        eyebrow="MOTORISTA PROFISSIONAL"
        title="Agenda de corridas"
        description="Visualize o mes, abra cada dia, bloqueie horarios e evite compromissos sobrepostos."
      />

      <nav className="driver-schedule-view-nav" aria-label="Navegacao da agenda">
        <Link className="button button--primary" href={`/motorista/agenda?month=${month}&day=${selectedDay}`}><CalendarDays size={17} /> Calendario</Link>
        <Link className="button button--secondary" href={`/motorista/reservas?period=upcoming`}><Inbox size={17} /> Lista de reservas</Link>
        <Link className="button button--secondary" href={`/motorista/agenda?month=${currentMonth}&day=${today}`}>Hoje</Link>
      </nav>

      <section className="driver-schedule-summary">
        <article><span>Compromissos ativos</span><strong>{activeReservations.length}</strong></article>
        <article><span>Confirmados</span><strong>{confirmedCount}</strong></article>
        <article><span>Aguardando</span><strong>{pendingCount}</strong></article>
        <article><span>Bloqueios</span><strong>{blocks.length}</strong></article>
      </section>

      <section className="driver-calendar-shell">
        <div className="driver-calendar-header">
          <Link aria-label="Mes anterior" href={`/motorista/agenda?month=${previousMonth}&day=${previousMonth}-01`}><ChevronLeft size={21} /></Link>
          <div><span>AGENDA MENSAL</span><h2>{monthLabel(month)}</h2></div>
          <Link aria-label="Proximo mes" href={`/motorista/agenda?month=${nextMonth}&day=${nextMonth}-01`}><ChevronRight size={21} /></Link>
        </div>
        <div className="driver-calendar-weekdays" aria-hidden="true">
          {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>
        <div className="driver-calendar-grid">
          {days.map((dateKey) => {
            const dayItems = reservationsByDay.get(dateKey) ?? [];
            const dayBlockItems = blocksByDay.get(dateKey) ?? [];
            const activeItems = dayItems.filter((item) => !TERMINAL_STATUSES.has(item.reservation.status));
            const outside = !dateKey.startsWith(`${month}-`);
            const selected = dateKey === selectedDay;
            const isToday = dateKey === today;
            return (
              <Link
                key={dateKey}
                href={`/motorista/agenda?month=${dateKey.slice(0, 7)}&day=${dateKey}`}
                className={`driver-calendar-day${outside ? " is-outside" : ""}${selected ? " is-selected" : ""}${isToday ? " is-today" : ""}`}
              >
                <span className="driver-calendar-day__number">{dayNumber(dateKey)}</span>
                <span className="driver-calendar-day__events">
                  {activeItems.slice(0, 3).map((item) => <i key={`${item.reservation.id}-${item.leg}`} className={`driver-calendar-dot driver-calendar-dot--${item.reservation.status}`} />)}
                  {dayBlockItems.length ? <i className="driver-calendar-dot driver-calendar-dot--block" /> : null}
                </span>
                {activeItems.length || dayBlockItems.length ? <small>{activeItems.length + dayBlockItems.length}</small> : null}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="driver-schedule-day">
        <div className="driver-schedule-day__heading">
          <div><span className="eyebrow">AGENDA DO DIA</span><h2>{dateLabel(selectedDay)}</h2><p>{dayEntries.length} etapa(s) de corrida e {dayBlocks.length} bloqueio(s).</p></div>
          <Link className="button button--secondary" href={`/motorista/reservas?period=all&q=${encodeURIComponent(selectedDay)}`}>Ver na central <ArrowRight size={17} /></Link>
        </div>

        <div className="driver-schedule-day__grid">
          <div className="driver-schedule-timeline">
            {dayBlocks.map((block) => (
              <article key={block.id} className="driver-schedule-entry driver-schedule-entry--block">
                <div className="driver-schedule-entry__time"><CalendarOff size={18} /><strong>{block.is_all_day ? "Dia inteiro" : `${formatBrazilTime(block.start_time)} - ${formatBrazilTime(block.end_time)}`}</strong></div>
                <div className="driver-schedule-entry__body"><span>INDISPONIVEL</span><h3>{block.title}</h3>{block.notes ? <p>{block.notes}</p> : null}</div>
                <form action={deleteDriverScheduleBlockAction}>
                  <input type="hidden" name="blockId" value={block.id} />
                  <ConfirmSubmitButton className="driver-schedule-entry__delete" message="Remover este bloqueio da agenda?"><Trash2 size={17} /></ConfirmSubmitButton>
                </form>
              </article>
            ))}

            {dayEntries.map((entry) => {
              const reservation = entry.reservation;
              return (
                <Link key={`${reservation.id}-${entry.leg}`} className={`driver-schedule-entry driver-schedule-entry--${reservation.status}`} href={`/motorista/reservas/${reservation.id}`}>
                  <div className="driver-schedule-entry__time"><Clock3 size={18} /><strong>{scheduleTime(entry)}</strong><small>{durationLabel(entry.durationMinutes || defaultDuration)}</small></div>
                  <div className="driver-schedule-entry__body">
                    <span className={`driver-reservation-badge driver-reservation-badge--${reservation.status}`}>{entry.leg === "return" ? "VOLTA" : DRIVER_RESERVATION_STATUS_LABELS[reservation.status]}</span>
                    <h3>{reservation.passenger_name}</h3>
                    <p><MapPin size={15} /> {entryRouteLabel(entry)}</p>
                    <small><Users size={14} /> {reservation.passengers} passageiro(s)</small>
                  </div>
                  <ArrowRight size={18} />
                </Link>
              );
            })}

            {!dayBlocks.length && !dayEntries.length ? (
              <div className="driver-schedule-day-empty"><CalendarDays size={30} /><strong>Dia livre</strong><p>Nenhuma reserva ou bloqueio registrado para esta data.</p></div>
            ) : null}
          </div>

          <aside className="driver-schedule-day__aside">
            <DriverScheduleBlockForm defaultDate={selectedDay} />
            <section className="driver-schedule-rules-card">
              <span className="eyebrow">REGRAS DA AGENDA</span>
              <h2>Intervalos automaticos</h2>
              <dl><div><dt>Duracao padrao</dt><dd>{durationLabel(defaultDuration)}</dd></div><div><dt>Entre corridas</dt><dd>{durationLabel(bufferMinutes)}</dd></div></dl>
              <p>Esses valores sao usados para detectar conflitos. Podem ser alterados nas configuracoes do motorista.</p>
              <Link className="text-link" href="/motorista/configuracoes">Ajustar configuracoes <ArrowRight size={16} /></Link>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
