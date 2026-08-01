"use client";

import { Share2 } from "lucide-react";
import { formatCurrency, TRIP_TYPE_LABELS, type DriverQuote } from "@/lib/driver";
import { formatBrazilDate } from "@/lib/date-time";

export function DriverQuoteShareButton({ quote }: { quote: DriverQuote }) {
  async function share() {
    const route = [quote.origin, quote.destination].filter(Boolean).join(" → ");
    const text = [
      "Orçamento de viagem particular",
      route ? `Rota: ${route}` : null,
      `Serviço: ${TRIP_TYPE_LABELS[quote.trip_type]}`,
      quote.travel_date ? `Data: ${formatBrazilDate(quote.travel_date)}` : null,
      `Valor total: ${formatCurrency(quote.rounded_total)}`,
      quote.notes ? `Observações: ${quote.notes}` : null,
    ].filter(Boolean).join("\n");

    if (navigator.share) await navigator.share({ title: "Orçamento de viagem", text });
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return <button className="icon-button" type="button" onClick={share} aria-label="Compartilhar orçamento" title="Compartilhar"><Share2 size={18} /></button>;
}
