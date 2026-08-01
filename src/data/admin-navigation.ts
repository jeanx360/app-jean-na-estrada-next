import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BellRing,
  BookOpenText,
  CarFront,
  CreditCard,
  Crown,
  FileText,
  Images,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  ScrollText,
  UsersRound,
} from "lucide-react";

export type AdminNavigationItem = {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
};

export type AdminNavigationGroup = {
  label: string;
  items: AdminNavigationItem[];
};

export const adminNavigationGroups: AdminNavigationGroup[] = [
  {
    label: "Painel",
    items: [
      {
        href: "/admin",
        label: "Visão geral",
        shortLabel: "Visão geral",
        description: "Resumo da operação e atalhos para as tarefas principais.",
        icon: LayoutDashboard,
      },
      {
        href: "/admin/estatisticas",
        label: "Estatísticas",
        shortLabel: "Estatísticas",
        description: "Acessos, visitantes, páginas mais abertas e desempenho do JNE App.",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Pessoas e receita",
    items: [
      {
        href: "/admin/membros",
        label: "Membros e VIP",
        shortLabel: "Membros",
        description: "Contas, permissões, bloqueios e benefícios VIP.",
        icon: UsersRound,
      },
      {
        href: "/admin/motoristas",
        label: "Motoristas e viagens",
        shortLabel: "Motoristas",
        description: "Perfis profissionais, reservas, orçamentos, viagens e exclusões.",
        icon: CarFront,
      },
      {
        href: "/admin/assinatura",
        label: "Assinaturas e pagamentos",
        shortLabel: "Pagamentos",
        description: "Plano VIP, pagamentos pendentes e comprovantes.",
        icon: CreditCard,
      },
      {
        href: "/admin/convites",
        label: "Convites VIP",
        shortLabel: "Convites",
        description: "Criação e acompanhamento de códigos de acesso VIP.",
        icon: KeyRound,
      },
    ],
  },
  {
    label: "Comunicação",
    items: [
      {
        href: "/admin/comunidade",
        label: "Comunidade VIP",
        shortLabel: "Comunidade",
        description: "Categorias, denúncias, publicações e restrições da comunidade.",
        icon: MessageCircle,
      },
      {
        href: "/admin/recados",
        label: "Recados",
        shortLabel: "Recados",
        description: "Mensagens internas para grupos de usuários.",
        icon: Megaphone,
      },
      {
        href: "/admin/notificacoes",
        label: "Notificações",
        shortLabel: "Notificações",
        description: "Central de notificações e Web Push.",
        icon: BellRing,
      },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      {
        href: "/admin/publicacoes",
        label: "Conteúdo público",
        shortLabel: "Publicações",
        description: "Tutoriais, aplicativos, parceiros, produtos e publicações.",
        icon: FileText,
      },
      {
        href: "/admin/manuais",
        label: "Veículos e manuais",
        shortLabel: "Manuais",
        description: "Biblioteca de veículos, anos, documentos e manuais.",
        icon: BookOpenText,
      },
      {
        href: "/admin/home",
        label: "Página inicial",
        shortLabel: "Home",
        description: "Atalhos e carrossel exibidos na página inicial.",
        icon: Images,
      },
      {
        href: "/admin/conteudos",
        label: "Conteúdo VIP",
        shortLabel: "Conteúdo VIP",
        description: "Textos, links e arquivos privados da área VIP.",
        icon: Crown,
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        href: "/admin/logs",
        label: "Logs e auditoria",
        shortLabel: "Auditoria",
        description: "Histórico das alterações administrativas sensíveis.",
        icon: ScrollText,
      },
    ],
  },
];

export const adminNavigationItems = adminNavigationGroups.flatMap((group) => group.items);

export function getAdminNavigationItem(pathname: string) {
  const exact = adminNavigationItems.find((item) => item.href === pathname);
  if (exact) return exact;

  return adminNavigationItems
    .filter((item) => item.href !== "/admin" && pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0] ?? adminNavigationItems[0];
}
