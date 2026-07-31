import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3, Gauge, Plus, ReceiptText, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import {
  DRIVER_PAYMENT_STATUS_LABELS,
  DRIVER_TRIP_STATUS_LABELS,
  driverTripMonthKey,
  formatCurrency,
  formatDriverHours,
  monthKeyInTimeZone,
  type DriverTrip,
} from "@/lib/driver";

export const metadata: Metadata = { title: "Controle financeiro do motorista" };
export const dynamic = "force-dynamic";

export default async function DriverFinancePage() {
  const { supabase, userId } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista/financeiro");

  const { data } = await supabase.from("driver_trips").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(250);
  const trips = (data ?? []) as DriverTrip[];
  const currentMonthKey = monthKeyInTimeZone(new Date());
  const monthTrips = trips.filter((trip) => driverTripMonthKey(trip) === currentMonthKey && trip.status === "completed");
  const gross = monthTrips.reduce((sum, trip) => sum + Number(trip.gross_revenue || 0), 0);
  const expenses = monthTrips.reduce((sum, trip) => sum + Number(trip.total_expenses || 0), 0);
  const net = monthTrips.reduce((sum, trip) => sum + Number(trip.net_result || 0), 0);
  const pending = monthTrips.reduce((sum, trip) => sum + Number(trip.pending_amount || 0), 0);
  const minutes = monthTrips.reduce((sum, trip) => sum + Number(trip.worked_minutes || 0), 0);
  const distance = monthTrips.reduce((sum, trip) => sum + Number(trip.distance_km || 0), 0);
  const resultPerHour = minutes > 0 ? net / (minutes / 60) : 0;
  const resultPerKm = distance > 0 ? net / distance : 0;

  return (
    <div className="page-stack driver-page">
      <PageHeader icon={<WalletCards size={24} />} eyebrow="MOTORISTA PROFISSIONAL" title="Controle financeiro" description="Registre viagens, pagamentos e despesas para saber quanto realmente sobrou no seu trabalho." />

      <div className="driver-page-actions driver-finance-top-actions"><Link className="button button--primary" href="/motorista/financeiro/nova"><Plus size={18} />Registrar viagem</Link><Link className="button button--secondary" href="/motorista/orcamentos"><ReceiptText size={18} />Ver orçamentos</Link></div>

      <section className="driver-finance-stats">
        <article><TrendingUp size={21} /><span>Recebido no mês</span><strong>{formatCurrency(gross)}</strong></article>
        <article><TrendingDown size={21} /><span>Despesas no mês</span><strong>{formatCurrency(expenses)}</strong></article>
        <article className="is-highlight"><WalletCards size={21} /><span>Resultado líquido</span><strong>{formatCurrency(net)}</strong></article>
        <article><ReceiptText size={21} /><span>A receber</span><strong>{formatCurrency(pending)}</strong></article>
        <article><Clock3 size={21} /><span>Horas trabalhadas</span><strong>{formatDriverHours(minutes)}</strong></article>
        <article><Gauge size={21} /><span>Quilômetros</span><strong>{distance.toFixed(1).replace(".", ",")} km</strong></article>
      </section>

      <section className="driver-finance-efficiency">
        <article><span>Resultado por hora</span><strong>{formatCurrency(resultPerHour)}</strong><small>Resultado líquido dividido pelas horas registradas.</small></article>
        <article><span>Resultado por km</span><strong>{formatCurrency(resultPerKm)}</strong><small>Resultado líquido dividido pela distância registrada.</small></article>
        <article><span>Viagens concluídas</span><strong>{monthTrips.length}</strong><small>Somente serviços concluídos entram no resumo mensal.</small></article>
      </section>

      <section className="driver-recent-section">
        <div className="section-heading section-heading--inline"><div><span className="eyebrow">VIAGENS</span><h2>Registros recentes</h2></div><Link className="text-link" href="/motorista/financeiro/nova">Nova viagem <ArrowRight size={17} /></Link></div>
        {trips.length ? (
          <div className="driver-finance-trip-list">
            {trips.slice(0, 12).map((trip) => (
              <Link href={`/motorista/financeiro/${trip.id}`} key={trip.id} className="driver-finance-trip-row">
                <div><strong>{[trip.origin, trip.destination].filter(Boolean).join(" → ") || trip.customer_name || "Viagem particular"}</strong><span>{trip.travel_date ? new Date(`${trip.travel_date}T12:00:00`).toLocaleDateString("pt-BR") : new Date(trip.created_at).toLocaleDateString("pt-BR")} · {DRIVER_TRIP_STATUS_LABELS[trip.status]}</span></div>
                <div><strong>{formatCurrency(trip.net_result)}</strong><span className={`driver-payment-badge driver-payment-badge--${trip.payment_status}`}>{DRIVER_PAYMENT_STATUS_LABELS[trip.payment_status]}</span></div>
                <ArrowRight size={18} />
              </Link>
            ))}
          </div>
        ) : <section className="empty-state"><WalletCards size={32} /><h2>Nenhuma viagem registrada</h2><p>Comece registrando uma viagem realizada ou transforme um orçamento em controle financeiro.</p><Link className="text-link" href="/motorista/financeiro/nova">Registrar agora <ArrowRight size={17} /></Link></section>}
      </section>
    </div>
  );
}
