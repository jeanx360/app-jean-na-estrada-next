import type { Metadata } from "next";
import { SmartBackButton } from "@/components/SmartBackButton";
import { CalendarDays, Car, CheckCircle2, MapPin, ReceiptText, UserRound } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { DriverDocumentActions } from "@/components/DriverDocumentActions";
import { requireDriverFeature } from "@/lib/account-plan";
import { DRIVER_PAYMENT_STATUS_LABELS, formatCurrency, type DriverTrip } from "@/lib/driver";
import type { DriverPublicProfile, DriverReservation } from "@/lib/driver-public";
import { formatBrazilDate } from "@/lib/date-time";

export const metadata: Metadata = { title: "Recibo da viagem" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ tripId: string }> };

export default async function DriverTripReceiptPage({ params }: Props) {
  const { tripId } = await params;
  const { supabase, userId, profile } = await requireDriverFeature("finance", `/motorista/financeiro/${tripId}/recibo`);

  const [{ data: tripData }, { data: publicProfileData }] = await Promise.all([
    supabase.from("driver_trips").select("*").eq("id", tripId).eq("user_id", userId).maybeSingle(),
    supabase.from("driver_public_profiles").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (!tripData) notFound();

  const trip = tripData as DriverTrip;
  const publicProfile = publicProfileData as DriverPublicProfile | null;
  const reservationId = trip.reservation_id;
  let reservation: DriverReservation | null = null;
  if (reservationId) {
    const { data } = await supabase.from("driver_reservations").select("*").eq("id", reservationId).eq("driver_user_id", userId).maybeSingle();
    reservation = data as DriverReservation | null;
  }

  const driverName = publicProfile?.display_name || profile?.full_name || "Motorista profissional";
  const route = [trip.origin, trip.destination].filter(Boolean).join(" → ") || "Viagem particular";
  const travelDate = trip.travel_date ? formatBrazilDate(trip.travel_date) : "Data não informada";
  const received = Number(trip.gross_revenue || 0);
  const passengerPhone = reservation?.passenger_phone || null;
  const shareText = [
    `Recibo de viagem — ${driverName}`,
    `Passageiro: ${trip.customer_name || reservation?.passenger_name || "Não informado"}`,
    `Rota: ${route}`,
    `Data: ${travelDate}`,
    `Valor combinado: ${formatCurrency(trip.agreed_amount)}`,
    `Valor recebido: ${formatCurrency(received)}`,
    Number(trip.pending_amount) > 0 ? `Saldo pendente: ${formatCurrency(trip.pending_amount)}` : "Pagamento quitado.",
    `Recibo nº ${trip.id.slice(0, 8).toUpperCase()}`,
  ].join("\n");

  return (
    <div className="driver-document-page">
      <div className="driver-document-toolbar no-print">
        <SmartBackButton className="text-link" fallbackHref={`/motorista/financeiro/${trip.id}`} label="Voltar à viagem" />
        <DriverDocumentActions title="Recibo de viagem" text={shareText} whatsappPhone={passengerPhone} />
      </div>

      <article className="driver-print-document driver-print-document--receipt">
        <header className="driver-print-document__header">
          <div className="driver-print-document__brand"><Car size={32} /><div><span>JNE APP</span><strong>{driverName}</strong><small>Motorista profissional</small></div></div>
          <div className="driver-print-document__number"><span>RECIBO</span><strong>#{trip.id.slice(0, 8).toUpperCase()}</strong><small>{DRIVER_PAYMENT_STATUS_LABELS[trip.payment_status]}</small></div>
        </header>

        <div className="driver-receipt-confirmation"><CheckCircle2 size={38} /><div><span>Valor recebido</span><strong>{formatCurrency(received)}</strong></div></div>

        <section className="driver-print-document__intro">
          <div><UserRound size={20} /><span>Passageiro</span><strong>{trip.customer_name || reservation?.passenger_name || "Não informado"}</strong></div>
          <div><CalendarDays size={20} /><span>Data da viagem</span><strong>{travelDate}</strong></div>
          <div><MapPin size={20} /><span>Rota</span><strong>{route}</strong></div>
        </section>

        <section className="driver-print-document__section">
          <h2><ReceiptText size={20} /> Dados financeiros</h2>
          <dl className="driver-print-document__rows">
            <div><dt>Valor combinado</dt><dd>{formatCurrency(trip.agreed_amount)}</dd></div>
            <div><dt>Valor recebido</dt><dd>{formatCurrency(received)}</dd></div>
            <div><dt>Saldo pendente</dt><dd>{formatCurrency(trip.pending_amount)}</dd></div>
            <div><dt>Situação</dt><dd>{DRIVER_PAYMENT_STATUS_LABELS[trip.payment_status]}</dd></div>
          </dl>
        </section>

        {trip.notes ? <section className="driver-print-document__notes"><span>Observações</span><p>{trip.notes}</p></section> : null}

        <footer className="driver-print-document__footer">
          <p>Declaro o recebimento do valor indicado acima referente ao serviço de transporte descrito neste documento.</p>
          <div className="driver-receipt-signature"><span>{driverName}</span><small>Motorista responsável</small></div>
          <p className="driver-document-legal">Recibo simples para controle e comprovação entre as partes. Não substitui nota fiscal ou documento fiscal quando exigido pela legislação.</p>
        </footer>
      </article>
    </div>
  );
}
