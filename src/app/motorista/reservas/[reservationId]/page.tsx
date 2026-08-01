import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calculator, CalendarDays, FileText, Luggage, MapPin, MessageCircle, Phone, ReceiptText, Users, WalletCards } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { DriverReservationActions } from "@/components/DriverReservationActions";
import { DriverReservationProgress } from "@/components/DriverReservationProgress";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import { formatCurrency, type DriverQuote, type DriverTrip } from "@/lib/driver";
import { DRIVER_RESERVATION_STATUS_LABELS, reservationWhatsAppUrl, type DriverReservation } from "@/lib/driver-public";

export const metadata: Metadata = { title: "Solicitação de corrida" };
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ reservationId: string }> };

export default async function DriverReservationDetailPage({ params }: Props) {
  const { reservationId } = await params;
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) redirect(`/entrar?next=/motorista/reservas/${reservationId}`);
  if (!profile?.is_professional_driver || profile.is_blocked) redirect("/perfil");

  const { data } = await supabase.from("driver_reservations").select("*, driver_service_packages(id,title,pricing_type,price)").eq("id", reservationId).eq("driver_user_id", userId).maybeSingle();
  if (!data) notFound();
  const reservation = data as DriverReservation;

  const [{ data: quoteData }, { data: tripData }] = await Promise.all([
    reservation.quote_id ? supabase.from("driver_quotes").select("*").eq("id", reservation.quote_id).eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("driver_trips").select("*").eq("reservation_id", reservation.id).eq("user_id", userId).maybeSingle(),
  ]);
  const quote = quoteData as DriverQuote | null;
  const trip = tripData as DriverTrip | null;
  const route = [reservation.origin, reservation.destination].filter(Boolean).join(" → ") || reservation.driver_service_packages?.title || "Solicitação de corrida";
  const calculatorQuery = new URLSearchParams({ reservation: reservation.id, customerName: reservation.passenger_name, origin: reservation.origin || "", destination: reservation.destination || "", travelDate: reservation.travel_date || "", tripType: reservation.trip_type, notes: reservation.notes || "" });

  return (
    <div className="page-stack driver-page">
      <Link className="text-link driver-back-link" href="/motorista/reservas"><ArrowLeft size={17} /> Voltar às reservas</Link>
      <PageHeader icon={<CalendarDays size={24} />} eyebrow={DRIVER_RESERVATION_STATUS_LABELS[reservation.status].toUpperCase()} title={reservation.passenger_name} description={route} />
      <DriverReservationProgress status={reservation.status} />

      <div className="driver-reservation-detail-grid">
        <div className="driver-reservation-main-stack">
          <section className="driver-reservation-detail">
            <div className="driver-reservation-detail__route"><MapPin size={22} /><div><span>Rota ou serviço</span><strong>{route}</strong></div></div>
            <dl>
              <div><dt><CalendarDays size={17} /> Data e horário</dt><dd>{reservation.travel_date ? new Date(`${reservation.travel_date}T12:00:00`).toLocaleDateString("pt-BR") : "A combinar"}{reservation.travel_time ? ` às ${reservation.travel_time.slice(0, 5)}` : ""}</dd></div>
              <div><dt><Users size={17} /> Passageiros</dt><dd>{reservation.passengers}</dd></div>
              <div><dt><Phone size={17} /> WhatsApp</dt><dd>{reservation.passenger_phone}</dd></div>
              <div><dt><Luggage size={17} /> Bagagens</dt><dd>{reservation.luggage || "Não informado"}</dd></div>
            </dl>
            {reservation.notes ? <div className="driver-reservation-notes"><span>Observações</span><p>{reservation.notes}</p></div> : null}
            <div className="driver-reservation-detail__primary-actions">
              <a className="button button--secondary" href={reservationWhatsAppUrl(reservation)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Conversar</a>
              {!quote ? <Link className="button button--primary" href={`/motorista/calculadora?${calculatorQuery.toString()}`}><Calculator size={18} /> Criar orçamento</Link> : <Link className="button button--primary" href={`/motorista/orcamentos/${quote.id}`}><FileText size={18} /> Abrir orçamento</Link>}
            </div>
          </section>

          {quote ? (
            <section className="driver-reservation-linked-card">
              <div><FileText size={22} /><div><span>ORÇAMENTO VINCULADO</span><strong>{formatCurrency(quote.rounded_total)}</strong><small>{quote.status === "draft" ? "Rascunho salvo" : "Pronto para enviar"}</small></div></div>
              <div className="driver-reservation-linked-card__actions"><Link className="button button--secondary" href={`/motorista/orcamentos/${quote.id}`}>Ver e gerar PDF</Link>{!trip ? <Link className="button button--primary" href={`/motorista/financeiro/nova?quote=${quote.id}&reservation=${reservation.id}`}><WalletCards size={18} /> Confirmar e registrar viagem</Link> : null}</div>
            </section>
          ) : null}

          {trip ? (
            <section className="driver-reservation-linked-card driver-reservation-linked-card--success">
              <div><WalletCards size={22} /><div><span>VIAGEM REGISTRADA</span><strong>{formatCurrency(trip.agreed_amount)}</strong><small>{trip.status === "completed" ? "Concluída" : trip.status === "cancelled" ? "Cancelada" : "Planejada"}</small></div></div>
              <div className="driver-reservation-linked-card__actions"><Link className="button button--primary" href={`/motorista/financeiro/${trip.id}`}>Abrir financeiro</Link><Link className="button button--secondary" href={`/motorista/financeiro/${trip.id}/recibo`}><ReceiptText size={18} /> Recibo / PDF</Link></div>
            </section>
          ) : null}
        </div>

        <DriverReservationActions reservation={reservation} hasQuote={Boolean(quote)} hasTrip={Boolean(trip)} />
      </div>
    </div>
  );
}
