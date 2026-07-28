import {
  BookOpenText,
  Handshake,
  Home,
  Newspaper,
  PlaySquare,
  ShieldCheck,
  Smartphone,
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
  { label: "Parceiros", href: "/parceiros", icon: Handshake },
  { label: "Área de membros", shortLabel: "VIP", href: "/membros", icon: ShieldCheck, badge: "EM BREVE" },
];
