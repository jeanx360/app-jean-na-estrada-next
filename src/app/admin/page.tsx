import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  BellRing,
  CalendarDays,
  CarFront,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { AdminExecutiveActivityChart } from "@/components/AdminExecutiveActivityChart";
import { adminNavigationGroups } from "@/data/admin-navigation";
import {
  adminMetricChange,
  buildAdminExecutivePeriod,
  normalizeAdminExecutivePeriodKey,
  parseAdminExecutiveDashboard,
  type AdminExecutiveActivityPoint,
  type AdminExecutivePeriodMetrics,
} from "@/lib/admin-executive";
import { requireAdmin } from "@/lib/admin";
import { formatBrazilDate, formatBrazilDateTime } from "@/lib/date-time";

export const metadata: Metadata = {
  title: "Painel executivo",
  description: "Visão executiva e central administrativa do JNE App.",
};
export const dynamic = "force-dynamic";

const periodOptions = [
  ["today", "Hoje"],
  ["7d", "7 dias"],
  ["30d", "30 dias"],
  ["90d", "90 dias"],
  ["month", "Mês atual"],
  ["year", "Ano atual"],
] as const;

type SearchParams = Promise<{ period?: string | string[] }>;

type AuditItem = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

type AutomationItem = {
  id: string;
  status: "running" | "completed" | "partial" | "failed";
  run_source: string;
  created_count: number;
  started_at: string;
};

