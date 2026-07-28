import type { Metadata } from "next";
import Link from "next/link";
import { Crown, KeyRound, Megaphone, UsersRound } from "lucide-react";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Painel administrativo",
  description: "Administração de membros e conteúdos do JNE App.",
};

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();
  const [{ data: members }, vipResult, announcementResult, inviteResult] = await Promise.all([
    supabase.rpc("admin_list_members"),
    supabase.from("vip_content").select("id", { count: "exact", head: true }),
    supabase.from("announcements").select("id", { count: "exact", head: true }),
    supabase.from("vip_invites").select("id", { count: "exact", head: true }),
  ]);

  const memberRows = members ?? [];
  const vipMembers = memberRows.filter((member: { role: string }) => member.role === "vip").length;
  const blockedMembers = memberRows.filter((member: { is_blocked: boolean }) => member.is_blocked).length;

  const cards = [
    {
      href: "/admin/membros",
      icon: UsersRound,
      label: "Membros cadastrados",
      value: memberRows.length,
      detail: `${vipMembers} VIP · ${blockedMembers} bloqueados`,
    },
    {
      href: "/admin/convites",
      icon: KeyRound,
      label: "Convites criados",
      value: inviteResult.count ?? 0,
      detail: "Validade e limite de usos",
    },
    {
      href: "/admin/recados",
      icon: Megaphone,
      label: "Recados",
      value: announcementResult.count ?? 0,
      detail: "Mensagens para membros",
    },
    {
      href: "/admin/conteudos",
      icon: Crown,
      label: "Conteúdos VIP",
      value: vipResult.count ?? 0,
      detail: "Textos, links e arquivos privados",
    },
  ];

  return (
    <section className="admin-dashboard-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link className="admin-stat-card" href={card.href} key={card.href}>
            <span className="admin-stat-card__icon"><Icon size={24} /></span>
            <div>
              <small>{card.label}</small>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
