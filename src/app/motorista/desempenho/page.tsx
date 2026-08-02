import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Crown,
  Eye,
  Link2,
  MessageCircle,
  QrCode,
  Route,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { requireDriverFeature } from "@/lib/account-plan";
import { formatCurrency } from "@/lib/driver";
import {
  DRIVER_SOURCE_LABELS,
  DRIVER_WEEKDAY_LABELS,
  intelligenceNumber,
  percentage,
  periodChange,
  type DriverDemandPeriod,
  type DriverPerformanceCampaign,
  type DriverPerformanceService,
  type DriverPerformanceSource,
  type DriverPerformanceSummary,
} from "@/lib/driver-intelligence";

export const metadata: Metadata = { title: "Inteligência do motorista" };
export const dynamic = "force-dynamic";

function firstRow<T>(value: T[] | T | null) {
  return Array.isArray(value) ? value[0] : value;
}

function trendLabel(current: number, previous: number) {
  const change = periodChange(current, previous);
  if (change === null) return current > 0 ? "Primeiro período com dados" : "Sem dados no período";
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}% sobre os 30 dias anteriores`;
}

function DemandList({ items, dimension }: { items: DriverDemandPeriod[]; dimension: DriverDemandPeriod["dimension"] }) {
  const filtered = items.filter((item) => item.dimension === dimension);
  const maximum = Math.max(1, ...filtered.map((item) => intelligenceNumber(item.total)));
  return (
    <div className="driver-intelligence-ranking">
      {filtered.map((item) => {
        const bucket = intelligenceNumber(item.bucket);
        const total = intelligenceNumber(item.total);
        const label = dimension === "weekday" ? DRIVER_WEEKDAY_LABELS[bucket] || `Dia ${bucket}` : `${String(bucket).padStart(2, "0")}:00`;
        return (
          <div key={`${dimension}-${bucket}`}>
            <span><strong>{label}</strong><small>{total} solicitações</small></span>
            <i><b style={{ width: `${Math.max(6, (total / maximum) * 100)}%` }} /></i>
          </div>
        );
      })}
      {!filtered.length ? <p className="driver-empty-copy">Ainda não há volume suficiente para identificar um padrão.</p> : null}
    </div>
  );
}

export default async function DriverPerformancePage() {
  const { supabase } = await requireDriverFeature("performance", "/motorista/desempenho");

  const [summaryResult, sourceResult, campaignResult, serviceResult, demandResult] = await Promise.all([
    supabase.rpc("driver_performance_summary", { days_count: 30 }),
    supabase.rpc("driver_performance_sources", { days_count: 30 }),
    supabase.rpc("driver_performance_campaigns", { days_count: 30, result_limit: 8 }),
    supabase.rpc("driver_performance_services", { days_count: 30, result_limit: 5 }),
    supabase.rpc("driver_performance_demand", { days_count: 90 }),
  ]);

  const coreUnavailable = Boolean(summaryResult.error || sourceResult.error || serviceResult.error || demandResult.error);
  const marketingUnavailable = Boolean(campaignResult.error);
  const summary = (firstRow(summaryResult.data) ?? {}) as Partial<DriverPerformanceSummary>;
  const sources = (sourceResult.data ?? []) as DriverPerformanceSource[];
  const campaigns = (campaignResult.data ?? []) as DriverPerformanceCampaign[];
  const services = (serviceResult.data ?? []) as DriverPerformanceService[];
  const demand = (demandResult.data ?? []) as DriverDemandPeriod[];

  const views = intelligenceNumber(summary.profile_views);
  const whatsappClicks = intelligenceNumber(summary.whatsapp_clicks);
  const reservationStarts = intelligenceNumber(summary.reservation_starts);
  const submissions = intelligenceNumber(summary.reservation_submissions);
  const reservations = intelligenceNumber(summary.reservations_total);
  const confirmed = intelligenceNumber(summary.confirmed_reservations);
  const completedTrips = intelligenceNumber(summary.completed_trips);
  const grossRevenue = intelligenceNumber(summary.gross_revenue);
  const netResult = intelligenceNumber(summary.net_result);
  const recurringCustomers = intelligenceNumber(summary.recurring_customers);
  const previousViews = intelligenceNumber(summary.previous_profile_views);
  const previousSubmissions = intelligenceNumber(summary.previous_reservation_submissions);
  const previousTrips = intelligenceNumber(summary.previous_completed_trips);
  const previousNet = intelligenceNumber(summary.previous_net_result);
  const maximumSourceViews = Math.max(1, ...sources.map((item) => intelligenceNumber(item.profile_views)));
  const maximumCampaignViews = Math.max(1, ...campaigns.map((item) => intelligenceNumber(item.profile_views)));

  const recommendations = [
    views > 0 && percentage(whatsappClicks, views) < 5 ? "Fortaleça a chamada para o WhatsApp no cartão e divulgue o QR em locais de maior circulação." : null,
    reservationStarts > 0 && percentage(submissions, reservationStarts) < 40 ? "Muitos passageiros iniciam o formulário e não concluem. Revise serviços, preços e clareza das informações." : null,
    reservations > 0 && percentage(completedTrips, reservations) < 25 ? "Acompanhe reservas abertas e transforme as confirmadas em viagens para medir a receita corretamente." : null,
    campaigns.length === 0 ? "Crie campanhas diferentes para o veículo e para cada rede social. Assim você identifica onde vale insistir." : null,
    recurringCustomers > 0 ? `${recurringCustomers} clientes já voltaram a solicitar seus serviços. Priorize relacionamento e pós-atendimento.` : "Ainda não há clientes recorrentes identificados; incentive novas reservas pelo mesmo WhatsApp.",
  ].filter(Boolean) as string[];

  return (
    <div className="page-stack driver-page driver-intelligence-page">
      <Link className="text-link driver-back-link" href="/motorista"><ArrowLeft size={17} /> Voltar ao painel</Link>
      <PageHeader icon={<BarChart3 size={24} />} eyebrow="INTELIGÊNCIA VIP" title="Desempenho do seu atendimento" description="Entenda de onde chegam os passageiros, quais campanhas funcionam e quanto as viagens concluídas geraram." />

      {coreUnavailable ? (
        <section className="driver-intelligence-warning">
          <Target size={25} />
          <div><strong>O painel principal ainda não está conectado ao banco.</strong><p>Execute as migrations 1.10.0 e 1.11.0 no Supabase para ativar todos os indicadores.</p></div>
        </section>
      ) : marketingUnavailable ? (
        <section className="driver-intelligence-warning">
          <Link2 size={25} />
          <div><strong>Os indicadores gerais estão ativos.</strong><p>Execute a migration 1.11.0 para liberar campanhas rastreáveis e o ranking de divulgação.</p></div>
        </section>
      ) : null}

      <section className="driver-intelligence-summary" aria-label="Resumo dos últimos 30 dias">
        <article><span><Eye size={20} /></span><div><small>Visualizações</small><strong>{views}</strong><p>{trendLabel(views, previousViews)}</p></div></article>
        <article><span><MessageCircle size={20} /></span><div><small>Contatos no WhatsApp</small><strong>{whatsappClicks}</strong><p>{percentage(whatsappClicks, views).toFixed(1)}% das visualizações</p></div></article>
        <article><span><CalendarClock size={20} /></span><div><small>Reservas enviadas</small><strong>{submissions}</strong><p>{trendLabel(submissions, previousSubmissions)}</p></div></article>
        <article><span><WalletCards size={20} /></span><div><small>Resultado líquido</small><strong>{formatCurrency(netResult)}</strong><p>{trendLabel(netResult, previousNet)}</p></div></article>
      </section>

      <section className="driver-intelligence-panel">
        <header><div><span>FUNIL DE CONVERSÃO</span><h2>Do cartão até a viagem concluída</h2><p>Os números consideram os últimos 30 dias.</p></div><Route size={23} /></header>
        <div className="driver-intelligence-funnel">
          <article><span>1</span><div><small>Visualizações</small><strong>{views}</strong></div></article>
          <ArrowRight size={18} />
          <article><span>2</span><div><small>WhatsApp</small><strong>{whatsappClicks}</strong><em>{percentage(whatsappClicks, views).toFixed(1)}%</em></div></article>
          <ArrowRight size={18} />
          <article><span>3</span><div><small>Formulários iniciados</small><strong>{reservationStarts}</strong><em>{percentage(reservationStarts, views).toFixed(1)}%</em></div></article>
          <ArrowRight size={18} />
          <article><span>4</span><div><small>Reservas enviadas</small><strong>{submissions}</strong><em>{percentage(submissions, reservationStarts).toFixed(1)}%</em></div></article>
          <ArrowRight size={18} />
          <article><span>5</span><div><small>Viagens concluídas</small><strong>{completedTrips}</strong><em>{percentage(completedTrips, reservations).toFixed(1)}%</em></div></article>
        </div>
      </section>

      <section className="driver-intelligence-grid">
        <article className="driver-intelligence-panel">
          <header><div><span>ORIGEM</span><h2>Onde o passageiro encontrou você</h2><p>Compare veículo, cartões, redes sociais e links compartilhados.</p></div><QrCode size={23} /></header>
          <div className="driver-source-list">
            {sources.map((item) => {
              const sourceViews = intelligenceNumber(item.profile_views);
              const sourceReservations = intelligenceNumber(item.reservations_total);
              const sourceNet = intelligenceNumber(item.net_result);
              return (
                <div key={item.source}>
                  <div><strong>{DRIVER_SOURCE_LABELS[item.source] || item.source}</strong><span>{sourceViews} visualizações · {sourceReservations} reservas</span></div>
                  <small>{formatCurrency(sourceNet)} líquidos</small>
                  <i><b style={{ width: `${Math.max(5, (sourceViews / maximumSourceViews) * 100)}%` }} /></i>
                </div>
              );
            })}
            {!sources.length ? <p className="driver-empty-copy">As origens aparecerão conforme o cartão receber acessos.</p> : null}
          </div>
        </article>

        <article className="driver-intelligence-panel">
          <header><div><span>RESULTADO</span><h2>Receita e conversão operacional</h2><p>Somente viagens registradas como concluídas.</p></div><BadgeDollarSign size={23} /></header>
          <div className="driver-intelligence-finance">
            <div><small>Reservas recebidas</small><strong>{reservations}</strong></div>
            <div><small>Confirmadas ou concluídas</small><strong>{confirmed}</strong></div>
            <div><small>Viagens concluídas</small><strong>{completedTrips}</strong><span>{trendLabel(completedTrips, previousTrips)}</span></div>
            <div><small>Receita recebida</small><strong>{formatCurrency(grossRevenue)}</strong></div>
            <div className="is-highlight"><small>Resultado líquido</small><strong>{formatCurrency(netResult)}</strong></div>
            <div><small>Clientes recorrentes</small><strong>{recurringCustomers}</strong></div>
          </div>
        </article>
      </section>

      <section className="driver-intelligence-panel driver-campaign-performance">
        <header><div><span>CAMPANHAS</span><h2>Quais divulgações trouxeram resultado</h2><p>Ranking dos últimos 30 dias por campanha identificada.</p></div><Link2 size={23} /></header>
        <div className="driver-campaign-performance__list">
          {campaigns.map((item, index) => {
            const campaignViews = intelligenceNumber(item.profile_views);
            const campaignReservations = intelligenceNumber(item.reservations_total);
            return (
              <article key={item.campaign_id}>
                <b>{index + 1}</b>
                <div><strong>{item.name}</strong><small>{DRIVER_SOURCE_LABELS[item.source] || item.source} · {campaignViews} visualizações · {campaignReservations} reservas</small><i><span style={{ width: `${Math.max(5, (campaignViews / maximumCampaignViews) * 100)}%` }} /></i></div>
                <em>{formatCurrency(intelligenceNumber(item.net_result))}</em>
              </article>
            );
          })}
          {!campaigns.length ? <div className="driver-campaign-performance__empty"><p>Nenhuma campanha com movimento neste período.</p><Link className="button button--secondary button--compact" href="/motorista/cartao">Criar campanha rastreável <ArrowRight size={16} /></Link></div> : null}
        </div>
      </section>

      <section className="driver-intelligence-grid">
        <article className="driver-intelligence-panel">
          <header><div><span>SERVIÇOS</span><h2>Mais solicitados</h2><p>Pacotes que mais geraram interesse nos últimos 30 dias.</p></div><Target size={23} /></header>
          <div className="driver-service-ranking">
            {services.map((item, index) => (
              <div key={item.package_id}>
                <b>{index + 1}</b>
                <span><strong>{item.title}</strong><small>{intelligenceNumber(item.reservation_count)} reservas · {intelligenceNumber(item.completed_trips)} concluídas</small></span>
                <em>{formatCurrency(intelligenceNumber(item.net_result))}</em>
              </div>
            ))}
            {!services.length ? <p className="driver-empty-copy">Cadastre serviços e associe-os às reservas para comparar o desempenho.</p> : null}
          </div>
        </article>

        <article className="driver-intelligence-panel">
          <header><div><span>DEMANDA</span><h2>Dias e horários mais fortes</h2><p>Padrões calculados com até 90 dias de solicitações.</p></div><CalendarClock size={23} /></header>
          <div className="driver-demand-columns">
            <div><h3>Dias das viagens</h3><DemandList items={demand} dimension="weekday" /></div>
            <div><h3>Horários solicitados</h3><DemandList items={demand} dimension="travel_hour" /></div>
          </div>
        </article>
      </section>

      <section className="driver-intelligence-panel driver-intelligence-recommendations">
        <header><div><span>PRÓXIMAS AÇÕES</span><h2>O que os dados sugerem</h2><p>Recomendações simples baseadas no seu próprio funil.</p></div>{netResult >= previousNet ? <TrendingUp size={23} /> : <TrendingDown size={23} />}</header>
        <div>{recommendations.map((item) => <article key={item}><CheckCircle2 size={18} /><p>{item}</p></article>)}</div>
        <footer><Crown size={16} /><span>Painel exclusivo para membros VIP e administradores.</span><Link className="text-link" href="/motorista/cartao">Abrir divulgação <ArrowRight size={16} /></Link></footer>
      </section>
    </div>
  );
}
