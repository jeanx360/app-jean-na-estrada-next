import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  Clock3,
  Car,
  ContactRound,
  Crown,
  FileDown,
  FileText,
  Home,
  Inbox,
  MapPin,
  QrCode,
  Settings2,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import { accountHasFeature, getAccountPlan, planUpgradeUrl } from "@/lib/account-plan";
import { DEFAULT_DRIVER_SETTINGS, driverTripMonthKey, formatCurrency, monthKeyInTimeZone, type DriverQuote, type DriverSettings, type DriverTrip } from "@/lib/driver";
import { DRIVER_RESERVATION_STATUS_LABELS, type DriverPublicProfile, type DriverReservation } from "@/lib/driver-public";
import { formatBrazilDate, formatBrazilTime } from "@/lib/date-time";

export const metadata: Metadata = { title: "Painel do motorista" };
export const dynamic = "force-dynamic";

const DRIVER_TIME_ZONE = "America/Sao_Paulo";

function getSaoPauloDateTime(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DRIVER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}

function reservationScheduleKey(item: DriverReservation) {
  return `${item.travel_date ?? "9999-12-31"}T${item.travel_time?.slice(0, 5) ?? "23:59"}`;
}

function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function endOfWeekDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDaysToDateKey(dateKey, weekday === 0 ? 0 : 7 - weekday);
}

function agendaRouteLabel(item: DriverReservation) {
  return [item.origin, item.destination].filter(Boolean).join(" → ") || item.driver_service_packages?.title || "Serviço particular";
}

