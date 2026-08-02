import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Clock3,
  Download,
  Gauge,
  Plus,
  ReceiptText,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
  Wrench,
} from "lucide-react";
import { redirect } from "next/navigation";
import { DriverFinanceGoalForm } from "@/components/DriverFinanceGoalForm";
import { DriverRecordDeleteButton } from "@/components/DriverRecordDeleteButton";
import { PageHeader } from "@/components/PageHeader";
import { formatBrazilDate } from "@/lib/date-time";
import {
  buildDriverFinanceTrend,
  buildDriverFinanceWindow,
  buildExpenseCategoryTotals,
  filterEntriesByWindow,
  filterTripsByWindow,
  financeChangePercent,
  summarizeDriverFinance,
  type DriverFinanceSummary,
} from "@/lib/driver-finance";
import { getAuthContext } from "@/lib/auth";
import {
  DRIVER_PAYMENT_STATUS_LABELS,
  DRIVER_TRIP_STATUS_LABELS,
  formatCurrency,
  formatDriverHours,
  type DriverFinancialEntry,
  type DriverTrip,
} from "@/lib/driver";

export const metadata: Metadata = { title: "Financeiro profissional do motorista" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ period?: string; month?: string }>;
};

type FinanceGoalRow = {
  user_id: string;
  month_start: string;
  gross_goal: number;
  net_goal: number;
};

function ChangeIndicator({ current, previous, inverse = false }: { current: number; previous: number; inverse?: boolean }) {
  const change = financeChangePercent(current, previous);
  if (change === null) return <small className="driver-finance-change is-positive">Novo no periodo</small>;
  const positive = inverse ? change <= 0 : change >= 0;
  return (
    <small className={`driver-finance-change ${positive ? "is-positive" : "is-negative"}`}>
      {change >= 0 ? "+" : ""}{change.toFixed(1).replace(".", ",")}% vs. anterior
    </small>
  );
}

function metricCards(summary: DriverFinanceSummary, previous: DriverFinanceSummary) {
  return [
    { icon: TrendingUp, label: "Recebido", value: formatCurrency(summary.gross), current: summary.gross, previous: previous.gross },
    { icon: TrendingDown, label: "Despesas", value: formatCurrency(summary.expenses), current: summary.expenses, previous: previous.expenses, inverse: true },
    { icon: WalletCards, label: "Resultado liquido", value: formatCurrency(summary.net), current: summary.net, previous: previous.net, highlight: true },
    { icon: ReceiptText, label: "A receber", value: formatCurrency(summary.pending), current: summary.pending, previous: previous.pending, inverse: true },
    { icon: Clock3, label: "Horas trabalhadas", value: formatDriverHours(summary.minutes), current: summary.minutes, previous: previous.minutes },
    { icon: Gauge, label: "Quilometros", value: `${summary.distance.toFixed(1).replace(".", ",")} km`, current: summary.distance, previous: previous.distance },
  ];
}