const actionLabels: Record<string, string> = {
  INSERT: "Criação",
  UPDATE: "Alteração",
  DELETE: "Exclusão",
  PUBLISH: "Publicação",
  UNPUBLISH: "Rascunho",
  ARCHIVE: "Arquivamento",
  RESTORE: "Restauração",
  DUPLICATE: "Duplicação",
  REORDER: "Reordenação",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function percentage(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function trendLabel(current: number, previous: number) {
  const change = adminMetricChange(current, previous);
  if (change === null) return { label: "Novo movimento", direction: "up" as const };
  if (Math.abs(change) < 0.05) return { label: "Sem variação", direction: "neutral" as const };
  return {
    label: `${change > 0 ? "+" : ""}${percentage(change)}`,
    direction: change > 0 ? "up" as const : "down" as const,
  };
}

function MetricTrend({ current, previous }: { current: number; previous: number }) {
  const trend = trendLabel(current, previous);
  return (
    <span className={`admin-executive-trend is-${trend.direction}`}>
      {trend.direction === "up" ? <ArrowUp size={13} /> : trend.direction === "down" ? <ArrowDown size={13} /> : null}
      {trend.label}
    </span>
  );
}

function funnelRate(value: number, base: number) {
  return base > 0 ? value / base * 100 : 0;
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const periodKey = normalizeAdminExecutivePeriodKey(params.period);
  const period = buildAdminExecutivePeriod(periodKey);
  const { supabase } = await requireAdmin();

  const [dashboardResult, activityResult, auditResult, automationResult] = await Promise.all([
    supabase.rpc("admin_executive_dashboard", { selected_start: period.start, selected_end: period.end }),
    supabase.rpc("admin_executive_activity", { selected_start: period.start, selected_end: period.end }),
    supabase.from("admin_audit_logs").select("id, action, entity_type, entity_id, created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("driver_automation_runs").select("id, status, run_source, created_count, started_at").order("started_at", { ascending: false }).limit(6),
  ]);

  const dashboard = parseAdminExecutiveDashboard(dashboardResult.data);
  const activity = (activityResult.data ?? []) as AdminExecutiveActivityPoint[];
  const audits = (auditResult.data ?? []) as AuditItem[];
  const automationRuns = (automationResult.data ?? []) as AutomationItem[];
  const executiveError = dashboardResult.error || activityResult.error || !dashboard;

  const current = dashboard?.current ?? {} as AdminExecutivePeriodMetrics;
  const previous = dashboard?.previous ?? {} as AdminExecutivePeriodMetrics;
  const attention = dashboard?.attention;
  const platform = dashboard?.platform;
  const plans = dashboard?.plans;

  const attentionItems = dashboard ? [
    { label: "Pagamentos aguardando análise", value: attention!.pending_payments, href: "/admin/assinatura", icon: CreditCard, tone: "warning" },
    { label: "Motoristas aguardando verificação", value: attention!.pending_driver_verifications, href: "/admin/motoristas", icon: CarFront, tone: "warning" },
    { label: "Assinaturas vencendo em 7 dias", value: attention!.subscriptions_expiring, href: "/admin/assinatura", icon: CalendarDays, tone: "warning" },
    { label: "Assinaturas que exigem atenção", value: attention!.subscriptions_attention, href: "/admin/assinatura", icon: TriangleAlert, tone: "danger" },
    { label: "Denúncias pendentes", value: attention!.pending_community_reports, href: "/admin/comunidade", icon: MessageCircle, tone: "danger" },
    { label: "Falhas de automação em 7 dias", value: attention!.automation_failures_7d, href: "/admin/automacoes", icon: RefreshCw, tone: "danger" },
    { label: "Alertas direcionados não lidos", value: attention!.unread_targeted_notifications, href: "/admin/notificacoes", icon: BellRing, tone: "neutral" },
    { label: "Publicações em rascunho", value: attention!.content_drafts, href: "/admin/publicacoes", icon: FileText, tone: "neutral" },
  ] : [];

  const periodMetrics = dashboard ? [
    { label: "Novas contas", value: current.new_accounts, previous: previous.new_accounts, icon: UsersRound, href: "/admin/membros" },
    { label: "Novos clientes", value: current.customers_created, previous: previous.customers_created, icon: UsersRound, href: "/admin/motoristas" },
    { label: "Reservas criadas", value: current.reservations_created, previous: previous.reservations_created, icon: CalendarDays, href: "/admin/motoristas?view=reservations" },
    { label: "Orçamentos criados", value: current.quotes_created, previous: previous.quotes_created, icon: FileText, href: "/admin/motoristas?view=quotes" },
    { label: "Orçamentos aceitos", value: current.quotes_accepted, previous: previous.quotes_accepted, icon: CheckCircle2, href: "/admin/motoristas?view=quotes" },
    { label: "Viagens concluídas", value: current.trips_completed, previous: previous.trips_completed, icon: CarFront, href: "/admin/motoristas?view=trips" },
    { label: "Indicações criadas", value: current.referrals_created, previous: previous.referrals_created, icon: CarFront, href: "/admin/motoristas" },
    { label: "Alertas automáticos", value: current.automation_notifications, previous: previous.automation_notifications, icon: BellRing, href: "/admin/automacoes" },
  ] : [];

  const totalPlans = plans ? plans.free_count + plans.professional_count + plans.premium_count : 0;
  const maximumPlan = plans ? Math.max(1, plans.free_count, plans.professional_count, plans.premium_count) : 1;

  return (
    <div className="admin-executive-stack">
      <section className="admin-executive-hero">
        <div>
          <span><ShieldCheck size={17} /> CENTRAL EXECUTIVA</span>
          <h2>Operação completa, prioridades e recursos em um só painel</h2>
          <p>Os números abaixo vêm dos registros reais do JNE App. Use os filtros para comparar períodos e a central de recursos para chegar rapidamente a qualquer área administrativa.</p>
        </div>
        <div className="admin-executive-hero__actions">
          <form className="admin-executive-period" method="get">
            <label htmlFor="admin-period">Período</label>
            <select id="admin-period" name="period" defaultValue={periodKey}>
              {periodOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
            <button className="button button--secondary" type="submit">Aplicar</button>
          </form>
          <Link className="button button--primary" href={`/api/admin/executivo/export?period=${periodKey}`}>
            <Download size={17} /> Exportar CSV
          </Link>
        </div>
      </section>

      {executiveError ? (
        <div className="admin-analytics-warning">
          <strong>O painel executivo ainda precisa da migration 1.20.0.</strong>
          <p>{dashboardResult.error?.message || activityResult.error?.message || "Execute 1.20.0_admin_executive_dashboard.sql no Supabase para ativar os indicadores."}</p>
        </div>
      ) : null}

      {dashboard ? (
        <>
          <section className="admin-executive-platform" aria-label="Visão geral da plataforma">
            <article><span><UsersRound size={20} /></span><div><small>Contas ativas</small><strong>{formatNumber(platform!.active_accounts)}</strong><p>{platform!.total_accounts} cadastradas · {platform!.blocked_accounts} bloqueadas</p></div></article>
            <article><span><CarFront size={20} /></span><div><small>Motoristas</small><strong>{formatNumber(platform!.professional_drivers)}</strong><p>{platform!.published_drivers} perfis públicos · {platform!.verified_network_drivers} verificados na rede</p></div></article>
            <article><span><UsersRound size={20} /></span><div><small>Clientes ativos</small><strong>{formatNumber(platform!.active_customers)}</strong><p>CRM consolidado dos profissionais</p></div></article>
            <article><span><BarChart3 size={20} /></span><div><small>Operação acumulada</small><strong>{formatNumber(platform!.trips_total)}</strong><p>{platform!.reservations_total} reservas · {platform!.quotes_total} orçamentos</p></div></article>
          </section>

          <section className="admin-executive-section">
            <header className="admin-executive-section__heading">
              <div><span>DESEMPENHO DO PERÍODO</span><h2>{period.label}</h2><p>Comparação automática com o intervalo imediatamente anterior de mesma duração.</p></div>
              <small>{formatBrazilDate(period.start)} até {formatBrazilDate(period.end)}</small>
            </header>
            <div className="admin-executive-metric-grid">
              {periodMetrics.map((item) => {
                const Icon = item.icon;
                return (
                  <Link href={item.href} key={item.label}>
                    <span><Icon size={19} /></span>
                    <div><small>{item.label}</small><strong>{formatNumber(item.value)}</strong><MetricTrend current={item.value} previous={item.previous} /></div>
                    <ArrowUpRight size={16} />
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="admin-executive-grid admin-executive-grid--wide">
            <article className="admin-executive-section">
              <header className="admin-executive-section__heading">
                <div><span>EVOLUÇÃO</span><h2>Movimentos registrados</h2><p>Granularidade diária, semanal ou mensal conforme o período escolhido.</p></div>
                <BarChart3 size={22} />
              </header>
              <AdminExecutiveActivityChart points={activity} />
            </article>

            <article className="admin-executive-section">
              <header className="admin-executive-section__heading">
                <div><span>PLANOS</span><h2>Distribuição atual</h2><p>{formatNumber(totalPlans)} contas classificadas pelas regras vigentes.</p></div>
                <CreditCard size={22} />
              </header>
              <div className="admin-executive-plan-list">
                {[
                  ["Gratuito", plans!.free_count, "free"],
                  ["Profissional", plans!.professional_count, "professional"],
                  ["Premium", plans!.premium_count, "premium"],
                ].map(([label, rawValue, code]) => {
                  const value = Number(rawValue);
                  return (
                    <div key={String(code)}>
                      <div><strong>{label}</strong><span>{formatNumber(value)} · {totalPlans ? percentage(value / totalPlans * 100) : "0,0%"}</span></div>
                      <i><b className={`is-${code}`} style={{ width: `${value / maximumPlan * 100}%` }} /></i>
                    </div>
                  );
                })}
              </div>
              <Link className="admin-panel-link" href="/admin/assinatura">Gerenciar planos <ArrowUpRight size={16} /></Link>
            </article>
          </section>

          <section className="admin-executive-grid">
            <article className="admin-executive-section">
              <header className="admin-executive-section__heading">
                <div><span>FUNIL OPERACIONAL</span><h2>Volume por etapa</h2><p>Registros criados no período; não representa uma coorte fechada de clientes.</p></div>
              </header>
              <div className="admin-executive-funnel">
                <div><span>Reservas</span><strong>{formatNumber(current.reservations_created)}</strong><i style={{ width: "100%" }} /></div>
                <div><span>Orçamentos</span><strong>{formatNumber(current.quotes_created)}</strong><small>{percentage(funnelRate(current.quotes_created, current.reservations_created))} das reservas</small><i style={{ width: `${Math.min(100, funnelRate(current.quotes_created, current.reservations_created))}%` }} /></div>
                <div><span>Aceites</span><strong>{formatNumber(current.quotes_accepted)}</strong><small>{percentage(funnelRate(current.quotes_accepted, current.quotes_created))} dos orçamentos</small><i style={{ width: `${Math.min(100, funnelRate(current.quotes_accepted, current.reservations_created))}%` }} /></div>
                <div><span>Viagens concluídas</span><strong>{formatNumber(current.trips_completed)}</strong><small>{percentage(funnelRate(current.trips_completed, current.reservations_created))} das reservas</small><i style={{ width: `${Math.min(100, funnelRate(current.trips_completed, current.reservations_created))}%` }} /></div>
              </div>
            </article>

            <article className="admin-executive-section">
              <header className="admin-executive-section__heading">
                <div><span>FILA DE ATENÇÃO</span><h2>O que precisa de ação</h2><p>Itens que merecem revisão administrativa agora.</p></div>
                <TriangleAlert size={22} />
              </header>
              <div className="admin-executive-attention-list">
                {attentionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link className={`is-${item.tone}`} href={item.href} key={item.label}>
                      <span><Icon size={18} /></span><div><strong>{item.label}</strong><small>{item.value ? "Abrir área responsável" : "Nenhuma pendência"}</small></div><b>{formatNumber(item.value)}</b>
                    </Link>
                  );
                })}
              </div>
            </article>
          </section>
        </>
      ) : null}

      <section className="admin-executive-section admin-resource-center">
        <header className="admin-executive-section__heading">
          <div><span>CENTRAL DE RECURSOS</span><h2>Toda a administração à mão</h2><p>Os mesmos módulos do menu lateral, organizados por área e com descrição direta.</p></div>
          <ShieldCheck size={22} />
        </header>
        <div className="admin-resource-groups">
          {adminNavigationGroups.map((group) => (
            <section key={group.label}>
              <h3>{group.label}</h3>
              <div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return <Link href={item.href} key={item.href}><span><Icon size={19} /></span><div><strong>{item.label}</strong><p>{item.description}</p></div><ArrowUpRight size={16} /></Link>;
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="admin-executive-grid">
        <article className="admin-executive-section">
          <header className="admin-executive-section__heading"><div><span>ATIVIDADE RECENTE</span><h2>Auditoria administrativa</h2></div><Link href="/admin/logs">Ver tudo</Link></header>
          <div className="admin-executive-activity-list">
            {audits.map((item) => <Link href="/admin/logs" key={item.id}><span>{actionLabels[item.action] ?? item.action}</span><div><strong>{item.entity_type}</strong><small>{formatBrazilDateTime(item.created_at)}</small></div></Link>)}
            {!audits.length ? <p className="admin-empty">Nenhuma alteração administrativa registrada.</p> : null}
          </div>
        </article>

        <article className="admin-executive-section">
          <header className="admin-executive-section__heading"><div><span>AUTOMAÇÕES</span><h2>Execuções recentes</h2></div><Link href="/admin/automacoes">Ver tudo</Link></header>
          <div className="admin-executive-activity-list">
            {automationRuns.map((item) => <Link href="/admin/automacoes" key={item.id}><span className={`is-${item.status}`}><RefreshCw size={16} /></span><div><strong>{item.status === "failed" ? "Falha" : item.status === "completed" ? "Concluída" : item.status === "partial" ? "Parcial" : "Executando"}</strong><small>{item.created_count} alertas · {formatBrazilDateTime(item.started_at)}</small></div></Link>)}
            {!automationRuns.length ? <p className="admin-empty">Nenhuma execução registrada.</p> : null}
          </div>
        </article>
      </section>

      <p className="admin-executive-generated">Atualizado em {dashboard?.generatedAt ? formatBrazilDateTime(dashboard.generatedAt, { includeSeconds: true }) : "aguardando a migration executiva"}.</p>
    </div>
  );
}
