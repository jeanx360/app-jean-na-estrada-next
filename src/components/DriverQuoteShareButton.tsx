"use client";

import { Share2 } from "lucide-react";
import { formatCurrency, TRIP_TYPE_LABELS, type DriverQuote } from "@/lib/driver";
import { driverQuotePublicUrl, driverQuoteRoute } from "@/lib/driver-quote";
import { formatBrazilDate } from "@/lib/date-time";

export function DriverQuoteShareButton({ quote }: { quote: DriverQuote }) {
  async function share() {
    const publicUrl = quote.public_token ? driverQuotePublicUrl(quote.public_token) : "";
    const text = [
      `Orçamento de viagem — ${quote.customer_name || "passageiro"}`,
      `Rota/serviço: ${driverQuoteRoute(quote)}`,
      `Serviço: ${TRIP_TYPE_LABELS[quote.trip_type]}`,
      quote.travel_date ? `Data: ${formatBrazilDate(quote.travel_date)}` : null,
      `Valor total: ${formatCurrency(quote.rounded_total)}`,
      publicUrl && quote.status !== "draft" ? `Veja os detalhes e responda: ${publicUrl}` : null,
      quote.notes ? `Observações: ${quote.notes}` : null,
    ].filter(Boolean).join("\n");

    try {
      if (navigator.share) await navigator.share({ title: "Orçamento de viagem", text, url: publicUrl || undefined });
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await navigator.clipboard.writeText(text);
      window.alert("Texto do orçamento copiado.");
    }
  }

  return <button className="icon-button" type="button" onClick={share} aria-label="Compartilhar orçamento" title="Compartilhar"><Share2 size={18} /></button>;
}
