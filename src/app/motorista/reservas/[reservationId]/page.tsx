import type { Metadata } from "next";
import Link from "next/link";
import { AlarmClock, CalendarDays, Clock3, ContactRound, FileText, Luggage, MapPin, MessageCircle, Navigation, Phone, ReceiptText, Route, Timer, Users, WalletCards } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { DriverReservationActions } from "@/components/DriverReservationActions";
import { DriverReservationProgress } from "@/components/DriverReservationProgress";
import { DriverReservationManagementForms } from "@/components/DriverReservationManagementForms";
import { DriverReferralForm } from "@/components/DriverReferralForm";
import { PageHeader } from "@/components/PageHeader";
import { SmartBackButton } from "@/components/SmartBackButton";
import { getAuthContext } from "@/lib/auth";
import { accountHasFeature, getAccountPlan } from "@/lib/account-plan";
import { formatCurrency, type DriverQuote, type DriverTrip } from "@/lib/driver";
import { DRIVER_RESERVATION_STATUS_LABELS, reservationWhatsAppUrl, type DriverReservation } from "@/lib/driver-public";
import { formatBrazilDate, formatBrazilTime } from "@/lib/date-time";
import { durationLabel } from "@/lib/driver-schedule";
import type { DriverNetworkMember } from "@/lib/driver-network";
import { formatRouteDistance, formatRouteDuration, googleMapsDirectionsUrl, googleMapsNavigationUrl, wazeNavigationUrl } from "@/lib/map-links";

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

  const accountPlan = await getAccountPlan(supabase, userId, profile.role);
  const networkEnabled = accountHasFeature(accountPlan, "driver_network");
  const [{ data: quoteData }, { data: tripData }, networkMembersResult] = await Promise.all([
    reservation.quote_id ? supabase.from("driver_quotes").select("*").eq("id", reservation.quote_id).eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("driver_trips").select("*").eq("reservation_id", reservation.id).eq("user_id", userId).maybeSingle(),
    networkEnabled ? supabase.rpc("driver_network_members") : Promise.resolve({ data: [] }),
  ]);
  const quote = quoteData as DriverQuote | null;
  const trip = tripData as DriverTrip | null;
  const networkMembers = ((networkMembersResult.data ?? []) as DriverNetworkMember[])
    .filter((member) => member.accepts_referrals);
  const route = [reservation.origin, reservation.destination].filter(Boolean).join(" → ") || reservation.driver_service_packages?.title || "Solicitação de corrida";
  const outboundOrigin = { label: reservation.origin, latitude: reservation.origin_latitude, longitude: reservation.origin_longitude };
  const outboundDestination = { label: reservation.destination, latitude: reservation.destination_latitude, longitude: reservation.destination_longitude };
  const pickupGoogleMapsUrl = googleMapsNavigationUrl(outboundOrigin);
  const pickupWazeUrl = wazeNavigationUrl(outboundOrigin);
  const tripGoogleMapsUrl = googleMapsDirectionsUrl(outboundOrigin, outboundDestination);
  const returnGoogleMapsUrl = reservation.has_return
    ? googleMapsDirectionsUrl(outboundDestination, outboundOrigin)
    : "";

  return (
    <div className="page-stack driver-page">
      <div className="driver-reservation-detail-nav"><SmartBackButton className="text-link driver-back-link" fallbackHref="/motorista/reservas" label="Voltar às reservas" /><Link className="text-link" href={`/motorista/agenda?month=${(reservation.travel_date || new Date().toISOString().slice(0, 7)).slice(0, 7)}&day=${reservation.travel_date || new Date().toISOString().slice(0, 10)}`}><CalendarDays size={17} /> Ver na agenda</Link></div>
      <PageHeader icon={<CalendarDays size={24} />} eyebrow={DRIVER_RESERVATION_STATUS_LABELS[reservation.status].toUpperCase()} title={reservation.passenger_name} description={route} />
      <DriverReservationProgress status={reservation.status} />

      <div className="driver-reservation-detail-grid">
        <div className="driver-reservation-main-stack">
          <section className="driver-reservation-detail">
            <div className="driver-reservation-detail__route"><MapPin size={22} /><div><span>Rota ou serviço</span><strong>{route}</strong></div></div>
            <dl>
              <div><dt><CalendarDays size={17} /> Data e horário</dt><dd>{reservation.travel_date ? formatBrazilDate(reservation.travel_date) : "A combinar"}{reservation.travel_time ? ` às ${formatBrazilTime(reservation.travel_time)}` : ""}</dd></div>
              <div><dt><Users size={17} /> Passageiros</dt><dd>{reservation.passengers}</dd></div>
              <div><dt><Timer size={17} /> Duração prevista</dt><dd>{reservation.route_duration_seconds ? formatRouteDuration(reservation.route_duration_seconds) : durationLabel(reservation.duration_minutes || 60)}</dd></div>
              {reservation.route_distance_meters ? <div><dt><Route size={17} /> Distância estimada</dt><dd>{formatRouteDistance(reservation.route_distance_meters)}</dd></div> : null}
              {reservation.has_return ? <div><dt><CalendarDays size={17} /> Volta</dt><dd>{reservation.return_date ? formatBrazilDate(reservation.return_date) : "A combinar"}{reservation.return_time ? ` às ${formatBrazilTime(reservation.return_time)}` : ""}</dd></div> : null}
              {reservation.wait_at_destination ? <div><dt><Clock3 size={17} /> Espera no local</dt><dd>{durationLabel(reservation.wait_minutes)}</dd></div> : null}
              <div><dt><Phone size={17} /> WhatsApp</dt><dd>{reservation.passenger_phone}</dd></div>
              <div><dt><Luggage size={17} /> Bagagens</dt><dd>{reservation.luggage || "Não informado"}</dd></div>
            </dl>
            {reservation.notes ? <div className="driver-reservation-notes"><span>Observações</span><p>{reservation.notes}</p></div> : null}
            <div className="driver-reservation-detail__primary-actions">
              <a className="button button--secondary" href={reservationWhatsAppUrl(reservation)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Conversar</a>
              {reservation.customer_id ? <Link className="button button--secondary" href={`/motorista/clientes/${reservation.customer_id}`}><ContactRound size={18} /> Ver cliente</Link> : null}
              {!quote ? <Link className="button button--primary" href={`/motorista/orcamentos/novo?reservation=${reservation.id}`}><FileText size={18} /> Criar orçamento</Link> : <Link className="button button--primary" href={`/motorista/orcamentos/${quote.id}`}><FileText size={18} /> Abrir orçamento</Link>}
            </div>
          </section>

          <section className="driver-navigation-card">
            <div><span className="eyebrow">SAÍDA E LEMBRETE</span><h2>Abra a rota com um toque</h2><p>Use o navegador do celular e adicione um alarme ao calendário para não esquecer a corrida.</p></div>
            <div className="driver-navigation-card__buttons">
              <a className="button button--primary" href={pickupGoogleMapsUrl} target="_blank" rel="noreferrer"><Navigation size={18} /> Buscar no Google Maps</a>
              <a className="button button--secondary" href={pickupWazeUrl} target="_blank" rel="noreferrer"><Navigation size={18} /> Buscar no Waze</a>
              <a className="button button--secondary" href={tripGoogleMapsUrl} target="_blank" rel="noreferrer"><Route size={18} /> Trajeto da corrida</a>
              {reservation.has_return ? <a className="button button--secondary" href={returnGoogleMapsUrl} target="_blank" rel="noreferrer"><Route size={18} /> Rota da volta</a> : null}
            </div>
            {reservation.travel_date && reservation.travel_time ? (
              <form className="driver-calendar-alarm-form" method="get" action={`/api/motorista/reservas/${reservation.id}/calendar`}>
                <label><span>Lembrar antes da ida</span><select name="reminder" defaultValue="60"><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="60">1 hora</option><option value="120">2 horas</option><option value="1440">1 dia</option></select></label>
                <button className="button button--secondary" type="submit"><AlarmClock size={18} /> Adicionar ao calendário</button>
              </form>
            ) : <p className="auth-message auth-message--warning">Defina data e horário para criar o lembrete.</p>}
            {reservation.has_return && reservation.return_date && reservation.return_time ? (
              <form className="driver-calendar-alarm-form" method="get" action={`/api/motorista/reservas/${reservation.id}/calendar`}>
                <input type="hidden" name="leg" value="return" />
                <label><span>Lembrar antes da volta</span><select name="reminder" defaultValue="60"><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="60">1 hora</option><option value="120">2 horas</option><option value="1440">1 dia</option></select></label>
                <button className="button button--secondary" type="submit"><AlarmClock size={18} /> Lembrete da volta</button>
              </form>
            ) : null}
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

        <div className="driver-reservation-side-stack">
          <DriverReservationActions reservation={reservation} hasQuote={Boolean(quote)} hasTrip={Boolean(trip)} />
          <section className="driver-reservation-management-card">
            <div><span className="eyebrow">AGENDA E HISTÓRICO</span><h2>Gerenciar compromisso</h2><p>Remarque, duplique ou encerre o atendimento informando o motivo.</p></div>
            <DriverReservationManagementForms reservation={reservation} />
          </section>
          {!(["completed", "cancelled", "declined"] as string[]).includes(reservation.status) ? (
            <DriverReferralForm reservationId={reservation.id} members={networkMembers} networkEnabled={networkEnabled} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
