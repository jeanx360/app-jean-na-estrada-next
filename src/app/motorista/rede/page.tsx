import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Eye,
  MapPin,
  MessageCircle,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
  XCircle,
} from "lucide-react";
import { cancelDriverReferralAction, respondDriverReferralAction } from "@/app/motorista/rede/actions";
import { DriverNetworkSettingsForm } from "@/components/DriverNetworkSettingsForm";
import { PageHeader } from "@/components/PageHeader";
import { SmartBackButton } from "@/components/SmartBackButton";
import { requireDriverFeature } from "@/lib/account-plan";
import { formatBrazilDate, formatBrazilTime } from "@/lib/date-time";
import {
  DRIVER_NETWORK_SERVICE_LABELS,
  DRIVER_REFERRAL_STATUS_LABELS,
  driverNetworkWhatsAppUrl,
  referralWhatsAppUrl,
  type DriverNetworkMember,
  type DriverNetworkMetrics,
  type DriverNetworkSettings,
  type DriverReferral,
} from "@/lib/driver-network";

export const metadata: Metadata = { title: "Rede de motoristas" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ salvo?: string; resposta?: string; indicacao?: string }>;
};

function routeLabel(item: DriverReferral) {
  return [item.origin, item.destination].filter(Boolean).join(" → ") || "Corrida particular";
}

function referralSchedule(item: DriverReferral) {
  if (!item.travel_date) return "Data a combinar";
  return `${formatBrazilDate(item.travel_date)}${item.travel_time ? ` às ${formatBrazilTime(item.travel_time)}` : ""}`;
}

