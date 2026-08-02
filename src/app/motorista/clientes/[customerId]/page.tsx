import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  ContactRound,
  MapPin,
  MessageCircle,
  FilePlus2,
  Phone,
  Route,
  WalletCards,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { DriverCustomerEditor } from "@/components/DriverCustomerEditor";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import { formatCurrency, type DriverTrip } from "@/lib/driver";
import {
  DRIVER_CUSTOMER_TAG_LABELS,
  driverCustomerName,
  driverCustomerWhatsAppUrl,
  formatDriverCustomerPhone,
  isDriverCustomerInactive,
  type DriverCustomer,
} from "@/lib/driver-crm";
import {
  DRIVER_RESERVATION_STATUS_LABELS,
  type DriverReservation,
} from "@/lib/driver-public";
import { formatBrazilDate, formatBrazilDateTime, formatBrazilTime } from "@/lib/date-time";

export const metadata: Metadata = { title: "Cliente" };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ customerId: string }>;
};

function reservationRoute(reservation: DriverReservation) {
  return [reservation.origin, reservation.destination].filter(Boolean).join(" → ")
    || reservation.driver_service_packages?.title
    || "Solicitação particular";
}

export default async function DriverCustomerDetailPage({ params }: Props) {
  const { customerId } = await params;
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) redirect(`/entrar?next=/motorista/clientes/${customerId}`);
  if (!profile?.is_professional_driver || profile.is_blocked) redirect("/perfil");

  const [{ data: customerData }, { data: reservationData }] = await Promise.all([
    supabase
      .from("driver_customers")
      .select("*")
      .eq("id", customerId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("driver_reservations")
      .select("*, driver_service_packages(id,title,pricing_type,price)")
      .eq("customer_id", customerId)
      .eq("driver_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (!customerData) notFound();
  const customer = customerData as DriverCustomer;
  const reservations = (reservationData ?? []) as DriverReservation[];
  const reservationIds = reservations.map((reservation) => reservation.id);
  const { data: tripData } = reservationIds.length
    ? await supabase
      .from("driver_trips")
      .select("*")
      .eq("user_id", userId)
      .in("reservation_id", reservationIds)
      .order("created_at", { ascending: false })
    : { data: [] };

  const trips = (tripData ?? []) as DriverTrip[];
  const tripByReservation = new Map(trips.filter((trip) => trip.reservation_id).map((trip) => [trip.reservation_id as string, trip]));
  const completedTrips = trips.filter((trip) => trip.status === "completed");
  const totalRevenue = completedTrips.reduce((total, trip) => total + Number(trip.gross_revenue || 0), 0);
  const completedReservations = reservations.filter((reservation) => reservation.status === "completed").length;
  const inactive = isDriverCustomerInactive(customer);

  return (
    <div className="page-stack driver-page driver-customer-detail-page">
      <Link className="text-link driver-back-link" href="/motorista/clientes">
        <ArrowLeft size={17} /> Voltar aos clientes
      </Link>

      <PageHeader
        icon={<ContactRound size={24} />}
        eyebrow={customer.is_archived ? "CLIENTE ARQUIVADO" : inactive ? "CLIENTE INATIVO" : "CLIENTE"}
        title={driverCustomerName(customer)}
        description={`${formatDriverCustomerPhone(customer.phone)} · primeiro contato em ${formatBrazilDate(customer.first_contact_at)}`}
      />

      <section className="driver-customer-profile-card">
        <div className="driver-customer-profile-card__identity">
          <span>{driverCustomerName(customer).slice(0, 1).toUpperCase()}</span>
          <div>
            <h2>{driverCustomerName(customer)}</h2>
            {customer.custom_name ? <p>Nome recebido nas reservas: {customer.display_name}</p> : null}
            <a href={`tel:+${customer.phone_normalized}`}><Phone size={16} /> {formatDriverCustomerPhone(customer.phone)}</a>
          </div>
        </div>
        <div className="driver-customer-profile-card__actions">
          <a className="button button--primary" href={driverCustomerWhatsAppUrl(customer)} target="_blank" rel="noreferrer">
            <MessageCircle size={18} /> Chamar no WhatsApp
          </a>
          <Link className="button button--secondary" href={`/motorista/orcamentos/novo?customer=${customer.id}`}>
            <FilePlus2 size={18} /> Novo orçamento
          </Link>
        </div>
      </section>

      {customer.tags.length ? (
        <div className="driver-customer-tags driver-customer-tags--large">
          {customer.tags.map((tag) => <span key={tag}>{DRIVER_CUSTOMER_TAG_LABELS[tag]}</span>)}
        </div>
      ) : null}

      <section className="driver-customer-detail-summary">
        <article><CalendarDays size={21} /><span>Solicitações</span><strong>{reservations.length}</strong></article>
        <article><BadgeCheck size={21} /><span>Concluídas</span><strong>{completedReservations}</strong></article>
        <article><Route size={21} /><span>Viagens registradas</span><strong>{completedTrips.length}</strong></article>
        <article><WalletCards size={21} /><span>Receita registrada</span><strong>{formatCurrency(totalRevenue)}</strong></article>
      </section>

      <div className="driver-customer-detail-grid">
        <div className="driver-customer-history-section">
          <div className="section-heading section-heading--inline">
            <div>
              <span className="eyebrow">HISTÓRICO</span>
              <h2>Atendimentos deste cliente</h2>
              <p>Reservas, rotas, situação e viagens financeiras vinculadas.</p>
            </div>
            <span className="driver-customer-last-contact"><CalendarClock size={16} /> {formatBrazilDateTime(customer.last_contact_at)}</span>
          </div>

          {reservations.length ? (
            <div className="driver-customer-history-list">
              {reservations.map((reservation) => {
                const trip = tripByReservation.get(reservation.id);
                return (
                  <article key={reservation.id}>
                    <div className="driver-customer-history-list__top">
                      <span className={`driver-reservation-badge driver-reservation-badge--${reservation.status}`}>
                        {DRIVER_RESERVATION_STATUS_LABELS[reservation.status]}
                      </span>
                      <time>{formatBrazilDateTime(reservation.created_at)}</time>
                    </div>
                    <h3>{reservationRoute(reservation)}</h3>
                    <div className="driver-customer-history-list__facts">
                      <span><CalendarDays size={16} /> {reservation.travel_date ? formatBrazilDate(reservation.travel_date) : "Data a combinar"}{reservation.travel_time ? ` às ${formatBrazilTime(reservation.travel_time)}` : ""}</span>
                      {trip ? <span><WalletCards size={16} /> {formatCurrency(trip.gross_revenue || trip.agreed_amount)}</span> : null}
                    </div>
                    <div className="driver-customer-history-list__actions">
                      <Link className="button button--secondary" href={`/motorista/reservas/${reservation.id}`}>
                        Ver reserva <ArrowRight size={16} />
                      </Link>
                      {trip ? <Link className="button button--secondary" href={`/motorista/financeiro/${trip.id}`}>Abrir financeiro</Link> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="driver-empty-card">
              <MapPin size={30} />
              <strong>Nenhum atendimento vinculado</strong>
              <p>O cliente foi criado, mas ainda não possui reserva disponível no histórico.</p>
            </div>
          )}
        </div>

        <DriverCustomerEditor customer={customer} />
      </div>
    </div>
  );
}
