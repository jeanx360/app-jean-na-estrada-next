import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Download,
  Eye,
  Link2,
  MousePointerClick,
  Route,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { AdminTrafficChart, type AdminTrafficPoint } from "@/components/AdminTrafficChart";
import { requireAdmin } from "@/lib/admin";
import type { AdminDriverIntelligenceSummary } from "@/lib/driver-intelligence";

export const metadata: Metadata = { title: "Estatísticas administrativas" };
export const dynamic = "force-dynamic";

type DailyMetric = {
  day: string;
  page_views: number | string;
  unique_visitors: number | string;
};

type TrafficSummary = {
  page_views: number | string;
  unique_visitors: number | string;
  views_today: number | string;
  visitors_today: number | string;
  previous_period_views: number | string;
};

type TopPage = {
  path: string;
  page_views: number | string;
  unique_visitors: number | string;
};

type AdminDriverMarketingSummary = {
  total_campaigns: number | string;
  active_campaigns: number | string;
  attributed_views: number | string;
  attributed_reservations: number | string;
};

type DriverMetric = {
  profile_views: number | string;
  profile_views_30d: number | string;
  whatsapp_clicks: number | string;
  reservation_starts: number | string;
  reservation_submissions: number | string;
};

function numberValue(value: number | string | null | undefined) {
  return Number(value || 0);
}

function pathLabel(path: string) {
  if (path === "/") return "Página inicial";
  if (path === "/videos") return "Vídeos";
  if (path === "/noticias") return "Notícias";
  if (path === "/tutoriais") return "Tutoriais";
  if (path === "/catalogo") return "Apps e produtos";
  if (path === "/aplicativos") return "Aplicativos";
  if (path === "/produtos") return "Produtos recomendados";
  if (path === "/comunidade") return "Comunidade";
  if (path === "/membros") return "Área de membros";
  if (path === "/vip") return "Área VIP";
  if (path.startsWith("/m/")) return "Página pública de motorista";
  if (path.startsWith("/motorista")) return "Área do motorista";
  return path;
}

