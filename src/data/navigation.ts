import {
  BookOpenText,
  Calculator,
  Crown,
  Handshake,
  Home,
  Mail,
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

export const primaryNavigation: NavigationItem[] = [
  { label: "Início", shortLabel: "Início", href: "/", icon: Home },
  { label: "Vídeos", shortLabel: "Vídeos", href: "/videos", icon: PlaySquare },
  { label: "Notícias", href: "/noticias", icon: Newspaper },
  { label: "Guias e tutoriais", shortLabel: "Guias", href: "/tutoriais", icon: BookOpenText },
  { label: "Aplicativos", shortLabel: "Apps", href: "/aplicativos", icon: Smartphone },
  { label: "Produtos recomendados", href: "/produtos", icon: ShoppingBag },
  { label: "Guia do iniciante", href: "/guia", icon: BookOpenText },
  { label: "Calculadora EV", href: "/calculadora", icon: Calculator },
  { label: "Parceiros", href: "/parceiros", icon: Handshake },
  { label: "Fale comigo", href: "/contato", icon: Mail },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
  { label: "Área de membros", shortLabel: "Conta", href: "/membros", icon: ShieldCheck, badge: "LOGIN" },
  { label: "Área VIP", shortLabel: "VIP", href: "/vip", icon: Crown, badge: "VIP" },
];
