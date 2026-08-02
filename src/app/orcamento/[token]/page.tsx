import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CalendarDays, Car, CheckCircle2, Clock3, FileText, MapPin, MessageCircle, ShieldCheck, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { respondDriverQuoteAction } from "@/app/orcamento/[token]/actions";
import { formatCurrency, TRIP_TYPE_LABELS } from "@/lib/driver";
import { formatBrazilDate, formatBrazilTime } from "@/lib/date-time";
import { DRIVER_QUOTE_STATUS_LABELS, normalizeQuoteLineItems, type PublicDriverQuotePayload } from "@/lib/driver-quote";
import { normalizeWhatsAppPhone } from "@/lib/driver-public";
import { PublicQuotePrintButton } from "@/components/PublicQuotePrintButton";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ resposta?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return { title: `Orçamento ${token.slice(0, 8).toUpperCase()}` };
}

export default async function PublicDriverQuotePage({ params, searchParams }: Props) {
  const { token } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_driver_quote", { quote_token: token });
  if (error || !data) notFound();

  const quote = data as PublicDriverQuotePayload;
  const items = normalizeQuoteLineItems(quote.line_items);
  const route = [quote.origin, quote.destination].filter(Boolean).join(" → ") || "Serviço particular";
  const validDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(quote.valid_until));
  const canRespond = ["sent", "viewed"].includes(quote.status);
  const accepted = quote.status === "accepted" || query.resposta === "accepted";
  const declined = quote.status === "declined" || query.resposta === "declined";
  const driverPhone = normalizeWhatsAppPhone(quote.driver.whatsapp_phone || "");
  const whatsappText = `Olá, ${quote.driver.display_name}! Estou falando sobre o orçamento ${quote.id.slice(0, 8).toUpperCase()} do JNE App.`;

  return (
    <main className="public-quote-page">
      <div className="public-quote-toolbar no-print">
        <span><ShieldCheck size={17} /> Proposta protegida pelo JNE App</span>
        <PublicQuotePrintButton />
      </div>

      <article className="public-quote-document">
        <header className="public-quote-header">
          <div className="public-quote-driver">
            {quote.driver.photo_url ? <img src={quote.driver.photo_url} alt="" /> : <span><Car size={28} /></span>}
            <div><small>ORÇAMENTO DE TRANSPORTE PARTICULAR</small><h1>{quote.driver.display_name}</h1><p>{quote.driver.headline || quote.driver.vehicle_name || "Motorista profissional"}</p></div>
          </div>
          <div className="public-quote-number"><span>PROPOSTA</span><strong>#{quote.id.slice(0, 8).toUpperCase()}</strong><small>{DRIVER_QUOTE_STATUS_LABELS[quote.status]}</small></div>
        </header>

        {accepted ? <section className="public-quote-result public-quote-result--accepted"><CheckCircle2 size={30} /><div><strong>Orçamento aceito</strong><p>O motorista recebeu sua confirmação e poderá concluir o agendamento.</p></div></section> : null}
        {declined ? <section className="public-quote-result public-quote-result--declined"><XCircle size={30} /><div><strong>Orçamento recusado</strong><p>Sua resposta foi registrada. Você ainda pode conversar com o motorista.</p></div></section> : null}
        {quote.status === "expired" ? <section className="public-quote-result public-quote-result--expired"><Clock3 size={30} /><div><strong>Orçamento expirado</strong><p>Peça ao motorista uma proposta atualizada antes de confirmar.</p></div></section> : null}
        {quote.status === "cancelled" ? <section className="public-quote-result public-quote-result--declined"><XCircle size={30} /><div><strong>Orçamento cancelado</strong><p>Esta proposta não está mais disponível para aceite.</p></div></section> : null}

        <section className="public-quote-summary-grid">
          <div><MapPin size={20} /><span>Rota ou serviço</span><strong>{route}</strong></div>
          <div><CalendarDays size={20} /><span>Data e horário</span><strong>{quote.travel_date ? formatBrazilDate(quote.travel_date) : "A combinar"}{quote.travel_time ? ` às ${formatBrazilTime(quote.travel_time)}` : ""}</strong></div>
          <div><Car size={20} /><span>Tipo de atendimento</span><strong>{TRIP_TYPE_LABELS[quote.trip_type]}</strong></div>
          <div><Clock3 size={20} /><span>Validade</span><strong>{validDate}</strong></div>
        </section>

        <section className="public-quote-section">
          <div className="public-quote-section__heading"><FileText size={21} /><div><span>COMPOSIÇÃO</span><h2>Detalhes do valor</h2></div></div>
          <div className="public-quote-items">
            {items.length ? items.map((item, index) => <div key={`${item.kind}-${index}`}><span>{item.label}</span><strong className={item.amount < 0 ? "is-discount" : ""}>{item.amount < 0 ? "− " : ""}{formatCurrency(Math.abs(item.amount))}</strong></div>) : <div><span>Serviço de transporte</span><strong>{formatCurrency(quote.rounded_total)}</strong></div>}
          </div>
          <div className="public-quote-total"><span>VALOR TOTAL PROPOSTO</span><strong>{formatCurrency(quote.rounded_total)}</strong></div>
        </section>

        {quote.notes ? <section className="public-quote-note"><span>Observações</span><p>{quote.notes}</p></section> : null}
        {quote.conditions ? <section className="public-quote-note"><span>Condições da proposta</span><p>{quote.conditions}</p></section> : null}

        <section className="public-quote-driver-info">
          <BadgeCheck size={24} />
          <div><span>MOTORISTA</span><strong>{quote.driver.display_name}</strong><p>{[quote.driver.vehicle_name, quote.driver.vehicle_details, quote.driver.service_area || quote.driver.city].filter(Boolean).join(" · ")}</p></div>
        </section>

        {canRespond ? (
          <section className="public-quote-decision no-print">
            <div><span className="eyebrow">SUA RESPOSTA</span><h2>A proposta atende ao que você precisa?</h2><p>Aceitar confirma seu interesse e cria ou atualiza a reserva com o motorista. Nenhum pagamento será cobrado nesta tela.</p></div>
            <form action={respondDriverQuoteAction}>
              <input type="hidden" name="token" value={token} />
              <label><span>Mensagem ao motorista (opcional)</span><textarea name="message" rows={3} maxLength={500} placeholder="Ex.: Pode confirmar para esse horário." /></label>
              <div className="public-quote-decision__actions">
                <button className="button button--primary" type="submit" name="decision" value="accepted"><CheckCircle2 size={19} /> Aceitar orçamento</button>
                <button className="button button--secondary" type="submit" name="decision" value="declined"><XCircle size={19} /> Recusar</button>
              </div>
            </form>
          </section>
        ) : null}

        <footer className="public-quote-footer">
          <p>Este documento registra uma proposta comercial de transporte particular. O aceite não realiza cobrança e está sujeito à confirmação operacional do motorista.</p>
          <span>Gerado pelo JNE App · visualizações: {quote.view_count}</span>
        </footer>
      </article>

      {driverPhone ? <div className="public-quote-mobile-contact no-print"><a className="button button--primary" href={`https://wa.me/${driverPhone}?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer"><MessageCircle size={19} /> Falar com o motorista</a>{quote.driver.slug ? <Link className="button button--secondary" href={`/m/${quote.driver.slug}`}>Ver perfil</Link> : null}</div> : null}
    </main>
  );
}