export default async function DriverNetworkPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, userId } = await requireDriverFeature("driver_network", "/motorista/rede");

  const [settingsResult, membersResult, sentResult, receivedResult, metricsResult, publicProfileResult] = await Promise.all([
    supabase.from("driver_network_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.rpc("driver_network_members"),
    supabase.from("driver_referrals").select("*").eq("sender_user_id", userId).order("created_at", { ascending: false }).limit(40),
    supabase.from("driver_referrals").select("*").eq("recipient_user_id", userId).order("created_at", { ascending: false }).limit(40),
    supabase.rpc("driver_network_metrics"),
    supabase.from("driver_public_profiles").select("slug, is_published").eq("user_id", userId).maybeSingle(),
  ]);

  const settings = (settingsResult.data as DriverNetworkSettings | null) ?? null;
  const members = ((membersResult.data ?? []) as DriverNetworkMember[]).filter((member) => member.user_id !== userId);
  const sent = (sentResult.data ?? []) as DriverReferral[];
  const received = (receivedResult.data ?? []) as DriverReferral[];
  const metricsRow = (Array.isArray(metricsResult.data) ? metricsResult.data[0] : metricsResult.data) as DriverNetworkMetrics | null;
  const metrics: DriverNetworkMetrics = metricsRow ?? {
    directory_views: 0,
    directory_contacts: 0,
    referrals_sent: sent.length,
    referrals_received: received.length,
    referrals_accepted: [...sent, ...received].filter((item) => item.status === "accepted").length,
  };
  const publicProfile = publicProfileResult.data as { slug: string; is_published: boolean } | null;
  const activeMembers = members.filter((member) => member.accepts_referrals);

  return (
    <div className="page-stack driver-page driver-network-page">
      <SmartBackButton className="text-link driver-back-link" fallbackHref="/motorista" label="Voltar ao painel" />
      <PageHeader
        icon={<UsersRound size={24} />}
        eyebrow="PLANO PREMIUM"
        title="Rede de motoristas"
        description="Seja encontrado por passageiros, conheça profissionais verificados e encaminhe corridas com autorização. Sem despacho automático e sem comissão."
      />

      {query.salvo || query.resposta || query.indicacao ? (
        <p className="driver-network-success"><CheckCircle2 size={18} /> Alteração registrada com sucesso.</p>
      ) : null}

      {!publicProfile?.is_published ? (
        <section className="driver-network-onboarding">
          <ShieldCheck size={28} />
          <div><strong>Publique seu cartão profissional primeiro</strong><p>A rede utiliza nome, foto, veículo, cidade e região do cartão. Seus dados financeiros e documentos não aparecem.</p></div>
          <Link className="button button--primary" href="/motorista/perfil-publico">Configurar cartão <ArrowRight size={17} /></Link>
        </section>
      ) : null}

      <section className="driver-network-metrics" aria-label="Métricas da rede">
        <article><Eye size={21} /><span>Visualizações pela rede</span><strong>{Number(metrics.directory_views || 0)}</strong></article>
        <article><MessageCircle size={21} /><span>Contatos pela rede</span><strong>{Number(metrics.directory_contacts || 0)}</strong></article>
        <article><UsersRound size={21} /><span>Indicações enviadas</span><strong>{Number(metrics.referrals_sent || 0)}</strong></article>
        <article><UserRoundCheck size={21} /><span>Indicações aceitas</span><strong>{Number(metrics.referrals_accepted || 0)}</strong></article>
      </section>

      <DriverNetworkSettingsForm settings={settings} />

      <section className="driver-network-directory-preview">
        <div className="section-heading section-heading--inline">
          <div><span className="eyebrow">PROFISSIONAIS VERIFICADOS</span><h2>Motoristas disponíveis na rede</h2><p>Use os filtros do diretório público ou abra o cartão profissional de outro motorista.</p></div>
          <Link className="button button--secondary" href="/motoristas" target="_blank">Abrir diretório público <ArrowRight size={17} /></Link>
        </div>
        {activeMembers.length ? (
          <div className="driver-network-member-grid">
            {activeMembers.slice(0, 8).map((member) => {
              const whatsappUrl = driverNetworkWhatsAppUrl(member.whatsapp_phone, member.display_name);
              return (
                <article className="driver-network-member-card" key={member.user_id}>
                  <div className="driver-network-member-card__identity">
                    <div className="driver-network-member-card__avatar">{member.photo_url ? <img src={member.photo_url} alt={`Foto de ${member.display_name}`} /> : <span>{member.display_name.slice(0, 2).toUpperCase()}</span>}</div>
                    <div><span><CheckCircle2 size={14} /> Verificado</span><h3>{member.display_name}</h3><p>{member.headline || "Motorista particular"}</p></div>
                  </div>
                  <div className="driver-network-member-card__facts"><span><MapPin size={15} /> {member.city || member.region || "Região não informada"}</span><span>{member.vehicle_name || "Veículo não informado"}</span></div>
                  <div className="driver-network-member-card__tags">{member.service_types.slice(0, 3).map((service) => <small key={service}>{DRIVER_NETWORK_SERVICE_LABELS[service]}</small>)}</div>
                  <div className="driver-network-member-card__actions"><Link className="button button--secondary button--compact" href={`/m/${member.slug}?src=network`} target="_blank">Ver perfil</Link>{whatsappUrl ? <a className="button button--secondary button--compact" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a> : null}</div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="driver-network-empty"><UsersRound size={28} /><p>Nenhum outro motorista verificado está disponível no momento.</p></div>
        )}
      </section>

      <section className="driver-network-referrals">
        <div className="section-heading"><span className="eyebrow">INDICAÇÕES RECEBIDAS</span><h2>Corridas encaminhadas para você</h2><p>Ao aceitar, uma nova reserva é criada na sua agenda com os dados autorizados pelo passageiro.</p></div>
        {received.length ? (
          <div className="driver-referral-list">
            {received.map((item) => {
              const whatsappUrl = referralWhatsAppUrl(item, userId);
              return (
                <article className={`driver-referral-item driver-referral-item--${item.status}`} key={item.id}>
                  <header><div><span>DE {item.sender_display_name.toUpperCase()}</span><h3>{routeLabel(item)}</h3></div><b>{DRIVER_REFERRAL_STATUS_LABELS[item.status]}</b></header>
                  <dl><div><dt><CalendarDays size={15} /> Data</dt><dd>{referralSchedule(item)}</dd></div><div><dt><MapPin size={15} /> Passageiro</dt><dd>{item.passenger_name} · {item.passengers} pessoa(s)</dd></div></dl>
                  {item.sender_message ? <p className="driver-referral-item__message">{item.sender_message}</p> : null}
                  {item.status === "pending" ? (
                    <form className="driver-referral-response" action={respondDriverReferralAction}>
                      <input type="hidden" name="referralId" value={item.id} />
                      <textarea name="recipientMessage" rows={2} maxLength={500} placeholder="Mensagem opcional para quem indicou" />
                      <div><button className="button button--primary button--compact" name="response" value="accepted" type="submit"><CheckCircle2 size={16} /> Aceitar e criar reserva</button><button className="button button--danger button--compact" name="response" value="declined" type="submit"><XCircle size={16} /> Recusar</button>{whatsappUrl ? <a className="button button--secondary button--compact" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Falar com motorista</a> : null}</div>
                    </form>
                  ) : item.accepted_reservation_id ? <Link className="text-link" href={`/motorista/reservas/${item.accepted_reservation_id}`}>Abrir reserva criada <ArrowRight size={16} /></Link> : null}
                </article>
              );
            })}
          </div>
        ) : <div className="driver-network-empty"><UserRoundCheck size={28} /><p>Você ainda não recebeu indicações.</p></div>}
      </section>

      <section className="driver-network-referrals">
        <div className="section-heading"><span className="eyebrow">INDICAÇÕES ENVIADAS</span><h2>Acompanhamento dos encaminhamentos</h2><p>O histórico registra quem recebeu, a situação e a reserva original.</p></div>
        {sent.length ? (
          <div className="driver-referral-list">
            {sent.map((item) => {
              const whatsappUrl = referralWhatsAppUrl(item, userId);
              return (
                <article className={`driver-referral-item driver-referral-item--${item.status}`} key={item.id}>
                  <header><div><span>PARA {item.recipient_display_name.toUpperCase()}</span><h3>{routeLabel(item)}</h3></div><b>{DRIVER_REFERRAL_STATUS_LABELS[item.status]}</b></header>
                  <p>{referralSchedule(item)} · Passageiro {item.passenger_name}</p>
                  <div className="driver-referral-item__actions">{item.reservation_id ? <Link className="text-link" href={`/motorista/reservas/${item.reservation_id}`}>Reserva original</Link> : null}{whatsappUrl ? <a className="text-link" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a> : null}{item.status === "pending" ? <form action={cancelDriverReferralAction}><input type="hidden" name="referralId" value={item.id} /><button className="text-link text-link--danger" type="submit">Cancelar indicação</button></form> : null}</div>
                </article>
              );
            })}
          </div>
        ) : <div className="driver-network-empty"><UsersRound size={28} /><p>Abra uma reserva e use a opção “Indicar esta corrida”.</p></div>}
      </section>
    </div>
  );
}
