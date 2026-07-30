import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { DriverQuoteShareButton } from "@/components/DriverQuoteShareButton";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import { formatCurrency, TRIP_TYPE_LABELS, type DriverQuote } from "@/lib/driver";

export const metadata: Metadata = { title: "Meus orçamentos" };
export const dynamic = "force-dynamic";

export default async function DriverQuotesPage() {
  const { supabase, userId } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista/orcamentos");
  const { data } = await supabase.from("driver_quotes").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  const quotes = (data ?? []) as DriverQuote[];

  return (
    <div className="page-stack driver-page">
      <PageHeader icon={<FileText size={24} />} eyebrow="MOTORISTA PROFISSIONAL" title="Meus orçamentos" description="Consulte, compartilhe e reutilize as referências que você já calculou." />
      <div className="driver-page-actions"><Link className="button button--primary" href="/motorista/calculadora"><Plus size={18} /> Novo orçamento</Link></div>
      {quotes.length ? (
        <section className="driver-quotes-list">
          {quotes.map((quote) => (
            <article key={quote.id} className="driver-quote-row">
              <div className="driver-quote-row__main">
                <strong>{[quote.origin, quote.destination].filter(Boolean).join(" → ") || quote.customer_name || "Viagem particular"}</strong>
                <span>{TRIP_TYPE_LABELS[quote.trip_type]} · {quote.total_distance_km.toFixed(1).replace(".", ",")} km</span>
                <small>{new Date(quote.created_at).toLocaleDateString("pt-BR")} {quote.travel_date ? `· viagem em ${new Date(`${quote.travel_date}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}</small>
              </div>
              <div className="driver-quote-row__value"><strong>{formatCurrency(quote.rounded_total)}</strong><span>{quote.status}</span></div>
              <DriverQuoteShareButton quote={quote} />
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state"><FileText size={32} /><h2>Nenhum orçamento salvo</h2><p>Use a calculadora para criar sua primeira referência profissional.</p><Link className="text-link" href="/motorista/calculadora">Abrir calculadora <ArrowRight size={17} /></Link></section>
      )}
    </div>
  );
}
