import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Car, FileText, MapPin, UserRound } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { DriverDocumentActions } from "@/components/DriverDocumentActions";
import { getAuthContext } from "@/lib/auth";
import { formatCurrency, TRIP_TYPE_LABELS, type DriverQuote } from "@/lib/driver";
import type { DriverPublicProfile, DriverReservation } from "@/lib/driver-public";

export const metadata: Metadata = { title: "Orçamento de viagem" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ quoteId: string }> };

export default async function DriverQuoteDocumentPage({ params }: Props) {
  const { quoteId } = await params;
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) redirect(`/entrar?next=/motorista/orcamentos/${quoteId}`);

  const [{ data: quoteData }, { data: publicProfileData }, { data: reservationData }, { data: tripData }] = await Promise.all([
    supabase.from("driver_quotes").select("*").eq("id", quoteId).eq("user_id", userId).maybeSingle(),
    supabase.from("driver_public_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("driver_reservations").select("*").eq("quote_id", quoteId).eq("driver_user_id", userId).maybeSingle(),
    supabase.from("driver_trips").select("id,status").eq("quote_id", quoteId).eq("user_id", userId).maybeSingle(),
  ]);
  if (!quoteData) notFound();

  const quote = quoteData as DriverQuote;
  const publicProfile = publicProfileData as DriverPublicProfile | null;
  const reservation = reservationData as DriverReservation | null;
  const driverName = publicProfile?.display_name || profile?.full_name || "Motorista profissional";
  const route = [quote.origin, quote.destination].filter(Boolean).join(" → ") || "Viagem particular";
  const createdDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(new Date(quote.created_at));
  const travelDate = quote.travel_date ? new Date(`${quote.travel_date}T12:00:00`).toLocaleDateString("pt-BR") : "A combinar";
  const shareText = [
    `Orçamento de viagem — ${driverName}`,
    `Cliente: ${quote.customer_name || "Não informado"}`,
    `Rota: ${route}`,
    `Data: ${travelDate}`,
    `Serviço: ${TRIP_TYPE_LABELS[quote.trip_type]}`,
    `Valor: ${formatCurrency(quote.rounded_total)}`,
    quote.notes ? `Observações: ${quote.notes}` : null,
    "Este orçamento está sujeito à confirmação de disponibilidade.",
  ].filter(Boolean).join("\n");

  return (
    <div className="driver-document-page">
      <div className="driver-document-toolbar no-print">
        <Link className="text-link" href="/motorista/orcamentos"><ArrowLeft size={17} /> Voltar aos orçamentos</Link>
        <DriverDocumentActions title="Orçamento de viagem" text={shareText} whatsappPhone={reservation?.passenger_phone} />
      </div>

      <article className="driver-print-document">
        <header className="driver-print-document__header">
          <div className="driver-print-document__brand"><Car size={32} /><div><span>JNE APP</span><strong>{driverName}</strong><small>Motorista profissional</small></div></div>
          <div className="driver-print-document__number"><span>ORÇAMENTO</span><strong>#{quote.id.slice(0, 8).toUpperCase()}</strong><small>Emitido em {createdDate}</small></div>
        </header>

        <section className="driver-print-document__intro">
          <div><UserRound size={20} /><span>Passageiro</span><strong>{quote.customer_name || reservation?.passenger_name || "Não informado"}</strong></div>
          <div><CalendarDays size={20} /><span>Data da viagem</span><strong>{travelDate}</strong></div>
          <div><MapPin size={20} /><span>Rota</span><strong>{route}</strong></div>
        </section>

        <section className="driver-print-document__section">
          <h2><FileText size={20} /> Resumo do serviço</h2>
          <dl className="driver-print-document__rows">
            <div><dt>Tipo de viagem</dt><dd>{TRIP_TYPE_LABELS[quote.trip_type]}</dd></div>
            <div><dt>Distância estimada</dt><dd>{Number(quote.total_distance_km).toFixed(1).replace(".", ",")} km</dd></div>
            <div><dt>Tempo faturável</dt><dd>{Number(quote.billable_hours).toFixed(1).replace(".", ",")} h</dd></div>
            {Number(quote.direct_costs) > 0 ? <div><dt>Pedágios e extras</dt><dd>{formatCurrency(quote.direct_costs)}</dd></div> : null}
            {Number(quote.discount) > 0 ? <div><dt>Desconto</dt><dd>− {formatCurrency(quote.discount)}</dd></div> : null}
          </dl>
        </section>

        <section className="driver-print-document__total"><span>Valor total proposto</span><strong>{formatCurrency(quote.rounded_total)}</strong></section>

        {quote.notes ? <section className="driver-print-document__notes"><span>Observações</span><p>{quote.notes}</p></section> : null}

        <footer className="driver-print-document__footer">
          <p>Orçamento sujeito à disponibilidade e à confirmação do motorista. Alterações de rota, tempo de espera ou despesas não previstas podem modificar o valor final.</p>
          <p>Gerado pelo JNE App.</p>
        </footer>
      </article>

      <div className="driver-document-next-actions no-print">
        {tripData ? <Link className="button button--primary" href={`/motorista/financeiro/${tripData.id}`}>Abrir viagem registrada</Link> : <Link className="button button--primary" href={`/motorista/financeiro/nova?quote=${quote.id}${reservation ? `&reservation=${reservation.id}` : ""}`}>Transformar em viagem</Link>}
        {reservation ? <Link className="button button--secondary" href={`/motorista/reservas/${reservation.id}`}>Voltar à reserva</Link> : null}
      </div>
    </div>
  );
}
