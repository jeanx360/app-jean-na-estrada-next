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
  RefreshCw,
  ScrollText,
  UsersRound,
} from "lucide-react";

export type AdminNavigationItem = {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  keywords?: string[];
};

export type AdminNavigationGroup = {
  label: string;
  items: AdminNavigationItem[];
};

export const adminNavigationGroups: AdminNavigationGroup[] = [
  {
    label: "Visão geral",
    items: [
      {
        href: "/admin",
        label: "Painel executivo",
        shortLabel: "Executivo",
        description: "Indicadores, comparações, alertas e acesso rápido a toda a operação.",
        icon: LayoutDashboard,
        keywords: ["dashboard", "resumo", "indicadores", "funil"],
      },
      {
        href: "/admin/estatisticas",
        label: "Tráfego e audiência",
        shortLabel: "Estatísticas",
        description: "Acessos, visitantes, páginas mais abertas e desempenho do JNE App.",
        icon: BarChart3,
        keywords: ["analytics", "acessos", "visitantes", "páginas"],
      },
    ],
  },
  {
    label: "Pessoas e operação",
    items: [
      {
        href: "/admin/membros",
        label: "Membros e VIP",
        shortLabel: "Membros",
        description: "Contas, permissões, bloqueios e benefícios VIP.",
        icon: UsersRound,
        keywords: ["usuários", "contas", "vip", "bloqueios"],
      },
      {
        href: "/admin/motoristas",
        label: "Motoristas e viagens",
        shortLabel: "Motoristas",
        description: "Perfis profissionais, rede, reservas, orçamentos, viagens e exclusões.",
        icon: CarFront,
        keywords: ["rede", "reservas", "orçamentos", "viagens", "verificação"],
      },
      {
        href: "/admin/assinatura",
        label: "Planos e pagamentos",
        shortLabel: "Planos",
        description: "Gratuito, Profissional, Premium, testes, vencimentos e pagamentos manuais.",
        icon: CreditCard,
        keywords: ["assinatura", "premium", "profissional", "pix", "vencimento"],
      },
      {
        href: "/admin/convites",
        label: "Convites VIP",
        shortLabel: "Convites",
        description: "Criação e acompanhamento de códigos de acesso VIP.",
        icon: KeyRound,
        keywords: ["códigos", "acesso", "resgate"],
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
        keywords: ["moderação", "denúncias", "posts", "comentários"],
      },
      {
        href: "/admin/recados",
        label: "Recados",
        shortLabel: "Recados",
        description: "Mensagens internas para grupos de usuários.",
        icon: Megaphone,
        keywords: ["avisos", "mensagens", "comunicados"],
      },
      {
        href: "/admin/notificacoes",
        label: "Notificações",
        shortLabel: "Notificações",
        description: "Central editorial de notificações e Web Push.",
        icon: BellRing,
        keywords: ["push", "alertas", "mensagens"],
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
        keywords: ["editorial", "tutoriais", "aplicativos", "parceiros", "produtos"],
      },
      {
        href: "/admin/manuais",
        label: "Veículos e manuais",
        shortLabel: "Manuais",
        description: "Biblioteca de veículos, anos, documentos e manuais.",
        icon: BookOpenText,
        keywords: ["biblioteca", "documentos", "carros"],
      },
      {
        href: "/admin/home",
        label: "Página inicial",
        shortLabel: "Home",
        description: "Atalhos e carrossel exibidos na página inicial.",
        icon: Images,
        keywords: ["carrossel", "atalhos", "destaques"],
      },
      {
        href: "/admin/conteudos",
        label: "Conteúdo VIP",
        shortLabel: "Conteúdo VIP",
        description: "Textos, links e arquivos privados da área VIP.",
        icon: Crown,
        keywords: ["arquivos", "privado", "premium"],
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        href: "/admin/automacoes",
        label: "Automações internas",
        shortLabel: "Automações",
        description: "Execuções agendadas, alertas criados, idempotência e falhas técnicas.",
        icon: RefreshCw,
        keywords: ["cron", "rotinas", "execuções", "erros"],
      },
      {
        href: "/admin/logs",
        label: "Logs e auditoria",
        shortLabel: "Auditoria",
        description: "Histórico das alterações administrativas sensíveis.",
        icon: ScrollText,
        keywords: ["histórico", "alterações", "segurança"],
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
