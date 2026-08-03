import type { Metadata } from "next";
import { SmartBackButton } from "@/components/SmartBackButton";
import Link from "next/link";
import { CalendarDays, Car, CheckCircle2, Clock3, Eye, FileText, Link2, MapPin, MessageCircle, UserRound, WalletCards } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { DriverDocumentActions } from "@/components/DriverDocumentActions";
import { DriverQuoteWorkflowActions } from "@/components/DriverQuoteWorkflowActions";
import { requireDriverFeature } from "@/lib/account-plan";
import { formatCurrency, TRIP_TYPE_LABELS, type DriverQuote } from "@/lib/driver";
import { DRIVER_QUOTE_STATUS_LABELS, driverQuoteIsExpired, driverQuotePublicUrl, driverQuoteRoute, driverQuoteWhatsAppUrl, normalizeQuoteLineItems, type DriverQuoteEvent } from "@/lib/driver-quote";
import type { DriverPublicProfile, DriverReservation } from "@/lib/driver-public";
import { formatBrazilDate, formatBrazilDateTime, formatBrazilTime } from "@/lib/date-time";

export const metadata: Metadata = { title: "Orçamento de viagem" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ quoteId: string }> };

const EVENT_LABELS: Record<string, string> = {
  quote_created: "Orçamento criado",
  quote_created_and_sent: "Orçamento criado e preparado para envio",
  quote_updated: "Orçamento atualizado",
  quote_viewed: "Passageiro visualizou a proposta",
  passenger_accepted: "Passageiro aceitou a proposta",
  passenger_declined: "Passageiro recusou a proposta",
  quote_converted_to_reservation: "Orçamento convertido em reserva",
  driver_marked_sent: "Motorista marcou como enviado",
  driver_marked_accepted: "Motorista confirmou o aceite",
  driver_marked_cancelled: "Motorista cancelou a proposta",
  driver_marked_draft: "Motorista reabriu o rascunho",
};

