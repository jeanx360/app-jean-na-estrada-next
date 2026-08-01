import {
  BellRing,
  BookOpenText,
  Calculator,
  Car,
  Crown,
  Handshake,
  Home,
  Info,
  Mail,
  MessageCircle,
  Newspaper,
  PlaySquare,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
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
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { label: "Vídeos", shortLabel: "Vídeos", href: "/videos", icon: PlaySquare },
      { label: "Notícias", href: "/noticias", icon: Newspaper },
      { label: "Tutoriais", shortLabel: "Tutoriais", href: "/tutoriais", icon: BookOpenText },
      { label: "Aplicativos", shortLabel: "Apps", href: "/aplicativos", icon: Smartphone },
      { label: "Produtos recomendados", href: "/produtos", icon: ShoppingBag },
      { label: "Guia e manuais", href: "/guia", icon: BookOpenText },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      { label: "Calculadora EV", href: "/calculadora", icon: Calculator },
      { label: "Motorista profissional", shortLabel: "Motorista", href: "/motorista", icon: Car },
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
      { label: "Fale comigo", href: "/contato", icon: Mail },
      { label: "Sobre o JNE App", href: "/sobre", icon: Info },
    ],
  },
];

export const primaryNavigation = navigationGroups.flatMap((group) => group.items);
