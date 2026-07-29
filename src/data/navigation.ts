import {
  BellRing,
  BookOpenText,
  Calculator,
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
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  shortLabel?: string;
  badge?: string;
};

export const primaryNavigation: NavigationItem[] = [
  { label: "Início", shortLabel: "Início", href: "/", icon: Home },
  { label: "Vídeos", shortLabel: "Vídeos", href: "/videos", icon: PlaySquare },
  { label: "Notícias", href: "/noticias", icon: Newspaper },
  { label: "Tutoriais", shortLabel: "Tutoriais", href: "/tutoriais", icon: BookOpenText },
  { label: "Aplicativos", shortLabel: "Apps", href: "/aplicativos", icon: Smartphone },
  { label: "Produtos recomendados", href: "/produtos", icon: ShoppingBag },
  { label: "Guia e manuais", href: "/guia", icon: BookOpenText },
  { label: "Calculadora EV", href: "/calculadora", icon: Calculator },
  { label: "Parceiros", href: "/parceiros", icon: Handshake },
  { label: "Fale comigo", href: "/contato", icon: Mail },
  { label: "Sobre o JNE App", href: "/sobre", icon: Info },
  { label: "Notificações", href: "/notificacoes", icon: BellRing },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
  { label: "Comunidade VIP", shortLabel: "Comunidade", href: "/comunidade", icon: MessageCircle, badge: "VIP" },
  { label: "Área de membros", shortLabel: "Conta", href: "/membros", icon: ShieldCheck, badge: "LOGIN" },
  { label: "Assinar VIP", shortLabel: "Assinar", href: "/assinar", icon: WalletCards, badge: "VIP" },
  { label: "Área VIP", shortLabel: "VIP", href: "/vip", icon: Crown, badge: "VIP" },
];