export default async function AdminStatisticsPage() {
  const { supabase } = await requireAdmin();
  const [dailyResult, summaryResult, topPagesResult, driverResult, dashboardResult, driverIntelligenceResult, driverMarketingResult] = await Promise.all([
    supabase.rpc("admin_site_traffic_daily", { days_count: 30 }),
    supabase.rpc("admin_site_traffic_summary", { days_count: 30 }),
    supabase.rpc("admin_site_top_pages", { days_count: 30, result_limit: 10 }),
    supabase.rpc("admin_driver_metrics"),
    supabase.rpc("admin_dashboard_metrics"),
    supabase.rpc("admin_driver_intelligence_summary", { days_count: 30 }),
    supabase.rpc("admin_driver_marketing_summary", { days_count: 30 }),
  ]);

  const analyticsUnavailable = Boolean(dailyResult.error || summaryResult.error || topPagesResult.error);
  const daily = (dailyResult.data ?? []) as DailyMetric[];
  const points: AdminTrafficPoint[] = daily.map((item) => ({
    day: item.day,
    pageViews: numberValue(item.page_views),
    uniqueVisitors: numberValue(item.unique_visitors),
  }));
  const summaryData = Array.isArray(summaryResult.data) ? summaryResult.data[0] : summaryResult.data;
  const summary = (summaryData ?? {}) as Partial<TrafficSummary>;
  const topPages = (topPagesResult.data ?? []) as TopPage[];
  const driverMetrics = (driverResult.data ?? []) as DriverMetric[];
  const dashboardData = Array.isArray(dashboardResult.data) ? dashboardResult.data[0] : dashboardResult.data;
  const driverIntelligenceData = Array.isArray(driverIntelligenceResult.data) ? driverIntelligenceResult.data[0] : driverIntelligenceResult.data;
  const driverIntelligence = (driverIntelligenceData ?? {}) as Partial<AdminDriverIntelligenceSummary>;
  const driverMarketingData = Array.isArray(driverMarketingResult.data) ? driverMarketingResult.data[0] : driverMarketingResult.data;
  const driverMarketing = (driverMarketingData ?? {}) as Partial<AdminDriverMarketingSummary>;

  const pageViews = numberValue(summary.page_views);
  const previousViews = numberValue(summary.previous_period_views);
  const growth = previousViews > 0 ? ((pageViews - previousViews) / previousViews) * 100 : null;
  const maximumPageViews = Math.max(1, ...topPages.map((item) => numberValue(item.page_views)));
  const driverViews30d = driverMetrics.reduce((sum, item) => sum + numberValue(item.profile_views_30d), 0);
  const whatsappClicks = driverMetrics.reduce((sum, item) => sum + numberValue(item.whatsapp_clicks), 0);
  const reservationStarts = driverMetrics.reduce((sum, item) => sum + numberValue(item.reservation_starts), 0);
  const reservationSubmissions = driverMetrics.reduce((sum, item) => sum + numberValue(item.reservation_submissions), 0);
  const conversion = reservationStarts > 0 ? (reservationSubmissions / reservationStarts) * 100 : 0;

  return (
    <div className="admin-statistics-stack">
      {analyticsUnavailable ? (
        <div className="admin-analytics-warning">
          <strong>As métricas gerais ainda não estão ativas.</strong>
          <p>Execute a migration <code>1.7.3_admin_interface_analytics.sql</code> no Supabase. Os acessos começarão a ser registrados a partir da instalação.</p>
        </div>
      ) : null}

      <section className="admin-metric-summary" aria-label="Resumo dos acessos">
        <article><span><Eye size={20} /></span><div><small>Visualizações em 30 dias</small><strong>{pageViews}</strong><p>{growth === null ? "Primeiro período de medição" : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}% sobre o período anterior`}</p></div></article>
        <article><span><UsersRound size={20} /></span><div><small>Visitantes em 30 dias</small><strong>{numberValue(summary.unique_visitors)}</strong><p>Contagem anônima e deduplicada</p></div></article>
        <article><span><CalendarDays size={20} /></span><div><small>Acessos hoje</small><strong>{numberValue(summary.views_today)}</strong><p>{numberValue(summary.visitors_today)} visitantes hoje</p></div></article>
        <article><span><UserPlus size={20} /></span><div><small>Cadastros em 7 dias</small><strong>{numberValue(dashboardData?.recent_members)}</strong><p>Crescimento da base de usuários</p></div></article>
      </section>

      <section className="admin-analytics-grid">
        <article className="admin-analytics-panel admin-analytics-panel--chart">
          <header><div><span>TRÁFEGO</span><h2>Acessos do JNE App</h2><p>Visualizações e visitantes únicos dos últimos 30 dias.</p></div><Eye size={22} /></header>
          <AdminTrafficChart points={points} />
        </article>

        <article className="admin-analytics-panel">
          <header><div><span>PÁGINAS</span><h2>Mais acessadas</h2><p>Rotas com maior movimento nos últimos 30 dias.</p></div><Route size={22} /></header>
          <div className="admin-top-pages">
            {topPages.map((item) => {
              const views = numberValue(item.page_views);
              return (
                <div key={item.path}>
                  <div><strong>{pathLabel(item.path)}</strong><span>{views} acessos</span></div>
                  <small>{item.path} · {numberValue(item.unique_visitors)} visitantes</small>
                  <i><b style={{ width: `${Math.max(4, (views / maximumPageViews) * 100)}%` }} /></i>
                </div>
              );
            })}
            {!topPages.length ? <p className="admin-empty">Nenhum acesso geral registrado ainda.</p> : null}
          </div>
        </article>
      </section>

      <section className="admin-analytics-grid admin-analytics-grid--balanced">
        <article className="admin-analytics-panel">
          <header><div><span>MOTORISTAS</span><h2>Desempenho das páginas públicas</h2><p>Métricas já registradas nos cartões profissionais.</p></div><MousePointerClick size={22} /></header>
          <div className="admin-driver-funnel">
            <div><span>Visualizações</span><strong>{driverViews30d}</strong><small>nos últimos 30 dias</small></div>
            <div><span>Cliques no WhatsApp</span><strong>{whatsappClicks}</strong><small>total registrado</small></div>
            <div><span>Reservas iniciadas</span><strong>{reservationStarts}</strong><small>formulários abertos</small></div>
            <div><span>Reservas enviadas</span><strong>{reservationSubmissions}</strong><small>{conversion.toFixed(1)}% de conversão</small></div>
          </div>
          <div className="admin-driver-intelligence-summary">
            <div><small>Motoristas ativos</small><strong>{numberValue(driverIntelligence.active_drivers)}</strong></div>
            <div><small>Viagens concluídas</small><strong>{numberValue(driverIntelligence.completed_trips)}</strong></div>
            <div><small>Receita registrada</small><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numberValue(driverIntelligence.gross_revenue))}</strong></div>
            <div><small>Resultado líquido</small><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numberValue(driverIntelligence.net_result))}</strong></div>
          </div>
          <div className="admin-driver-marketing-strip">
            <Link2 size={19} />
            <div><small>Campanhas ativas</small><strong>{numberValue(driverMarketing.active_campaigns)} de {numberValue(driverMarketing.total_campaigns)}</strong></div>
            <div><small>Acessos identificados</small><strong>{numberValue(driverMarketing.attributed_views)}</strong></div>
            <div><small>Reservas atribuídas</small><strong>{numberValue(driverMarketing.attributed_reservations)}</strong></div>
          </div>
          {driverIntelligenceResult.error ? <p className="admin-analytics-note">Execute a migration 1.10.0 para ativar o consolidado financeiro dos motoristas.</p> : null}
          {driverMarketingResult.error ? <p className="admin-analytics-note">Execute a migration 1.11.0 para ativar o consolidado de campanhas.</p> : null}
          <Link className="admin-panel-link" href="/admin/motoristas">Abrir gestão dos motoristas <ArrowUpRight size={17} /></Link>
        </article>

        <article className="admin-analytics-panel">
          <header><div><span>CONTEÚDO</span><h2>Uso da área privada</h2><p>Indicadores gerais da base e dos conteúdos VIP.</p></div><Download size={22} /></header>
          <div className="admin-private-metrics">
            <div><small>Contas cadastradas</small><strong>{numberValue(dashboardData?.total_members)}</strong></div>
            <div><small>Membros VIP</small><strong>{numberValue(dashboardData?.vip_members)}</strong></div>
            <div><small>Downloads totais</small><strong>{numberValue(dashboardData?.total_downloads)}</strong></div>
            <div><small>Downloads em 7 dias</small><strong>{numberValue(dashboardData?.downloads_last_7_days)}</strong></div>
          </div>
          <p className="admin-analytics-note">As métricas gerais preservam a privacidade: o sistema armazena somente a rota, um identificador anônimo e o momento do acesso.</p>
        </article>
      </section>
    </div>
  );
}
