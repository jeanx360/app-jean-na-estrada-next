import type { Metadata } from "next";
import Link from "next/link";
import {
  BellRing,
  BookOpenText,
  CreditCard,
  Crown,
  Download,
  FileText,
  Images,
  KeyRound,
  Megaphone,
  ScrollText,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Painel administrativo",
  description: "Administração e métricas do JNE App.",
};

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();
  const [
    { data: metricsData },
    publicResult,
    vipResult,
    notificationResult,
    announcementResult,
    inviteResult,
    manualsResult,
    carouselResult,
    pendingSubscriptionsResult,
    activeSubscriptionsResult,
  ] = await Promise.all([
    supabase.rpc("admin_dashboard_metrics"),
    supabase.from("public_contents").select("id", { count: "exact", head: true }),
    supabase.from("vip_content").select("id", { count: "exact", head: true }),
    supabase.from("notifications").select("id", { count: "exact", head: true }),
    supabase.from("announcements").select("id", { count: "exact", head: true }),
    supabase.from("vip_invites").select("id", { count: "exact", head: true }),
    supabase.from("vehicle_documents").select("id", { count: "exact", head: true }),
    supabase.from("home_carousel_slides").select("id", { count: "exact", head: true }),
    supabase.from("vip_subscription_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("vip_entitlements").select("id", { count: "exact", head: true }).eq("source", "subscription").eq("is_active", true),
  ]);
  const metrics = Array.isArray(metricsData) ? metricsData[0] : metricsData;

  const cards = [
    { href: "/admin/membros", icon: UsersRound, label: "Contas", value: Number(metrics?.total_members ?? 0), detail: `${metrics?.vip_members ?? 0} VIP · ${metrics?.blocked_members ?? 0} bloqueados` },
    { href: "/admin/membros", icon: UserPlus, label: "Cadastros em 7 dias", value: Number(metrics?.recent_members ?? 0), detail: "Novas contas confirmadas" },
    { href: "/admin/assinatura", icon: CreditCard, label: "Pagamentos pendentes", value: pendingSubscriptionsResult.count ?? 0, detail: `${activeSubscriptionsResult.count ?? 0} assinaturas diretas ativas` },
    { href: "/admin/conteudos", icon: Download, label: "Downloads VIP", value: Number(metrics?.total_downloads ?? 0), detail: `${metrics?.downloads_last_7_days ?? 0} nos últimos 7 dias` },
    { href: "/admin/convites", icon: KeyRound, label: "Convites", value: inviteResult.count ?? 0, detail: `${metrics?.invite_redemptions ?? 0} ativações realizadas` },
    { href: "/admin/notificacoes", icon: BellRing, label: "Notificações", value: notificationResult.count ?? 0, detail: "Central interna e Web Push" },
    { href: "/admin/publicacoes", icon: FileText, label: "Conteúdo público", value: publicResult.count ?? 0, detail: "Tutoriais, apps, parceiros e produtos" },
    { href: "/admin/manuais", icon: BookOpenText, label: "Manuais", value: manualsResult.count ?? 0, detail: "Veículos, anos e documentação" },
    { href: "/admin/home", icon: Images, label: "Carrossel", value: carouselResult.count ?? 0, detail: "Destaques rotativos da página inicial" },
    { href: "/admin/conteudos", icon: Crown, label: "Conteúdo VIP", value: vipResult.count ?? 0, detail: "Textos, links e arquivos privados" },
    { href: "/admin/recados", icon: Megaphone, label: "Recados", value: announcementResult.count ?? 0, detail: "Mensagens segmentadas" },
    { href: "/admin/logs", icon: ScrollText, label: "Auditoria", value: Number(metrics?.audit_events ?? 0), detail: "Alterações administrativas registradas" },
  ];

  return (
    <section className="admin-dashboard-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link className="admin-stat-card" href={card.href} key={`${card.href}-${card.label}`}>
            <span className="admin-stat-card__icon"><Icon size={24} /></span>
            <div><small>{card.label}</small><strong>{card.value}</strong><p>{card.detail}</p></div>
          </Link>
        );
      })}
    </section>
  );
}
