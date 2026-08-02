import Link from "next/link";
import { Ban, CalendarCheck2, CheckCircle2, Edit3, RotateCcw, Send } from "lucide-react";
import { convertDriverQuoteToReservationAction, setDriverQuoteStatusAction } from "@/app/motorista/orcamentos/actions";
import type { DriverQuote } from "@/lib/driver";

export function DriverQuoteWorkflowActions({ quote }: { quote: DriverQuote }) {
  const editable = ["draft", "sent", "viewed", "expired"].includes(quote.status);
  return (
    <div className="driver-quote-workflow-actions no-print">
      {editable ? <Link className="button button--secondary" href={`/motorista/orcamentos/${quote.id}/editar`}><Edit3 size={17} /> Editar</Link> : null}
      {quote.status === "draft" || quote.status === "expired" ? (
        <form action={setDriverQuoteStatusAction}><input type="hidden" name="quoteId" value={quote.id} /><input type="hidden" name="status" value="sent" /><button className="button button--primary" type="submit"><Send size={17} /> Marcar como enviado</button></form>
      ) : null}
      {["sent", "viewed"].includes(quote.status) ? (
        <form action={setDriverQuoteStatusAction}><input type="hidden" name="quoteId" value={quote.id} /><input type="hidden" name="status" value="accepted" /><button className="button button--secondary" type="submit"><CheckCircle2 size={17} /> Confirmar aceite manual</button></form>
      ) : null}
      {quote.status === "accepted" && !quote.reservation_id ? (
        <form action={convertDriverQuoteToReservationAction}><input type="hidden" name="quoteId" value={quote.id} /><button className="button button--primary" type="submit"><CalendarCheck2 size={17} /> Criar reserva</button></form>
      ) : null}
      {["sent", "viewed", "accepted", "expired"].includes(quote.status) ? (
        <form action={setDriverQuoteStatusAction}><input type="hidden" name="quoteId" value={quote.id} /><input type="hidden" name="status" value="cancelled" /><button className="button button--danger" type="submit"><Ban size={17} /> Cancelar proposta</button></form>
      ) : null}
      {quote.status === "cancelled" ? (
        <form action={setDriverQuoteStatusAction}><input type="hidden" name="quoteId" value={quote.id} /><input type="hidden" name="status" value="draft" /><button className="button button--secondary" type="submit"><RotateCcw size={17} /> Reabrir como rascunho</button></form>
      ) : null}
    </div>
  );
}
