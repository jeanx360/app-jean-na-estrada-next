import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, CalendarDays, Car, CheckCircle2, ChevronDown, Clock3, Luggage, MapPin, MessageCircle, Route, ShieldCheck, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { DriverProfileEventTracker } from "@/components/DriverProfileEventTracker";
import { getAuthContext } from "@/lib/auth";
import { PassengerQuickActions } from "@/components/PassengerQuickActions";
import { PublicReservationForm } from "@/components/PublicReservationForm";
import {
  driverContactRelativeUrl,
  driverMarketingRelativeUrl,
  driverMarketingUrl,
  normalizeDriverCampaignCode,
  normalizeDriverMarketingSource,
} from "@/lib/driver-marketing";
import { createClient } from "@/lib/supabase/server";
import { formatDriverPackagePrice, normalizeWhatsAppPhone, type DriverPublicProfile, type DriverServicePackage } from "@/lib/driver-public";
import { formatRouteDistance, formatRouteDuration } from "@/lib/map-links";
import { createPublicGuestAccessToken } from "@/lib/public-guest-access";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ src?: string; cmp?: string; servico?: string; preview?: string }>;
};

async function loadProfile(slug: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("driver_public_profiles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!profile) return null;
  const { data: packages } = await supabase
    .from("driver_service_packages")
    .select("*")
    .eq("user_id", profile.user_id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return { profile: profile as DriverPublicProfile, packages: (packages ?? []) as DriverServicePackage[] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadProfile(slug);
  if (!result) return { title: "Motorista não encontrado" };
  return {
    title: `${result.profile.display_name} — Motorista particular`,
    description: result.profile.headline || result.profile.description || "Solicite uma corrida particular pelo JNE App.",
    robots: { index: false, follow: false },
  };
}

export default async function PublicDriverPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const result = await loadProfile(slug);
  if (!result) return notFound();

  const { supabase: authSupabase, profile: passengerProfile } = await getAuthContext();
  const { data: authData } = await authSupabase.auth.getUser();
  const passengerMetadata = authData.user?.user_metadata ?? {};
  const initialPassengerName = passengerProfile?.full_name || (typeof passengerMetadata.full_name === "string" ? passengerMetadata.full_name : "");
  const initialPassengerPhone = typeof passengerMetadata.phone === "string" ? passengerMetadata.phone : "";

  const { profile, packages } = result;
  const guestAccessToken = createPublicGuestAccessToken(profile.slug);
  const source = normalizeDriverMarketingSource(query.src);
  const campaignCode = normalizeDriverCampaignCode(query.cmp);
  const selectedPackageId = packages.some((item) => item.id === query.servico) ? query.servico : "";
  const trackPublicAccess = query.preview !== "admin";
  const whatsappText = `Olá, ${profile.display_name}! Encontrei seu contato profissional no JNE App e gostaria de consultar uma corrida particular.`;
  const whatsappUrl = `https://wa.me/${normalizeWhatsAppPhone(profile.whatsapp_phone)}?text=${encodeURIComponent(whatsappText)}`;
  const contactUrl = driverContactRelativeUrl(profile.slug, source, campaignCode);
  const shareUrl = driverMarketingUrl(profile.slug, source, campaignCode);

  return (
    <main className={`public-driver-page public-driver-page--${profile.theme}`}>
      {trackPublicAccess ? <DriverProfileEventTracker driverSlug={profile.slug} source={source} campaignCode={campaignCode} guestAccessToken={guestAccessToken} /> : null}
      <header className="public-driver-hero">
        <div className="public-driver-hero__brand"><span>JNE</span><small>Cartão profissional digital</small></div>
        {profile.show_vehicle_banner && profile.vehicle_banner_url ? (
          <div className="public-driver-vehicle-banner">
            <img src={profile.vehicle_banner_url} alt={`Veículo de ${profile.display_name}`} />
            <span><Car size={16} /> {profile.vehicle_name || "Veículo do motorista"}</span>
          </div>
        ) : null}
        <div className={`public-driver-hero__content${profile.show_vehicle_banner && profile.vehicle_banner_url ? " has-vehicle-banner" : ""}`}>
          <div className="public-driver-avatar">{profile.photo_url ? <img src={profile.photo_url} alt={`Foto de ${profile.display_name}`} /> : <span>{profile.display_name.slice(0, 2).toUpperCase()}</span>}</div>
          <div className="public-driver-identity"><span className="public-driver-verified"><CheckCircle2 size={16} /> Perfil profissional</span><h1>{profile.display_name}</h1><p>{profile.headline || "Motorista particular"}</p><div><span><MapPin size={16} /> {profile.city || "Região não informada"}</span><span><Car size={16} /> {profile.vehicle_name || "Veículo informado na reserva"}</span></div></div>
        </div>
        <PassengerQuickActions
          driverSlug={profile.slug}
          driverName={profile.display_name}
          whatsappUrl={whatsappUrl}
          contactUrl={contactUrl}
          shareUrl={shareUrl}
          source={source}
          campaignCode={campaignCode}
          acceptsReservations={profile.accepts_reservations}
          guestAccessToken={guestAccessToken}
        />
      </header>

      <div className="public-driver-content">
        <section className="public-driver-about"><div><span className="eyebrow">SOBRE O ATENDIMENTO</span><h2>Viagens com contato direto</h2><p>{profile.description || "Atendimento particular mediante reserva e confirmação."}</p></div><dl><div><dt><Users size={18} /> Passageiros</dt><dd>Até {profile.seats}</dd></div><div><dt><Luggage size={18} /> Bagagens</dt><dd>{profile.luggage_note || "Combine antes da viagem"}</dd></div><div><dt><MapPin size={18} /> Região</dt><dd>{profile.service_area || profile.city || "Sob consulta"}</dd></div><div><dt><CalendarDays size={18} /> Disponibilidade</dt><dd>{profile.availability_note || "Mediante confirmação"}</dd></div></dl></section>

        {profile.vehicle_details || profile.amenities.length ? <section className="public-driver-comfort"><div><span className="eyebrow">VEÍCULO E CONFORTO</span><h2>{profile.vehicle_name || "Atendimento profissional"}</h2>{profile.vehicle_details ? <p>{profile.vehicle_details}</p> : null}</div><div>{profile.amenities.map((item) => <span key={item}><CheckCircle2 size={15} /> {item}</span>)}</div></section> : null}

        {packages.length ? (
          <section className="public-driver-services">
            <div className="public-section-heading">
              <div><span className="eyebrow">CATÁLOGO DE CORRIDAS</span><h2>Rotas frequentes deste motorista</h2><p>Abra o catálogo, escolha uma rota e complete somente os dados que faltam.</p></div>
              <BriefcaseBusiness size={28} />
            </div>
            <details className="public-driver-services__catalog" open={Boolean(selectedPackageId)}>
              <summary><span><strong>Ver opções de corrida</strong><small>{packages.length} {packages.length === 1 ? "rota disponível" : "rotas disponíveis"}</small></span><ChevronDown size={22} /></summary>
              <div className="public-driver-services__grid">
                {packages.map((item) => (
                  <article key={item.id}>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description || "Rota particular mediante confirmação."}</p>
                      {item.origin_label && item.destination_label ? <span><MapPin size={15} /> {item.origin_label} → {item.destination_label}</span> : item.route_summary ? <span><MapPin size={15} /> {item.route_summary}</span> : null}
                      {item.route_distance_meters ? <span><Route size={15} /> {formatRouteDistance(item.route_distance_meters)}</span> : null}
                      {item.route_duration_seconds ? <span><Clock3 size={15} /> {formatRouteDuration(item.route_duration_seconds)}</span> : item.duration_label ? <span><CalendarDays size={15} /> {item.duration_label}</span> : null}
                    </div>
                    <div className="public-driver-services__price">
                      <strong>{formatDriverPackagePrice(item)}</strong>
                      {item.default_wait_minutes ? <small>Inclui {item.default_wait_minutes} min de espera</small> : null}
                      {item.includes ? <small>{item.includes}</small> : null}
                      <Link href={`${driverMarketingRelativeUrl(profile.slug, source, campaignCode, item.id)}#reservar`} className="button button--secondary">Escolher rota</Link>
                    </div>
                  </article>
                ))}
              </div>
            </details>
          </section>
        ) : null}

        {profile.accepts_reservations ? <PublicReservationForm driverSlug={profile.slug} driverName={profile.display_name} contactUrl={contactUrl} packages={packages} initialPackageId={selectedPackageId} initialPassengerName={initialPassengerName} initialPassengerPhone={initialPassengerPhone} source={source} campaignCode={campaignCode} guestAccessToken={guestAccessToken} /> : <section className="public-reservation-disabled"><CalendarDays size={30} /><h2>Reservas pausadas</h2><p>Use o WhatsApp para consultar disponibilidade.</p><a className="button button--primary" href={whatsappUrl} target="_blank" rel="noreferrer" data-driver-event="whatsapp_click"><MessageCircle size={18} /> Falar no WhatsApp</a></section>}

        <section className="public-driver-trust"><ShieldCheck size={25} /><div><strong>Contato direto entre passageiro e motorista</strong><p>O JNE App organiza a solicitação. Preço, disponibilidade, rota e condições devem ser confirmados diretamente antes da viagem.</p></div></section>
        <footer className="public-driver-footer"><Link href="/">JNE App · Jean na Estrada</Link><span>Cartão profissional digital</span></footer>
      </div>
    </main>
  );
}
