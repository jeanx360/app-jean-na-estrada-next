import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  BellRing,
  CarFront,
  CheckCircle2,
  CreditCard,
  FileText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Painel administrativo",
  description: "Administração do JNE App.",
};

function numberValue(value: number | string | null | undefined) {
  return Number(value || 0);
}

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();
  const [metricsResult, pendingResult, driverMetricsResult, notificationResult] = await Promise.all([
    supabase.rpc("admin_dashboard_metrics"),
    supabase.from("vip_subscription_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.rpc("admin_driver_metrics"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_published", true),
  ]);

  const metricsData = Array.isArray(metricsResult.data) ? metricsResult.data[0] : metricsResult.data;
  const driverMetrics = (driverMetricsResult.data ?? []) as Array<{ profile_views_30d: number | string }>;
  const driverViews30d = driverMetrics.reduce((sum, item) => sum + numberValue(item.profile_views_30d), 0);

  const summary = [
    { label: "Contas", value: numberValue(metricsData?.total_members), detail: `${numberValue(metricsData?.vip_members)} VIP`, icon: UsersRound, href: "/admin/membros" },
    { label: "Motoristas", value: driverMetrics.length, detail: `${driverViews30d} acessos em 30 dias`, icon: CarFront, href: "/admin/motoristas" },
    { label: "Pagamentos pendentes", value: pendingResult.count ?? 0, detail: "Aguardando análise", icon: CreditCard, href: "/admin/assinatura" },
    { label: "Notificações ativas", value: notificationResult.count ?? 0, detail: "Publicadas no aplicativo", icon: BellRing, href: "/admin/notificacoes" },
  ];

  const actions = [
    { href: "/admin/motoristas", icon: CarFront, title: "Gerenciar motoristas", description: "Bloqueios, perfis, reservas, orçamentos e viagens." },
    { href: "/admin/membros", icon: UsersRound, title: "Controlar membros", description: "Contas, acessos, VIP e restrições." },
    { href: "/admin/assinatura", icon: CreditCard, title: "Revisar pagamentos", description: "Plano, solicitações e comprovantes." },
    { href: "/admin/publicacoes", icon: FileText, title: "Publicar conteúdo", description: "Tutoriais, aplicativos, parceiros e produtos." },
    { href: "/admin/notificacoes", icon: BellRing, title: "Enviar notificação", description: "Mensagens internas e Web Push." },
    { href: "/admin/estatisticas", icon: BarChart3, title: "Ver estatísticas", description: "Gráfico de acessos e páginas mais visitadas." },
  ];

  return (
    <div className="admin-overview-stack">
      <section className="admin-welcome-panel">
        <div>
          <span><ShieldCheck size={17} /> CONTROLE CENTRAL</span>
          <h2>Administração organizada em um só lugar</h2>
          <p>Use o menu à esquerda para navegar pelas áreas. As tarefas mais importantes estão destacadas abaixo para acesso rápido.</p>
        </div>
        <div className="admin-welcome-panel__status"><CheckCircle2 size={22} /><div><strong>Modo administrador ativo</strong><small>Acesso administrativo confirmado</small></div></div>
      </section>

      <section className="admin-overview-summary" aria-label="Resumo administrativo">
        {summary.map((item) => {
          const Icon = item.icon;
          return (
            <Link href={item.href} key={item.label}>
              <span><Icon size={20} /></span>
              <div><small>{item.label}</small><strong>{item.value}</strong><p>{item.detail}</p></div>
              <ArrowUpRight size={17} />
            </Link>
          );
        })}
      </section>

      <section className="admin-quick-panel">
        <header><div><span>ACESSO RÁPIDO</span><h2>O que você precisa fazer?</h2><p>Atalhos para as tarefas administrativas mais usadas.</p></div></header>
        <div className="admin-action-grid">
          {actions.map((item) => {
            const Icon = item.icon;
            return (
              <Link href={item.href} key={item.href}>
                <span><Icon size={22} /></span>
                <div><strong>{item.title}</strong><p>{item.description}</p></div>
                <ArrowUpRight size={18} />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