export default async function DriverDashboardPage() {
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista");
  if (!profile) redirect("/membros");

  const saoPauloNow = getSaoPauloDateTime();
  const weekEndDate = endOfWeekDateKey(saoPauloNow.date);
  const [{ data: settingsData }, { data: quoteData }, { data: tripData }, { data: publicProfileData }, { data: reservationData }, { data: nextServiceData }, { data: agendaData }, { count: profileViews }] = await Promise.all([
    supabase.from("driver_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("driver_quotes").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("driver_trips").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    supabase.from("driver_public_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("driver_reservations").select("*").eq("driver_user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("driver_reservations").select("*, driver_service_packages(id,title,pricing_type,price)").eq("driver_user_id", userId).in("status", ["confirmed", "in_progress"]).not("travel_date", "is", null).gte("travel_date", saoPauloNow.date).order("travel_date", { ascending: true }).order("travel_time", { ascending: true }).limit(30),
    supabase.from("driver_reservations").select("*, driver_service_packages(id,title,pricing_type,price)").eq("driver_user_id", userId).not("travel_date", "is", null).gte("travel_date", saoPauloNow.date).lte("travel_date", weekEndDate).in("status", ["new", "negotiating", "quoted", "confirmed", "in_progress"]).order("travel_date", { ascending: true }).order("travel_time", { ascending: true }).limit(50),
    supabase.from("driver_profile_events").select("id", { count: "exact", head: true }).eq("driver_user_id", userId).eq("event_type", "profile_view").gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const settings: DriverSettings = settingsData ? settingsData as DriverSettings : { user_id: userId, ...DEFAULT_DRIVER_SETTINGS };
  const quotes = (quoteData ?? []) as DriverQuote[];
  const trips = (tripData ?? []) as DriverTrip[];
  const publicProfile = (publicProfileData as DriverPublicProfile | null) ?? null;
  const reservations = (reservationData ?? []) as DriverReservation[];
  const nextServiceCandidates = (nextServiceData ?? []) as DriverReservation[];
  const agendaReservations = ((agendaData ?? []) as DriverReservation[]).sort((first, second) => reservationScheduleKey(first).localeCompare(reservationScheduleKey(second)));
  const todayReservations = agendaReservations.filter((item) => item.travel_date === saoPauloNow.date);
  const weekReservations = agendaReservations.filter((item) => item.travel_date && item.travel_date > saoPauloNow.date);
  const nextService = nextServiceCandidates
    .filter((item) => item.travel_date && (item.travel_date > saoPauloNow.date || item.travel_date === saoPauloNow.date && (!item.travel_time || item.travel_time.slice(0, 5) >= saoPauloNow.time)))
    .sort((first, second) => reservationScheduleKey(first).localeCompare(reservationScheduleKey(second)))[0] ?? null;
  const nextServiceRoute = nextService ? agendaRouteLabel(nextService) : "";
  const currentMonthKey = monthKeyInTimeZone(new Date());
  const monthQuotes = quotes.filter((quote) => monthKeyInTimeZone(quote.created_at) === currentMonthKey);
  const monthTrips = trips.filter((trip) => driverTripMonthKey(trip) === currentMonthKey && trip.status === "completed");
  const monthPotential = monthQuotes.reduce((total, quote) => total + Number(quote.rounded_total || 0), 0);
  const monthNet = monthTrips.reduce((total, trip) => total + Number(trip.net_result || 0), 0);
  const newReservations = reservations.filter((item) => item.status === "new").length;
  const accountPlan = await getAccountPlan(supabase, userId as string, profile!.role);
  const canUseCrm = accountHasFeature(accountPlan, "crm");
  const canUseSchedule = accountHasFeature(accountPlan, "schedule");
  const canUseQuotes = accountHasFeature(accountPlan, "quotes");
  const canUseFinance = accountHasFeature(accountPlan, "finance");
  const canUsePerformance = accountHasFeature(accountPlan, "performance");
  const canUseNetwork = accountHasFeature(accountPlan, "driver_network");

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
        <div className="driver-dashboard-hero__copy"><span className="eyebrow">PAINEL DO MOTORISTA</span><h1>Pronto para o próximo serviço?</h1><p>Divulgue seu cartão, receba solicitações, gere orçamentos e acompanhe o resultado das viagens.</p></div>
        <nav className="driver-dashboard-hero__actions" aria-label="Acessos rápidos do motorista">
          <Link className="driver-quick-action driver-quick-action--primary" href={publicProfile ? "/motorista/cartao" : "/motorista/perfil-publico"}>
            <span className="driver-quick-action__icon"><QrCode size={22} /></span>
            <span>QR de divulgação</span>
          </Link>
          <Link className="driver-quick-action" href="/motorista/calculadora">
            <span className="driver-quick-action__icon"><Calculator size={22} /></span>
            <span>Calcular viagem</span>
          </Link>
          <Link className={`driver-quick-action${newReservations ? " has-alert" : ""}`} href={canUseSchedule ? "/motorista/agenda" : planUpgradeUrl("schedule", "/motorista/agenda")}>
            <span className="driver-quick-action__icon">
              <CalendarDays size={22} />
              {newReservations ? <b className="driver-quick-action__badge">{newReservations > 99 ? "99+" : newReservations}</b> : null}
            </span>
            <span>Agenda</span>
          </Link>
          <Link className="driver-quick-action" href={canUseNetwork ? "/motorista/rede" : planUpgradeUrl("driver_network", "/motorista/rede")}>
            <span className="driver-quick-action__icon"><UsersRound size={22} /></span>
            <span>Rede</span>
          </Link>
          <Link className="driver-quick-action" href="/motorista/notificacoes">
            <span className="driver-quick-action__icon"><BellRing size={22} /></span>
            <span>Alertas</span>
          </Link>
          <Link className="driver-quick-action" href="/?modo=conteudo">
            <span className="driver-quick-action__icon"><Home size={22} /></span>
            <span>Home do JNE</span>
          </Link>
        </nav>
      </div>

      <section className={`driver-next-service${nextService ? "" : " driver-next-service--empty"}`} aria-labelledby="driver-next-service-title">
        {nextService ? (
          <>
            <div className="driver-next-service__heading">
              <div><span className="eyebrow">PRÓXIMO SERVIÇO</span><h2 id="driver-next-service-title">Seu próximo compromisso</h2></div>
              <span className={`driver-reservation-badge driver-reservation-badge--${nextService.status}`}>{DRIVER_RESERVATION_STATUS_LABELS[nextService.status]}</span>
            </div>
            <div className="driver-next-service__content">
              <div className="driver-next-service__schedule">
                <CalendarDays size={23} />
                <div><strong>{formatBrazilDate(nextService.travel_date)}</strong><span>{nextService.travel_time ? `às ${formatBrazilTime(nextService.travel_time)}` : "Horário a combinar"}</span></div>
              </div>
              <div className="driver-next-service__details">
                <div><UserRound size={18} /><span><small>Passageiro</small><strong>{nextService.passenger_name}</strong></span></div>
                <div><MapPin size={18} /><span><small>Trajeto</small><strong>{nextServiceRoute}</strong></span></div>
              </div>
              <Link className="button button--primary driver-next-service__action" href={`/motorista/reservas/${nextService.id}`}>Ver reserva <ArrowRight size={17} /></Link>
            </div>
          </>
        ) : (
          <>
            <div className="driver-next-service__heading"><div><span className="eyebrow">PRÓXIMO SERVIÇO</span><h2 id="driver-next-service-title">Nenhum serviço confirmado</h2></div></div>
            <div className="driver-next-service__empty-content"><CalendarDays size={26} /><p>Quando você confirmar uma reserva com data futura, ela ficará destacada aqui para acesso rápido.</p><Link className="button button--secondary" href="/motorista/reservas">Ver agendamentos <ArrowRight size={17} /></Link></div>
          </>
        )}
      </section>

      <section className="driver-agenda-overview" aria-labelledby="driver-agenda-title">
        <div className="section-heading section-heading--inline driver-agenda-overview__heading">
          <div>
            <span className="eyebrow">AGENDA DO MOTORISTA</span>
            <h2 id="driver-agenda-title">Hoje e esta semana</h2>
            <p>Visualize os próximos compromissos sem sair do painel.</p>
          </div>
          <Link className="text-link" href="/motorista/reservas">Ver agenda completa <ArrowRight size={17} /></Link>
        </div>

        <div className="driver-agenda-grid">
          <article className="driver-agenda-card driver-agenda-card--today">
            <div className="driver-agenda-card__header">
              <div><CalendarDays size={21} /><span><small>HOJE</small><strong>{formatBrazilDate(saoPauloNow.date)}</strong></span></div>
              <b>{todayReservations.length}</b>
            </div>
            {todayReservations.length ? (
              <div className="driver-agenda-list">
                {todayReservations.slice(0, 4).map((item) => (
                  <Link key={item.id} className="driver-agenda-item" href={`/motorista/reservas/${item.id}`}>
                    <time>{item.travel_time ? formatBrazilTime(item.travel_time) : "A combinar"}</time>
                    <span><strong>{item.passenger_name}</strong><small>{agendaRouteLabel(item)}</small></span>
                    <span className={`driver-reservation-badge driver-reservation-badge--${item.status}`}>{DRIVER_RESERVATION_STATUS_LABELS[item.status]}</span>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="driver-agenda-empty"><Clock3 size={24} /><p>Nenhum compromisso agendado para hoje.</p></div>
            )}
            {todayReservations.length > 4 ? <Link className="driver-agenda-more" href="/motorista/reservas">Ver mais {todayReservations.length - 4} de hoje</Link> : null}
          </article>

          <article className="driver-agenda-card">
            <div className="driver-agenda-card__header">
              <div><CalendarDays size={21} /><span><small>ESTA SEMANA</small><strong>Até {formatBrazilDate(weekEndDate)}</strong></span></div>
              <b>{weekReservations.length}</b>
            </div>
            {weekReservations.length ? (
              <div className="driver-agenda-list">
                {weekReservations.slice(0, 5).map((item) => (
                  <Link key={item.id} className="driver-agenda-item" href={`/motorista/reservas/${item.id}`}>
                    <time>{formatBrazilDate(item.travel_date)}{item.travel_time ? <small>{formatBrazilTime(item.travel_time)}</small> : null}</time>
                    <span><strong>{item.passenger_name}</strong><small>{agendaRouteLabel(item)}</small></span>
                    <span className={`driver-reservation-badge driver-reservation-badge--${item.status}`}>{DRIVER_RESERVATION_STATUS_LABELS[item.status]}</span>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="driver-agenda-empty"><CalendarDays size={24} /><p>Nenhum outro compromisso até o fim da semana.</p></div>
            )}
            {weekReservations.length > 5 ? <Link className="driver-agenda-more" href="/motorista/reservas">Ver mais {weekReservations.length - 5} desta semana</Link> : null}
          </article>
        </div>
      </section>

      {!publicProfile ? <section className="driver-profile-onboarding"><ContactRound size={30} /><div><span className="eyebrow">NOVIDADE</span><h2>Crie seu cartão profissional digital</h2><p>Passageiros escaneiam seu QR, fazem um cadastro gratuito rápido e podem solicitar uma corrida com os dados já preenchidos.</p></div><Link className="button button--primary" href="/motorista/perfil-publico">Criar meu cartão <ArrowRight size={18} /></Link></section> : !publicProfile.is_published ? <section className="driver-profile-onboarding driver-profile-onboarding--draft"><ContactRound size={28} /><div><span className="eyebrow">RASCUNHO</span><h2>Seu cartão ainda não está público</h2><p>Revise as informações e publique quando estiver pronto.</p></div><Link className="button button--secondary" href="/motorista/perfil-publico">Continuar configuração</Link></section> : null}

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
          <article className="driver-dashboard-card"><BriefcaseBusiness size={26} /><div><h2>Rotas e serviços frequentes</h2><p>Cadastre trajetos comuns, pacotes fixos, por hora ou sob consulta.</p></div><Link className="button button--secondary" href="/motorista/servicos">Gerenciar</Link></article>
          <article className="driver-dashboard-card"><QrCode size={26} /><div><h2>Links, QR e campanhas</h2><p>Crie divulgações rastreáveis para o veículo e suas redes sociais.</p></div><Link className="button button--secondary" href={publicProfile ? "/motorista/cartao" : "/motorista/perfil-publico"}>Abrir</Link></article>
          <article className="driver-dashboard-card"><Inbox size={26} /><div><h2>Central de reservas</h2><p>Calendário, bloqueios, conflitos e confirmação.</p></div><Link className="button button--secondary" href={canUseSchedule ? "/motorista/agenda" : planUpgradeUrl("schedule", "/motorista/agenda")}>{canUseSchedule ? "Abrir agenda" : "Ver plano"}</Link></article>
        </div>
        {publicProfile?.is_published ? <div className="driver-profile-activity-strip"><span><strong>{profileViews ?? 0}</strong> visualizações nos últimos 30 dias</span><span><strong>{reservations.length}</strong> solicitações recentes</span><span><strong>{publicProfile.accepts_reservations ? "Ativo" : "Pausado"}</strong> recebimento de reservas</span></div> : null}
      </section>

      <section className="driver-crm-callout">
        <div className="driver-crm-callout__icon"><ContactRound size={30} /></div>
        <div>
          <span className="eyebrow">CARTEIRA DE CLIENTES</span>
          <h2>Transforme reservas em relacionamento</h2>
          <p>Contatos, recorrência, histórico, etiquetas e observações privadas organizados automaticamente.</p>
        </div>
        <Link className="button button--primary" href={canUseCrm ? "/motorista/clientes" : planUpgradeUrl("crm", "/motorista/clientes")}>{canUseCrm ? "Abrir clientes" : "Desbloquear CRM"} <ArrowRight size={17} /></Link>
      </section>

      <section className="driver-dashboard-grid driver-dashboard-grid--four">
        <article className="driver-dashboard-card"><Calculator size={26} /><div><h2>Novo orçamento</h2><p>Distância, tempo, espera, pedágios e custos em uma conta só.</p></div><Link className="button button--secondary" href="/motorista/calculadora">Começar</Link></article>
        <article className="driver-dashboard-card"><FileText size={26} /><div><h2>Histórico</h2><p>Consulte e compartilhe as últimas referências salvas.</p></div><Link className="button button--secondary" href={canUseQuotes ? "/motorista/orcamentos" : planUpgradeUrl("quotes", "/motorista/orcamentos")}>{canUseQuotes ? "Ver orçamentos" : "Ver plano"}</Link></article>
        <article className="driver-dashboard-card"><WalletCards size={26} /><div><h2>Controle financeiro</h2><p>Receitas, despesas, valores pendentes e resultado líquido.</p></div><Link className="button button--secondary" href={canUseFinance ? "/motorista/financeiro" : planUpgradeUrl("finance", "/motorista/financeiro")}>{canUseFinance ? "Abrir financeiro" : "Ver plano"}</Link></article>
        <article className="driver-dashboard-card"><Settings2 size={26} /><div><h2>Valores padrão</h2><p>Ajuste preço por hora, quilômetro, espera e reserva.</p></div><Link className="button button--secondary" href="/motorista/configuracoes">Configurar</Link></article>
      </section>

      <section className="driver-vip-preview-section">
        <div className="section-heading section-heading--inline"><div><span className="eyebrow"><Crown size={14} /> PLANO PREMIUM</span><h2>Transforme dados em decisões</h2><p>Seu plano atual é {accountPlan.name}. O Premium libera inteligência, campanhas, rede de motoristas e relatórios avançados.</p></div>{!canUsePerformance ? <Link className="button button--secondary" href={planUpgradeUrl("performance", "/motorista/desempenho")}>Comparar planos</Link> : <span className="status-pill status-pill--vip"><Crown size={13} /> Seu plano inclui</span>}</div>
        <div className="driver-vip-preview-grid"><article className="is-available"><span><Crown size={13} /> VIP</span><BarChart3 size={24} /><h3>Conversão e receita</h3><p>Visualizações, contatos, reservas, viagens e resultado por origem.</p><small>Disponível agora</small><Link className="button button--secondary button--compact" href={canUsePerformance ? "/motorista/desempenho" : planUpgradeUrl("performance", "/motorista/desempenho")}>{canUsePerformance ? "Abrir painel" : "Desbloquear"}</Link></article><article className="is-available"><span><Crown size={13} /> VIP</span><UsersRound size={24} /><h3>Rede de motoristas</h3><p>Diretório verificado, contatos profissionais e indicações autorizadas de corridas.</p><small>Disponível agora</small><Link className="button button--secondary button--compact" href={canUseNetwork ? "/motorista/rede" : planUpgradeUrl("driver_network", "/motorista/rede")}>{canUseNetwork ? "Abrir rede" : "Desbloquear"}</Link></article><article className="is-available"><span><FileDown size={13} /> PROFISSIONAL</span><FileDown size={24} /><h3>PDF e CSV</h3><p>Orçamentos, recibos e relatórios prontos para compartilhar ou arquivar.</p><small>Disponível agora</small><Link className="button button--secondary button--compact" href={canUseQuotes ? "/motorista/orcamentos" : planUpgradeUrl("exports", "/motorista/orcamentos")}>{canUseQuotes ? "Abrir documentos" : "Desbloquear"}</Link></article><article className="is-available"><span><BellRing size={13} /> OPERAÇÃO</span><BellRing size={24} /><h3>Alertas internos</h3><p>Lembretes de agenda, orçamentos, pagamentos, clientes e indicações.</p><small>Disponível agora</small><Link className="button button--secondary button--compact" href="/motorista/notificacoes">Abrir alertas</Link></article></div>
      </section>

      <section className="driver-recent-section"><div className="section-heading section-heading--inline"><div><span className="eyebrow">RECENTES</span><h2>Últimos orçamentos</h2></div><Link className="text-link" href="/motorista/orcamentos">Ver todos <ArrowRight size={17} /></Link></div>{quotes.length ? <div className="driver-recent-list">{quotes.slice(0, 4).map((quote) => <article key={quote.id}><div><strong>{[quote.origin, quote.destination].filter(Boolean).join(" → ") || "Viagem particular"}</strong><span>{formatBrazilDate(quote.created_at)}</span></div><b>{formatCurrency(quote.rounded_total)}</b></article>)}</div> : <p className="driver-empty-copy">Seus orçamentos salvos aparecerão aqui.</p>}</section>
    </div>
  );
}