export default async function DriverFinancePage({ searchParams }: Props) {
  const selection = await searchParams;
  const financeWindow = buildDriverFinanceWindow(selection.period, selection.month);
  const { supabase, userId } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista/financeiro");

  const [tripsResult, entriesResult, settingsResult, goalResult] = await Promise.all([
    supabase.from("driver_trips").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1200),
    supabase.from("driver_financial_entries").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(6000),
    supabase.from("driver_settings").select("maintenance_reserve_percent").eq("user_id", userId).maybeSingle(),
    supabase.from("driver_finance_goals").select("user_id,month_start,gross_goal,net_goal").eq("user_id", userId).eq("month_start", `${financeWindow.monthKey}-01`).maybeSingle(),
  ]);

  if (tripsResult.error) throw new Error(tripsResult.error.message);
  if (entriesResult.error) throw new Error(entriesResult.error.message);

  const trips = (tripsResult.data ?? []) as DriverTrip[];
  const entries = (entriesResult.data ?? []) as DriverFinancialEntry[];
  const maintenancePercent = Math.max(0, Number(settingsResult.data?.maintenance_reserve_percent || 0));
  const goal = goalResult.data as FinanceGoalRow | null;

  const periodTrips = filterTripsByWindow(trips, financeWindow.startDate, financeWindow.endDate);
  const previousTrips = filterTripsByWindow(trips, financeWindow.previousStartDate, financeWindow.previousEndDate);
  const periodEntries = filterEntriesByWindow(entries, financeWindow.startDate, financeWindow.endDate);
  const summary = summarizeDriverFinance(periodTrips, maintenancePercent);
  const previousSummary = summarizeDriverFinance(previousTrips, maintenancePercent);
  const categories = buildExpenseCategoryTotals(periodEntries);
  const trend = buildDriverFinanceTrend(periodTrips);
  const maxTrend = Math.max(1, ...trend.map((item) => Math.abs(item.net)));
  const recentTrips = periodTrips.slice(0, 12);
  const exportParams = new URLSearchParams({ period: financeWindow.period, month: financeWindow.monthKey });

  return (
    <div className="page-stack driver-page driver-finance-dashboard">
      <PageHeader
        icon={<WalletCards size={24} />}
        eyebrow="MOTORISTA PROFISSIONAL"
        title="Financeiro profissional"
        description="Acompanhe faturamento, despesas, lucro, metas e eficiencia para saber quais servicos realmente valem a pena."
      />

      <section className="driver-finance-toolbar">
        <form className="driver-finance-period-form" method="get">
          <label>
            <span>Periodo</span>
            <select name="period" defaultValue={financeWindow.period}>
              <option value="month">Mes escolhido</option>
              <option value="previous_month">Mes anterior</option>
              <option value="30d">Ultimos 30 dias</option>
              <option value="90d">Ultimos 90 dias</option>
              <option value="year">Ano atual</option>
            </select>
          </label>
          <label>
            <span>Mes de referencia</span>
            <input type="month" name="month" defaultValue={financeWindow.monthKey} />
          </label>
          <button className="button button--secondary" type="submit"><CalendarDays size={17} />Aplicar</button>
        </form>

        <div className="driver-page-actions driver-finance-top-actions">
          <Link className="button button--primary" href="/motorista/financeiro/nova"><Plus size={18} />Registrar viagem</Link>
          <a className="button button--secondary" href={`/api/motorista/financeiro/export?${exportParams.toString()}`}><Download size={18} />Exportar CSV</a>
          <Link className="button button--ghost" href="/motorista/orcamentos"><ReceiptText size={18} />Orcamentos</Link>
        </div>
      </section>

      <div className="driver-finance-period-title">
        <div><span className="eyebrow">RESUMO DO PERIODO</span><h2>{financeWindow.label}</h2></div>
        <small>Comparacao: {financeWindow.previousLabel}</small>
      </div>

      <section className="driver-finance-stats">
        {metricCards(summary, previousSummary).map((metric) => {
          const Icon = metric.icon;
          return (
            <article className={metric.highlight ? "is-highlight" : ""} key={metric.label}>
              <Icon size={21} />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <ChangeIndicator current={metric.current} previous={metric.previous} inverse={metric.inverse} />
            </article>
          );
        })}
      </section>

      <section className="driver-finance-efficiency driver-finance-efficiency--professional">
        <article><span>Resultado por hora</span><strong>{formatCurrency(summary.resultPerHour)}</strong><small>Lucro liquido dividido pelas horas registradas.</small></article>
        <article><span>Resultado por km</span><strong>{formatCurrency(summary.resultPerKm)}</strong><small>Lucro liquido dividido pelos quilometros registrados.</small></article>
        <article><span>Ticket medio</span><strong>{formatCurrency(summary.averageTicket)}</strong><small>Faturamento medio por viagem concluida.</small></article>
        <article><span>Viagens concluidas</span><strong>{summary.completedTrips}</strong><small>{summary.activeTrips} servicos nao cancelados no periodo.</small></article>
      </section>

      <section className="driver-finance-professional-grid">
        <DriverFinanceGoalForm
          userId={userId}
          monthKey={financeWindow.monthKey}
          grossGoal={Number(goal?.gross_goal || 0)}
          netGoal={Number(goal?.net_goal || 0)}
          currentGross={summary.gross}
          currentNet={summary.net}
        />

        <article className="driver-finance-maintenance-card">
          <header><div className="driver-finance-goal-card__icon"><Wrench size={21} /></div><div><span className="eyebrow">RESERVA DE MANUTENCAO</span><h2>Proteja o resultado real</h2></div></header>
          <div className="driver-finance-maintenance-card__value"><strong>{formatCurrency(summary.maintenanceProvision)}</strong><span>{maintenancePercent.toFixed(1).replace(".", ",")}% do faturamento recebido</span></div>
          <div className="driver-finance-maintenance-card__adjusted"><span>Resultado apos provisionamento</span><strong>{formatCurrency(summary.adjustedNet)}</strong></div>
          <p>Essa reserva e uma estimativa gerencial. Ela nao cria uma despesa real e usa o percentual configurado pelo motorista.</p>
          <Link className="text-link" href="/motorista/configuracoes">Ajustar percentual <ArrowRight size={16} /></Link>
        </article>
      </section>

      <section className="driver-finance-analysis-grid">
        <article className="driver-finance-analysis-card">
          <header><div><span className="eyebrow">EVOLUCAO</span><h2>Resultado por dia</h2></div><BarChart3 size={21} /></header>
          {trend.length ? (
            <div className="driver-finance-trend" aria-label="Evolucao do resultado liquido">
              {trend.map((item) => {
                const height = Math.max(8, Math.abs(item.net) / maxTrend * 100);
                return (
                  <div key={item.key} title={`${item.label}: ${formatCurrency(item.net)}`}>
                    <span className={item.net < 0 ? "is-negative" : ""} style={{ height: `${height}%` }} />
                    <small>{item.label}</small>
                  </div>
                );
              })}
            </div>
          ) : <p className="driver-empty-copy">Conclua viagens no periodo para visualizar a evolucao.</p>}
        </article>

        <article className="driver-finance-analysis-card">
          <header><div><span className="eyebrow">DESPESAS</span><h2>Principais categorias</h2></div><TrendingDown size={21} /></header>
          {categories.length ? (
            <div className="driver-finance-category-list">
              {categories.slice(0, 7).map((item) => (
                <div key={item.category}>
                  <div><span>{item.label}</span><strong>{formatCurrency(item.amount)}</strong></div>
                  <i><b style={{ width: `${Math.max(3, item.percentage)}%` }} /></i>
                  <small>{item.percentage.toFixed(1).replace(".", ",")}% das despesas lancadas</small>
                </div>
              ))}
            </div>
          ) : <p className="driver-empty-copy">Nenhuma despesa lancada neste periodo.</p>}
        </article>
      </section>

      <section className="driver-recent-section">
        <div className="section-heading section-heading--inline"><div><span className="eyebrow">VIAGENS</span><h2>Registros do periodo</h2></div><Link className="text-link" href="/motorista/financeiro/nova">Nova viagem <ArrowRight size={17} /></Link></div>
        {recentTrips.length ? (
          <div className="driver-finance-trip-list">
            {recentTrips.map((trip) => (
              <article key={trip.id} className="driver-finance-trip-row">
                <Link href={`/motorista/financeiro/${trip.id}`} className="driver-finance-trip-row__link">
                  <div><strong>{[trip.origin, trip.destination].filter(Boolean).join(" → ") || trip.customer_name || "Viagem particular"}</strong><span>{trip.travel_date ? formatBrazilDate(trip.travel_date) : formatBrazilDate(trip.created_at)} · {DRIVER_TRIP_STATUS_LABELS[trip.status]}</span></div>
                  <div><strong>{formatCurrency(trip.net_result)}</strong><span className={`driver-payment-badge driver-payment-badge--${trip.payment_status}`}>{DRIVER_PAYMENT_STATUS_LABELS[trip.payment_status]}</span></div>
                  <ArrowRight size={18} />
                </Link>
                <DriverRecordDeleteButton kind="trip" recordId={trip.id} userId={userId} reservationId={trip.reservation_id} quoteId={trip.quote_id} />
              </article>
            ))}
          </div>
        ) : (
          <section className="empty-state"><Target size={32} /><h2>Nenhuma viagem neste periodo</h2><p>Altere o periodo ou registre uma viagem para iniciar o acompanhamento financeiro.</p><Link className="text-link" href="/motorista/financeiro/nova">Registrar agora <ArrowRight size={17} /></Link></section>
        )}
      </section>
    </div>
  );
}
