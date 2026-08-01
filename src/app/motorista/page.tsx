import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  Calculator,
  Car,
  ContactRound,
  Crown,
  FileDown,
  FileText,
  Home,
  Inbox,
  QrCode,
  Settings2,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import { DEFAULT_DRIVER_SETTINGS, driverTripMonthKey, formatCurrency, monthKeyInTimeZone, type DriverQuote, type DriverSettings, type DriverTrip } from "@/lib/driver";
import type { DriverPublicProfile, DriverReservation } from "@/lib/driver-public";

export const metadata: Metadata = { title: "Painel do motorista" };
export const dynamic = "force-dynamic";

export default async function DriverDashboardPage() {
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista");
  if (!profile) redirect("/membros");

  const [{ data: settingsData }, { data: quoteData }, { data: tripData }, { data: publicProfileData }, { data: reservationData }, { count: profileViews }] = await Promise.all([
    supabase.from("driver_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("driver_quotes").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("driver_trips").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    supabase.from("driver_public_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("driver_reservations").select("*").eq("driver_user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("driver_profile_events").select("id", { count: "exact", head: true }).eq("driver_user_id", userId).eq("event_type", "profile_view").gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const settings: DriverSettings = settingsData ? settingsData as DriverSettings : { user_id: userId, ...DEFAULT_DRIVER_SETTINGS };
  const quotes = (quoteData ?? []) as DriverQuote[];
  const trips = (tripData ?? []) as DriverTrip[];
  const publicProfile = (publicProfileData as DriverPublicProfile | null) ?? null;
  const reservations = (reservationData ?? []) as DriverReservation[];
  const currentMonthKey = monthKeyInTimeZone(new Date());
  const monthQuotes = quotes.filter((quote) => monthKeyInTimeZone(quote.created_at) === currentMonthKey);
  const monthTrips = trips.filter((trip) => driverTripMonthKey(trip) === currentMonthKey && trip.status === "completed");
  const monthPotential = monthQuotes.reduce((total, quote) => total + Number(quote.rounded_total || 0), 0);
  const monthNet = monthTrips.reduce((total, trip) => total + Number(trip.net_result || 0), 0);
  const newReservations = reservations.filter((item) => item.status === "new").length;
  const hasVip = profile.role === "vip" || profile.role === "admin";

  if (!profile.is_professional_driver) {
    return (
      <div className="page-stack driver-page">
        <PageHeader icon={<Car size={24} />} eyebrow="MOTORISTA PROFISSIONAL" title="Transforme o JNE App em ferramenta de trabalho" description="Ative o perfil profissional para usar orçamentos, financeiro, cartão digital e reservas." />
        <section className="driver-onboarding-card"><div><h2>Ative no seu perfil</h2><p>A calculadora continua gratuita. O perfil profissional libera seu painel, histórico e cartão digital.</p></div><Link className="button button--primary" href="/perfil">Configurar perfil <ArrowRight size={18} /></Link></section>
        <Link className="driver-open-calculator-card" href="/motorista/calculadora"><Calculator size={28} /><div><strong>Calcular uma viagem agora</strong><span>Use mesmo antes de ativar o perfil profissional.</span></div><ArrowRight size={20} /></Link>
      </div>
    );
  }

  return (
    <div className="page-stack driver-page">
      <div className="driver-dashboard-hero">
        <div><span className="eyebrow">PAINEL DO MOTORISTA</span><h1>Pronto para o próximo serviço?</h1><p>Divulgue seu cartão, receba solicitações, gere orçamentos e acompanhe o resultado das viagens.</p></div>
        <div className="driver-dashboard-hero__actions"><Link className="button button--primary" href={newReservations ? "/motorista/reservas" : "/motorista/calculadora"}>{newReservations ? <Inbox size={18} /> : <Calculator size={18} />}{newReservations ? `${newReservations} nova(s) reserva(s)` : "Calcular viagem"}</Link><Link className="button button--secondary" href="/?modo=conteudo"><Home size={18} /> Conteúdo JNE</Link></div>
      </div>

      {!publicProfile ? <section className="driver-profile-onboarding"><ContactRound size={30} /><div><span className="eyebrow">NOVIDADE</span><h2>Crie seu cartão profissional digital</h2><p>Passageiros escaneiam seu QR, conhecem seus serviços e podem solicitar uma corrida sem precisar criar conta.</p></div><Link className="button button--primary" href="/motorista/perfil-publico">Criar meu cartão <ArrowRight size={18} /></Link></section> : !publicProfile.is_published ? <section className="driver-profile-onboarding driver-profile-onboarding--draft"><ContactRound size={28} /><div><span className="eyebrow">RASCUNHO</span><h2>Seu cartão ainda não está público</h2><p>Revise as informações e publique quando estiver pronto.</p></div><Link className="button button--secondary" href="/motorista/perfil-publico">Continuar configuração</Link></section> : null}

      <section className="driver-dashboard-stats">
        <article><FileText size={22} /><span>Orçamentos no mês</span><strong>{monthQuotes.length}</strong></article>
        <article><TrendingUp size={22} /><span>Valor potencial</span><strong>{formatCurrency(monthPotential)}</strong></article>
        <article><WalletCards size={22} /><span>Líquido concluído</span><strong>{formatCurrency(monthNet)}</strong></article>
        <article className={newReservations ? "is-alert" : ""}><Inbox size={22} /><span>Novas reservas</span><strong>{newReservations}</strong></article>
      </section>

      <section className="driver-workflow-section">
        <div className="section-heading section-heading--inline"><div><span className="eyebrow">CAPTE NOVOS CLIENTES</span><h2>Seu atendimento digital</h2><p>Configure uma vez e use no dia a dia.</p></div>{publicProfile?.is_published ? <Link className="text-link" href={`/m/${publicProfile.slug}?src=shared_link`} target="_blank">Ver como passageiro <ArrowRight size={17} /></Link> : null}</div>
        <div className="driver-dashboard-grid driver-dashboard-grid--four">
          <article className="driver-dashboard-card driver-dashboard-card--primary"><ContactRound size={26} /><div><h2>Meu cartão</h2><p>Foto, veículo, região, WhatsApp e informações profissionais.</p></div><Link className="button button--primary" href="/motorista/perfil-publico">Configurar</Link></article>
          <article className="driver-dashboard-card"><BriefcaseBusiness size={26} /><div><h2>Serviços e preços</h2><p>Pacotes fixos, por hora, “a partir de” ou sob consulta.</p></div><Link className="button button--secondary" href="/motorista/servicos">Gerenciar</Link></article>
          <article className="driver-dashboard-card"><QrCode size={26} /><div><h2>QR e divulgação</h2><p>Baixe um cartão para imprimir, compartilhar ou colocar no veículo.</p></div><Link className="button button--secondary" href={publicProfile ? "/motorista/cartao" : "/motorista/perfil-publico"}>Abrir</Link></article>
          <article className="driver-dashboard-card"><Inbox size={26} /><div><h2>Central de reservas</h2><p>Solicitações, negociação, orçamento e confirmação.</p></div><Link className="button button--secondary" href="/motorista/reservas">Ver reservas</Link></article>
        </div>
        {publicProfile?.is_published ? <div className="driver-profile-activity-strip"><span><strong>{profileViews ?? 0}</strong> visualizações nos últimos 30 dias</span><span><strong>{reservations.length}</strong> solicitações recentes</span><span><strong>{publicProfile.accepts_reservations ? "Ativo" : "Pausado"}</strong> recebimento de reservas</span></div> : null}
      </section>

      <section className="driver-dashboard-grid driver-dashboard-grid--four">
        <article className="driver-dashboard-card"><Calculator size={26} /><div><h2>Novo orçamento</h2><p>Distância, tempo, espera, pedágios e custos em uma conta só.</p></div><Link className="button button--secondary" href="/motorista/calculadora">Começar</Link></article>
        <article className="driver-dashboard-card"><FileText size={26} /><div><h2>Histórico</h2><p>Consulte e compartilhe as últimas referências salvas.</p></div><Link className="button button--secondary" href="/motorista/orcamentos">Ver orçamentos</Link></article>
        <article className="driver-dashboard-card"><WalletCards size={26} /><div><h2>Controle financeiro</h2><p>Receitas, despesas, valores pendentes e resultado líquido.</p></div><Link className="button button--secondary" href="/motorista/financeiro">Abrir financeiro</Link></article>
        <article className="driver-dashboard-card"><Settings2 size={26} /><div><h2>Valores padrão</h2><p>Ajuste preço por hora, quilômetro, espera e reserva.</p></div><Link className="button button--secondary" href="/motorista/configuracoes">Configurar</Link></article>
      </section>

      <section className="driver-vip-preview-section">
        <div className="section-heading section-heading--inline"><div><span className="eyebrow"><Crown size={14} /> INTELIGÊNCIA VIP</span><h2>Transforme dados em decisões</h2><p>O gratuito capta, registra e organiza. O VIP mostrará conversão, clientes recorrentes e rentabilidade.</p></div>{!hasVip ? <Link className="button button--secondary" href="/vip">Conhecer o VIP</Link> : <span className="status-pill status-pill--vip"><Crown size={13} /> Seu plano inclui</span>}</div>
        <div className="driver-vip-preview-grid"><article><span><Crown size={13} /> VIP</span><BarChart3 size={24} /><h3>Conversão do QR</h3><p>Visualizações, contatos, reservas e receita gerada.</p><small>Próxima etapa</small></article><article><span><Crown size={13} /> VIP</span><Target size={24} /><h3>Metas</h3><p>Objetivos de faturamento, lucro e clientes particulares.</p><small>Próxima etapa</small></article><article><span><Crown size={13} /> VIP</span><FileDown size={24} /><h3>PDF e CSV</h3><p>Orçamentos, recibos e relatórios personalizados.</p><small>Próxima etapa</small></article><article><span><Crown size={13} /> VIP</span><BellRing size={24} /><h3>Automações</h3><p>Lembretes de reserva e acompanhamento de clientes.</p><small>Próxima etapa</small></article></div>
      </section>

      <section className="driver-recent-section"><div className="section-heading section-heading--inline"><div><span className="eyebrow">RECENTES</span><h2>Últimos orçamentos</h2></div><Link className="text-link" href="/motorista/orcamentos">Ver todos <ArrowRight size={17} /></Link></div>{quotes.length ? <div className="driver-recent-list">{quotes.slice(0, 4).map((quote) => <article key={quote.id}><div><strong>{[quote.origin, quote.destination].filter(Boolean).join(" → ") || "Viagem particular"}</strong><span>{new Date(quote.created_at).toLocaleDateString("pt-BR")}</span></div><b>{formatCurrency(quote.rounded_total)}</b></article>)}</div> : <p className="driver-empty-copy">Seus orçamentos salvos aparecerão aqui.</p>}</section>
    </div>
  );
}
