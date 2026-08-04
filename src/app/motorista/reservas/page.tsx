import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Filter, Inbox, LayoutList, MapPin, MessageCircle, RotateCcw, Search, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { DriverReservationManagementForms } from "@/components/DriverReservationManagementForms";
import { PageHeader } from "@/components/PageHeader";
import { SmartBackButton } from "@/components/SmartBackButton";
import { getAuthContext } from "@/lib/auth";
import { DRIVER_RESERVATION_STATUS_LABELS, reservationWhatsAppUrl, type DriverReservation, type DriverReservationStatus } from "@/lib/driver-public";
import { formatBrazilDate, formatBrazilDateTime, formatBrazilTime, JNE_TIME_ZONE } from "@/lib/date-time";

export const metadata: Metadata = { title: "Central de reservas" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string; status?: string; period?: string }>;
};

type PeriodFilter = "all" | "today" | "week" | "upcoming" | "past" | "no_date";

function dateKeyInSaoPaulo(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JNE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function endOfWeek(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDays(dateKey, weekday === 0 ? 0 : 7 - weekday);
}

function matchesPeriod(item: DriverReservation, period: PeriodFilter, today: string, weekEnd: string) {
  if (period === "all") return true;
  if (period === "no_date") return !item.travel_date;
  if (!item.travel_date) return false;
  if (period === "today") return item.travel_date === today;
  if (period === "week") return item.travel_date >= today && item.travel_date <= weekEnd;
  if (period === "upcoming") return item.travel_date >= today;
  if (period === "past") return item.travel_date < today;
  return true;
}

export default async function DriverReservationsPage({ searchParams }: Props) {
  const filters = await searchParams;
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista/reservas");
  if (!profile?.is_professional_driver || profile.is_blocked) redirect("/perfil");

  const { data } = await supabase
    .from("driver_reservations")
    .select("*, driver_service_packages(id,title,pricing_type,price)")
    .eq("driver_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);

  const reservations = (data ?? []) as DriverReservation[];
  const query = (filters.q || "").trim().toLocaleLowerCase("pt-BR");
  const validStatuses = new Set<DriverReservationStatus>(Object.keys(DRIVER_RESERVATION_STATUS_LABELS) as DriverReservationStatus[]);
  const status = validStatuses.has(filters.status as DriverReservationStatus) ? filters.status as DriverReservationStatus : "all";
  const allowedPeriods = new Set<PeriodFilter>(["all", "today", "week", "upcoming", "past", "no_date"]);
  const period = allowedPeriods.has(filters.period as PeriodFilter) ? filters.period as PeriodFilter : "all";
  const today = dateKeyInSaoPaulo();
  const weekEnd = endOfWeek(today);

  const filteredReservations = reservations.filter((item) => {
    if (status !== "all" && item.status !== status) return false;
    if (!matchesPeriod(item, period, today, weekEnd)) return false;
    if (!query) return true;
    const searchable = [
      item.passenger_name,
      item.passenger_phone,
      item.travel_date,
      item.origin,
      item.destination,
      item.driver_service_packages?.title,
      item.notes,
      item.cancellation_reason,
    ].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
    return searchable.includes(query);
  });

  const newCount = reservations.filter((item) => item.status === "new").length;
  const activeCount = reservations.filter((item) => ["new", "negotiating", "quoted", "confirmed", "in_progress"].includes(item.status)).length;
  const completedCount = reservations.filter((item) => item.status === "completed").length;
  const hasFilters = Boolean(query || status !== "all" || period !== "all");

  return (
    <div className="page-stack driver-page">
      <SmartBackButton className="text-link driver-back-link" fallbackHref="/motorista" label="Voltar ao painel" />
      <PageHeader icon={<Inbox size={24} />} eyebrow="MOTORISTA PROFISSIONAL" title="Central de agendamentos" description="Pesquise, filtre, remarque, duplique ou cancele solicitações sem perder o histórico do atendimento." />

      <nav className="driver-schedule-view-nav" aria-label="Visualizacao de agendamentos">
        <Link className="button button--secondary" href="/motorista/agenda"><CalendarDays size={17} /> Abrir calendario</Link>
        <span className="button button--primary"><LayoutList size={17} /> Lista de reservas</span>
      </nav>

      <section className="driver-reservation-summary">
        <article><span>Novas</span><strong>{newCount}</strong></article>
        <article><span>Em andamento</span><strong>{activeCount}</strong></article>
        <article><span>Concluídas</span><strong>{completedCount}</strong></article>
      </section>

      <form className="driver-reservation-filters" method="get">
        <label className="driver-reservation-search">
          <Search size={18} />
          <input name="q" defaultValue={filters.q || ""} placeholder="Passageiro, telefone, origem ou destino" />
        </label>
        <label>
          <span>Situação</span>
          <select name="status" defaultValue={status}>
            <option value="all">Todas</option>
            {(Object.keys(DRIVER_RESERVATION_STATUS_LABELS) as DriverReservationStatus[]).map((item) => (
              <option key={item} value={item}>{DRIVER_RESERVATION_STATUS_LABELS[item]}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Período</span>
          <select name="period" defaultValue={period}>
            <option value="all">Todos os períodos</option>
            <option value="today">Hoje</option>
            <option value="week">Esta semana</option>
            <option value="upcoming">Próximos</option>
            <option value="past">Datas passadas</option>
            <option value="no_date">Sem data definida</option>
          </select>
        </label>
        <button className="button button--primary" type="submit"><Filter size={17} /> Aplicar</button>
        {hasFilters ? <Link className="button button--secondary" href="/motorista/reservas"><RotateCcw size={17} /> Limpar</Link> : null}
      </form>

      <div className="driver-reservation-results-heading">
        <strong>{filteredReservations.length}</strong>
        <span>{filteredReservations.length === 1 ? "agendamento encontrado" : "agendamentos encontrados"}</span>
      </div>

      {filteredReservations.length ? (
        <div className="driver-reservation-list">
          {filteredReservations.map((item) => {
            const route = [item.origin, item.destination].filter(Boolean).join(" → ") || item.driver_service_packages?.title || "Solicitação de corrida";
            return (
              <article key={item.id} className={`driver-reservation-card driver-reservation-card--${item.status}`}>
                <div className="driver-reservation-card__top">
                  <span className={`driver-reservation-badge driver-reservation-badge--${item.status}`}>{DRIVER_RESERVATION_STATUS_LABELS[item.status]}</span>
                  <time>{formatBrazilDateTime(item.created_at)}</time>
                </div>
                <h2>{item.passenger_name}</h2>
                <p className="driver-reservation-route"><MapPin size={17} /> {route}</p>
                <div className="driver-reservation-facts">
                  <span><CalendarDays size={16} /> Ida: {item.travel_date ? formatBrazilDate(item.travel_date) : "a combinar"}{item.travel_time ? ` às ${formatBrazilTime(item.travel_time)}` : ""}</span>
                  {item.has_return ? <span><CalendarDays size={16} /> Volta: {item.return_date ? formatBrazilDate(item.return_date) : "a combinar"}{item.return_time ? ` às ${formatBrazilTime(item.return_time)}` : ""}</span> : null}
                  <span><Users size={16} /> {item.passengers} passageiro(s)</span>
                </div>
                {item.cancellation_reason ? <p className="driver-reservation-card__reason"><strong>Motivo:</strong> {item.cancellation_reason}</p> : null}
                <div className="driver-reservation-card__actions">
                  <a className="button button--secondary" href={reservationWhatsAppUrl(item)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp</a>
                  <Link className="button button--primary" href={`/motorista/reservas/${item.id}`}>Abrir <ArrowRight size={17} /></Link>
                </div>
                <DriverReservationManagementForms reservation={item} compact />
              </article>
            );
          })}
        </div>
      ) : (
        <div className="driver-empty-card">
          <Inbox size={32} />
          <strong>{hasFilters ? "Nenhum agendamento corresponde aos filtros" : "Nenhuma solicitação ainda"}</strong>
          <p>{hasFilters ? "Limpe ou altere os filtros para procurar outro atendimento." : "Quando um passageiro enviar uma reserva pelo seu cartão digital, ela aparecerá aqui."}</p>
          {hasFilters ? <Link className="button button--secondary" href="/motorista/reservas">Limpar filtros</Link> : <Link className="button button--primary" href="/motorista/cartao">Divulgar meu QR</Link>}
        </div>
      )}
    </div>
  );
}
