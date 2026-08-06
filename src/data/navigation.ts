import {
  BellRing,
  BookOpenCheck,
  BookOpenText,
  Calculator,
  Car,
  Crown,
  Download,
  Handshake,
  Home,
  Info,
  Layers3,
  LayoutGrid,
  Mail,
  MessageCircle,
  Newspaper,
  PlayCircle,
  PlaySquare,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  shortLabel?: string;
  badge?: string;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Principal",
    items: [
      { label: "Início", shortLabel: "Início", href: "/", icon: Home },
      { label: "Comece aqui", shortLabel: "Começar", href: "/comecar", icon: PlayCircle, badge: "NOVO" },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { label: "Vídeos", shortLabel: "Vídeos", href: "/videos", icon: PlaySquare },
      { label: "Notícias", href: "/noticias", icon: Newspaper },
      { label: "Tutoriais", shortLabel: "Tutoriais", href: "/tutoriais", icon: BookOpenText },
      { label: "Apps e produtos", shortLabel: "Catálogo", href: "/catalogo", icon: LayoutGrid, badge: "NOVO" },
      { label: "Guia e manuais", href: "/guia", icon: BookOpenText },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      { label: "Calculadora EV", href: "/calculadora", icon: Calculator },
      { label: "Motorista profissional", shortLabel: "Motorista", href: "/motorista", icon: Car },
      { label: "Planos do aplicativo", shortLabel: "Planos", href: "/planos", icon: Layers3 },
    ],
  },
  {
    label: "Comunidade e benefícios",
    items: [
      { label: "Parceiros", href: "/parceiros", icon: Handshake },
      { label: "Comunidade VIP", shortLabel: "Comunidade", href: "/comunidade", icon: MessageCircle, badge: "👑" },
      { label: "Área VIP", shortLabel: "VIP", href: "/vip", icon: Crown, badge: "👑" },
    ],
  },
  {
    label: "Conta e suporte",
    items: [
      { label: "Área de membros", shortLabel: "Conta", href: "/membros", icon: ShieldCheck, badge: "LOGIN" },
      { label: "Notificações", href: "/notificacoes", icon: BellRing },
      { label: "Configurações", href: "/configuracoes", icon: Settings },
      { label: "Instalar aplicativo", href: "/instalar", icon: Download },
      { label: "Central de ajuda", href: "/suporte", icon: BookOpenCheck },
      { label: "Fale comigo", href: "/contato", icon: Mail },
      { label: "Sobre o JNE App", href: "/sobre", icon: Info },
    ],
  },
];

export const primaryNavigation = navigationGroups.flatMap((group) => group.items);
