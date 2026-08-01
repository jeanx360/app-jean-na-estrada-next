import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Inbox, MapPin, MessageCircle, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import { DRIVER_RESERVATION_STATUS_LABELS, reservationWhatsAppUrl, type DriverReservation } from "@/lib/driver-public";

export const metadata: Metadata = { title: "Central de reservas" };
export const dynamic = "force-dynamic";

export default async function DriverReservationsPage() {
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista/reservas");
  if (!profile?.is_professional_driver || profile.is_blocked) redirect("/perfil");
  const { data } = await supabase.from("driver_reservations").select("*, driver_service_packages(id,title,pricing_type,price)").eq("driver_user_id", userId).order("created_at", { ascending: false }).limit(200);
  const reservations = (data ?? []) as DriverReservation[];
  const newCount = reservations.filter((item) => item.status === "new").length;
  const activeCount = reservations.filter((item) => ["new", "negotiating", "quoted", "confirmed"].includes(item.status)).length;
  const completedCount = reservations.filter((item) => item.status === "completed").length;

  return (
    <div className="page-stack driver-page">
      <Link className="text-link driver-back-link" href="/motorista"><ArrowLeft size={17} /> Voltar ao painel</Link>
      <PageHeader icon={<Inbox size={24} />} eyebrow="MOTORISTA PROFISSIONAL" title="Central de reservas" description="Veja quem demonstrou interesse, fale pelo WhatsApp e transforme a solicitação em orçamento ou viagem." />
      <section className="driver-reservation-summary"><article><span>Novas</span><strong>{newCount}</strong></article><article><span>Em andamento</span><strong>{activeCount}</strong></article><article><span>Concluídas</span><strong>{completedCount}</strong></article></section>
      {reservations.length ? <div className="driver-reservation-list">{reservations.map((item) => {
        const route = [item.origin, item.destination].filter(Boolean).join(" → ") || item.driver_service_packages?.title || "Solicitação de corrida";
        return <article key={item.id} className={`driver-reservation-card driver-reservation-card--${item.status}`}><div className="driver-reservation-card__top"><span className={`driver-reservation-badge driver-reservation-badge--${item.status}`}>{DRIVER_RESERVATION_STATUS_LABELS[item.status]}</span><time>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(item.created_at))}</time></div><h2>{item.passenger_name}</h2><p className="driver-reservation-route"><MapPin size={17} /> {route}</p><div className="driver-reservation-facts"><span><CalendarDays size={16} /> {item.travel_date ? new Date(`${item.travel_date}T12:00:00`).toLocaleDateString("pt-BR") : "Data a combinar"}{item.travel_time ? ` às ${item.travel_time.slice(0, 5)}` : ""}</span><span><Users size={16} /> {item.passengers} passageiro(s)</span></div><div className="driver-reservation-card__actions"><a className="button button--secondary" href={reservationWhatsAppUrl(item)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp</a><Link className="button button--primary" href={`/motorista/reservas/${item.id}`}>Abrir <ArrowRight size={17} /></Link></div></article>;
      })}</div> : <div className="driver-empty-card"><Inbox size={32} /><strong>Nenhuma solicitação ainda</strong><p>Quando um passageiro enviar uma reserva pelo seu cartão digital, ela aparecerá aqui.</p><Link className="button button--primary" href="/motorista/cartao">Divulgar meu QR</Link></div>}
    </div>
  );
}
