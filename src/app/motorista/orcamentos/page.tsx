import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Eye, FileDown, FileText, Filter, Plus, RotateCcw, Search, TrendingUp, WalletCards } from "lucide-react";
import { redirect } from "next/navigation";
import { DriverQuoteShareButton } from "@/components/DriverQuoteShareButton";
import { DriverRecordDeleteButton } from "@/components/DriverRecordDeleteButton";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import { formatCurrency, TRIP_TYPE_LABELS, type DriverQuote, type DriverQuoteStatus } from "@/lib/driver";
import { DRIVER_QUOTE_STATUS_LABELS, driverQuoteIsExpired, driverQuoteRoute } from "@/lib/driver-quote";
import { formatBrazilDate } from "@/lib/date-time";

export const metadata: Metadata = { title: "Meus orçamentos" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; status?: string }> };

export default async function DriverQuotesPage({ searchParams }: Props) {
  const filters = await searchParams;
  const { supabase, userId } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista/orcamentos");
  const [{ data }, { data: tripLinks }] = await Promise.all([
    supabase.from("driver_quotes").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(300),
    supabase.from("driver_trips").select("quote_id").eq("user_id", userId).not("quote_id", "is", null),
  ]);
  const quotes = (data ?? []) as DriverQuote[];
  const converted = new Set((tripLinks ?? []).map((item: { quote_id: string | null }) => item.quote_id).filter(Boolean));
  const validStatuses = new Set<DriverQuoteStatus>(Object.keys(DRIVER_QUOTE_STATUS_LABELS) as DriverQuoteStatus[]);
  const status = validStatuses.has(filters.status as DriverQuoteStatus) ? filters.status as DriverQuoteStatus : "all";
  const query = (filters.q || "").trim().toLocaleLowerCase("pt-BR");
  const normalizedQuotes = quotes.map((quote) => driverQuoteIsExpired(quote) && ["sent", "viewed"].includes(quote.status) ? { ...quote, status: "expired" as const } : quote);
  const filtered = normalizedQuotes.filter((quote) => {
    if (status !== "all" && quote.status !== status) return false;
    if (!query) return true;
    return [quote.customer_name, quote.customer_phone, quote.origin, quote.destination, quote.notes]
      .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").includes(query);
  });
  const sentOrViewed = normalizedQuotes.filter((quote) => ["sent", "viewed", "accepted", "declined"].includes(quote.status));
  const acceptedCount = normalizedQuotes.filter((quote) => quote.status === "accepted").length;
  const conversion = sentOrViewed.length ? Math.round(acceptedCount / sentOrViewed.length * 100) : 0;
  const potential = normalizedQuotes.filter((quote) => ["sent", "viewed", "accepted"].includes(quote.status)).reduce((total, quote) => total + Number(quote.rounded_total || 0), 0);
  const hasFilters = Boolean(query || status !== "all");

  return (
    <div className="page-stack driver-page">
      <PageHeader icon={<FileText size={24} />} eyebrow="MOTORISTA PROFISSIONAL" title="Orçamentos profissionais" description="Crie propostas com validade, acompanhe visualizações e receba o aceite do passageiro pelo celular." />
      <div className="driver-page-actions"><Link className="button button--secondary" href="/motorista/financeiro"><WalletCards size={18} />Financeiro</Link><Link className="button button--primary" href="/motorista/orcamentos/novo"><Plus size={18} /> Novo orçamento</Link></div>

      <section className="driver-quote-metrics">
        <article><FileText size={21} /><span>Total</span><strong>{quotes.length}</strong></article>
        <article><Eye size={21} /><span>Visualizados</span><strong>{normalizedQuotes.filter((quote) => quote.view_count > 0).length}</strong></article>
        <article><CheckCircle2 size={21} /><span>Aceitos</span><strong>{acceptedCount}</strong></article>
        <article><TrendingUp size={21} /><span>Conversão</span><strong>{conversion}%</strong></article>
        <article><WalletCards size={21} /><span>Potencial ativo</span><strong>{formatCurrency(potential)}</strong></article>
      </section>

      <form className="driver-quote-filters" method="get">
        <label className="driver-reservation-search"><Search size={18} /><input name="q" defaultValue={filters.q || ""} placeholder="Cliente, telefone, origem ou destino" /></label>
        <label><span>Situação</span><select name="status" defaultValue={status}><option value="all">Todas</option>{(Object.keys(DRIVER_QUOTE_STATUS_LABELS) as DriverQuoteStatus[]).map((item) => <option key={item} value={item}>{DRIVER_QUOTE_STATUS_LABELS[item]}</option>)}</select></label>
        <button className="button button--primary" type="submit"><Filter size={17} /> Aplicar</button>
        {hasFilters ? <Link className="button button--secondary" href="/motorista/orcamentos"><RotateCcw size={17} /> Limpar</Link> : null}
      </form>

      {filtered.length ? (
        <section className="driver-quotes-list">
          {filtered.map((quote) => (
            <article key={quote.id} className={`driver-quote-row driver-quote-row--finance driver-quote-row--${quote.status}`}>
              <div className="driver-quote-row__main">
                <Link className="driver-quote-title-link" href={`/motorista/orcamentos/${quote.id}`}>{driverQuoteRoute(quote)}</Link>
                <span>{quote.customer_name || "Passageiro não informado"} · {TRIP_TYPE_LABELS[quote.trip_type]}</span>
                <small>{formatBrazilDate(quote.created_at)}{quote.travel_date ? ` · viagem em ${formatBrazilDate(quote.travel_date)}` : ""}</small>
              </div>
              <div className="driver-quote-row__value"><strong>{formatCurrency(quote.rounded_total)}</strong><span className={`driver-quote-status driver-quote-status--${quote.status}`}>{quote.status === "expired" ? <Clock3 size={14} /> : null}{DRIVER_QUOTE_STATUS_LABELS[quote.status]}</span>{quote.view_count ? <small>{quote.view_count} visualizaç{quote.view_count === 1 ? "ão" : "ões"}</small> : null}</div>
              <div className="driver-quote-row__actions"><Link className="icon-button" href={`/motorista/orcamentos/${quote.id}`} aria-label="Abrir orçamento" title="Abrir orçamento"><FileDown size={18} /></Link><DriverQuoteShareButton quote={quote} />{converted.has(quote.id) ? <span className="driver-quote-converted">Registrada</span> : quote.status === "accepted" ? <Link className="button button--ghost driver-quote-finance-link" href={`/motorista/financeiro/nova?quote=${quote.id}${quote.reservation_id ? `&reservation=${quote.reservation_id}` : ""}`}><WalletCards size={16} />Registrar viagem</Link> : null}<DriverRecordDeleteButton kind="quote" recordId={quote.id} userId={userId} linkedTrip={converted.has(quote.id)} /></div>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state"><FileText size={32} /><h2>{hasFilters ? "Nenhum orçamento encontrado" : "Nenhum orçamento salvo"}</h2><p>{hasFilters ? "Revise os filtros ou limpe a busca." : "Crie sua primeira proposta profissional para enviar ao passageiro."}</p><Link className="text-link" href={hasFilters ? "/motorista/orcamentos" : "/motorista/orcamentos/novo"}>{hasFilters ? "Limpar filtros" : "Criar orçamento"} <ArrowRight size={17} /></Link></section>
      )}
    </div>
  );
}