export default async function DriverQuoteDocumentPage({ params }: Props) {
  const { quoteId } = await params;
  const { supabase, userId, profile } = await requireDriverFeature("quotes", `/motorista/orcamentos/${quoteId}`);

  const [{ data: quoteData }, { data: publicProfileData }, { data: reservationData }, { data: tripData }, { data: eventData }] = await Promise.all([
    supabase.from("driver_quotes").select("*").eq("id", quoteId).eq("user_id", userId).maybeSingle(),
    supabase.from("driver_public_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("driver_reservations").select("*").eq("quote_id", quoteId).eq("driver_user_id", userId).maybeSingle(),
    supabase.from("driver_trips").select("id,status").eq("quote_id", quoteId).eq("user_id", userId).maybeSingle(),
    supabase.from("driver_quote_events").select("*").eq("quote_id", quoteId).eq("driver_user_id", userId).order("created_at", { ascending: false }).limit(100),
  ]);
  if (!quoteData) notFound();

  const rawQuote = quoteData as DriverQuote;
  const quote = driverQuoteIsExpired(rawQuote) && ["sent", "viewed"].includes(rawQuote.status) ? { ...rawQuote, status: "expired" as const } : rawQuote;
  const publicProfile = publicProfileData as DriverPublicProfile | null;
  const reservation = reservationData as DriverReservation | null;
  const events = (eventData ?? []) as DriverQuoteEvent[];
  const driverName = publicProfile?.display_name || profile?.full_name || "Motorista profissional";
  const route = driverQuoteRoute(quote);
  const createdDate = formatBrazilDate(quote.created_at);
  const travelDate = quote.travel_date ? formatBrazilDate(quote.travel_date) : "A combinar";
  const publicUrl = driverQuotePublicUrl(quote.public_token);
  const items = normalizeQuoteLineItems(quote.line_items);
  const shareText = [
    `Orçamento de viagem — ${driverName}`,
    `Cliente: ${quote.customer_name || "Não informado"}`,
    `Rota: ${route}`,
    `Data: ${travelDate}${quote.travel_time ? ` às ${formatBrazilTime(quote.travel_time)}` : ""}`,
    `Serviço: ${TRIP_TYPE_LABELS[quote.trip_type]}`,
    `Valor: ${formatCurrency(quote.rounded_total)}`,
    quote.status !== "draft" ? `Visualizar e responder: ${publicUrl}` : null,
    quote.notes ? `Observações: ${quote.notes}` : null,
  ].filter(Boolean).join("\n");

  return (
    <div className="driver-document-page">
      <div className="driver-document-toolbar no-print">
        <SmartBackButton className="text-link" fallbackHref="/motorista/orcamentos" label="Voltar aos orçamentos" />
        <DriverDocumentActions title="Orçamento de viagem" text={shareText} whatsappPhone={quote.customer_phone || reservation?.passenger_phone} />
      </div>

      <section className="driver-quote-control-panel no-print">
        <div className="driver-quote-control-panel__status">
          <span className={`driver-quote-status driver-quote-status--${quote.status}`}>{DRIVER_QUOTE_STATUS_LABELS[quote.status]}</span>
          <div><strong>{quote.customer_name || "Passageiro"}</strong><small>Versão {quote.version} · {quote.view_count} visualizaç{quote.view_count === 1 ? "ão" : "ões"}</small></div>
        </div>
        <div className="driver-quote-control-panel__links">
          {quote.status !== "draft" ? <Link className="button button--secondary" href={publicUrl} target="_blank"><Link2 size={17} /> Abrir link público</Link> : null}
          {quote.status !== "draft" && quote.customer_phone ? <a className="button button--primary" href={driverQuoteWhatsAppUrl(quote)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Enviar no WhatsApp</a> : null}
        </div>
        <DriverQuoteWorkflowActions quote={quote} />
      </section>

      <article className="driver-print-document driver-print-document--professional-quote">
        <header className="driver-print-document__header">
          <div className="driver-print-document__brand"><Car size={32} /><div><span>JNE APP</span><strong>{driverName}</strong><small>{publicProfile?.headline || "Motorista profissional"}</small></div></div>
          <div className="driver-print-document__number"><span>ORÇAMENTO</span><strong>#{quote.id.slice(0, 8).toUpperCase()}</strong><small>Emitido em {createdDate}</small></div>
        </header>

        <section className="driver-print-document__intro">
          <div><UserRound size={20} /><span>Passageiro</span><strong>{quote.customer_name || reservation?.passenger_name || "Não informado"}</strong></div>
          <div><CalendarDays size={20} /><span>Data da viagem</span><strong>{travelDate}{quote.travel_time ? ` às ${formatBrazilTime(quote.travel_time)}` : ""}</strong></div>
          <div><MapPin size={20} /><span>Rota</span><strong>{route}</strong></div>
        </section>

        <section className="driver-print-document__section">
          <h2><FileText size={20} /> Composição da proposta</h2>
          <dl className="driver-print-document__rows">
            {items.length ? items.map((item, index) => <div key={`${item.kind}-${index}`}><dt>{item.label}</dt><dd className={item.amount < 0 ? "is-discount" : ""}>{item.amount < 0 ? "− " : ""}{formatCurrency(Math.abs(item.amount))}</dd></div>) : <><div><dt>Tipo de viagem</dt><dd>{TRIP_TYPE_LABELS[quote.trip_type]}</dd></div><div><dt>Distância estimada</dt><dd>{Number(quote.total_distance_km).toFixed(1).replace(".", ",")} km</dd></div><div><dt>Tempo faturável</dt><dd>{Number(quote.billable_hours).toFixed(1).replace(".", ",")} h</dd></div></>}
          </dl>
        </section>

        <section className="driver-print-document__total"><span>Valor total proposto</span><strong>{formatCurrency(quote.rounded_total)}</strong></section>

        {quote.notes ? <section className="driver-print-document__notes"><span>Observações</span><p>{quote.notes}</p></section> : null}
        {quote.conditions ? <section className="driver-print-document__notes"><span>Condições</span><p>{quote.conditions}</p></section> : null}

        <section className="driver-quote-validity"><Clock3 size={18} /><span>Proposta válida até</span><strong>{formatBrazilDateTime(quote.valid_until)}</strong></section>

        <footer className="driver-print-document__footer"><p>O aceite registra o interesse do passageiro e não realiza cobrança. Alterações de rota, tempo de espera ou despesas não previstas podem modificar o valor final.</p><p>Gerado pelo JNE App.</p></footer>
      </article>

      {quote.response_message ? <section className="driver-quote-response-card no-print"><CheckCircle2 size={22} /><div><span>RESPOSTA DO PASSAGEIRO</span><strong>{DRIVER_QUOTE_STATUS_LABELS[quote.status]}</strong><p>{quote.response_message}</p><small>{quote.responded_at ? formatBrazilDateTime(quote.responded_at) : ""}</small></div></section> : null}

      <div className="driver-document-next-actions no-print">
        {tripData ? <Link className="button button--primary" href={`/motorista/financeiro/${tripData.id}`}>Abrir viagem registrada</Link> : quote.status === "accepted" ? <Link className="button button--primary" href={`/motorista/financeiro/nova?quote=${quote.id}${quote.reservation_id ? `&reservation=${quote.reservation_id}` : ""}`}><WalletCards size={18} /> Registrar no financeiro</Link> : null}
        {reservation || quote.reservation_id ? <Link className="button button--secondary" href={`/motorista/reservas/${reservation?.id || quote.reservation_id}`}>Abrir reserva</Link> : null}
      </div>

      <section className="driver-quote-history no-print">
        <div className="section-heading"><span className="eyebrow">HISTÓRICO</span><h2>Movimentações da proposta</h2><p>Criação, edições, visualização e resposta ficam registradas.</p></div>
        {events.length ? <div className="driver-quote-history__list">{events.map((event) => <article key={event.id}><span className={`driver-quote-history__dot driver-quote-history__dot--${event.actor_type}`} /><div><strong>{EVENT_LABELS[event.event_type] || event.event_type.replaceAll("_", " ")}</strong><small>{formatBrazilDateTime(event.created_at)} · {event.actor_type === "passenger" ? "passageiro" : event.actor_type === "driver" ? "motorista" : "sistema"}</small></div>{event.new_status ? <span>{DRIVER_QUOTE_STATUS_LABELS[event.new_status]}</span> : null}</article>)}</div> : <p className="driver-help-text">O histórico começará a aparecer após a migration da versão 1.15.0.</p>}
      </section>
    </div>
  );
}
