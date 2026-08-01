import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock3, FileDown, Gauge, ReceiptText, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { DriverFinancialEntryDeleteButton } from "@/components/DriverFinancialEntryDeleteButton";
import { DriverFinancialEntryForm } from "@/components/DriverFinancialEntryForm";
import { DriverTripActions } from "@/components/DriverTripActions";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import {
  DRIVER_FINANCIAL_CATEGORY_LABELS,
  DRIVER_PAYMENT_METHOD_LABELS,
  DRIVER_PAYMENT_STATUS_LABELS,
  formatCurrency,
  formatDriverHours,
  type DriverFinancialEntry,
  type DriverTrip,
} from "@/lib/driver";

export const metadata: Metadata = { title: "Detalhes da viagem" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ tripId: string }> };

export default async function DriverTripDetailPage({ params }: Props) {
  const { tripId } = await params;
  const { supabase, userId } = await getAuthContext();
  if (!userId) redirect(`/entrar?next=/motorista/financeiro/${tripId}`);

  const [{ data: tripData }, { data: entriesData }] = await Promise.all([
    supabase.from("driver_trips").select("*").eq("id", tripId).eq("user_id", userId).maybeSingle(),
    supabase.from("driver_financial_entries").select("*").eq("trip_id", tripId).eq("user_id", userId).order("occurred_at", { ascending: false }),
  ]);
  if (!tripData) notFound();
  const trip = tripData as DriverTrip;
  const entries = (entriesData ?? []) as DriverFinancialEntry[];
  const route = [trip.origin, trip.destination].filter(Boolean).join(" → ") || trip.customer_name || "Viagem particular";
  const resultPerHour = trip.worked_minutes > 0 ? Number(trip.net_result) / (Number(trip.worked_minutes) / 60) : 0;
  const resultPerKm = trip.distance_km > 0 ? Number(trip.net_result) / Number(trip.distance_km) : 0;

  return (
    <div className="page-stack driver-page">
      <Link className="text-link driver-back-link" href="/motorista/financeiro"><ArrowLeft size={17} />Voltar ao financeiro</Link>
      <PageHeader icon={<WalletCards size={24} />} eyebrow="DETALHES DA VIAGEM" title={route} description={trip.travel_date ? `Data: ${new Date(`${trip.travel_date}T12:00:00`).toLocaleDateString("pt-BR")}` : "Data não informada"} />
      <div className="driver-page-actions no-print"><Link className="button button--secondary" href={`/motorista/financeiro/${trip.id}/recibo`}><FileDown size={18} /> Gerar recibo / PDF</Link>{trip.reservation_id ? <Link className="button button--ghost" href={`/motorista/reservas/${trip.reservation_id}`}>Abrir reserva</Link> : null}</div>

      <section className="driver-trip-summary-grid">
        <article><ReceiptText size={20} /><span>Valor combinado</span><strong>{formatCurrency(trip.agreed_amount)}</strong></article>
        <article><TrendingUp size={20} /><span>Recebido</span><strong>{formatCurrency(trip.gross_revenue)}</strong></article>
        <article><TrendingDown size={20} /><span>Despesas</span><strong>{formatCurrency(trip.total_expenses)}</strong></article>
        <article className="is-highlight"><WalletCards size={20} /><span>Resultado líquido</span><strong>{formatCurrency(trip.net_result)}</strong></article>
        <article><Clock3 size={20} /><span>Tempo trabalhado</span><strong>{formatDriverHours(trip.worked_minutes)}</strong></article>
        <article><Gauge size={20} /><span>Distância</span><strong>{Number(trip.distance_km).toFixed(1).replace(".", ",")} km</strong></article>
      </section>

      <section className="driver-trip-secondary-summary">
        <div><span>A receber</span><strong>{formatCurrency(trip.pending_amount)}</strong></div>
        <div><span>Situação do pagamento</span><strong className={`driver-payment-badge driver-payment-badge--${trip.payment_status}`}>{DRIVER_PAYMENT_STATUS_LABELS[trip.payment_status]}</strong></div>
        <div><span>Resultado por hora</span><strong>{formatCurrency(resultPerHour)}</strong></div>
        <div><span>Resultado por km</span><strong>{formatCurrency(resultPerKm)}</strong></div>
      </section>

      <div className="driver-finance-detail-grid">
        <div className="driver-finance-main-column">
          <section className="driver-finance-panel">
            <div><span className="eyebrow">LANÇAMENTOS</span><h2>Receitas e despesas</h2></div>
            <DriverFinancialEntryForm tripId={trip.id} userId={userId} />
          </section>

          <section className="driver-finance-panel">
            <div><span className="eyebrow">HISTÓRICO</span><h2>Movimentações</h2></div>
            {entries.length ? <div className="driver-entry-list">{entries.map((entry) => (
              <article key={entry.id} className={`driver-entry-row driver-entry-row--${entry.entry_type}`}>
                <div><strong>{DRIVER_FINANCIAL_CATEGORY_LABELS[entry.category]}</strong><span>{new Date(entry.occurred_at).toLocaleDateString("pt-BR")}{entry.payment_method ? ` · ${DRIVER_PAYMENT_METHOD_LABELS[entry.payment_method]}` : ""}</span>{entry.description ? <small>{entry.description}</small> : null}</div>
                <b>{entry.entry_type === "income" ? "+" : "−"}{formatCurrency(entry.amount)}</b>
                <DriverFinancialEntryDeleteButton entryId={entry.id} tripId={trip.id} />
              </article>
            ))}</div> : <p className="driver-empty-copy">Nenhum lançamento registrado.</p>}
          </section>
        </div>

        <aside className="driver-finance-side-column">
          <DriverTripActions tripId={trip.id} initialStatus={trip.status} reservationId={trip.reservation_id} quoteId={trip.quote_id} />
          {trip.notes ? <section className="driver-finance-panel"><span className="eyebrow">OBSERVAÇÕES</span><p className="driver-trip-notes">{trip.notes}</p></section> : null}
        </aside>
      </div>
    </div>
  );
}
