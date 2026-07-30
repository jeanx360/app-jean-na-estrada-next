import {
  BookOpenText,
  Calculator,
  Handshake,
  MessageCircle,
  Newspaper,
  PlaySquare,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type {
  HomeQuickAccessIcon,
  HomeQuickAccessItem,
  HomeQuickAccessRow,
} from "@/types/home-quick-access";

const iconMap: Record<HomeQuickAccessIcon, LucideIcon> = {
  videos: PlaySquare,
  manuals: BookOpenText,
  apps: Smartphone,
  products: ShoppingBag,
  calculator: Calculator,
  vip: ShieldCheck,
  community: MessageCircle,
  news: Newspaper,
  partners: Handshake,
};

export const defaultHomeQuickAccessItems: HomeQuickAccessItem[] = [
  {
    id: "default-videos",
    title: "Vídeos do canal",
    description: "Análises, testes reais, lançamentos e bastidores.",
    href: "/videos",
    icon: "videos",
    accent: "blue",
  },
  {
    id: "default-manuals",
    title: "Guia e manuais",
    description: "Aprenda o básico e encontre documentos por veículo e ano.",
    href: "/guia",
    icon: "manuals",
    accent: "cyan",
  },
  {
    id: "default-apps",
    title: "Aplicativos para carros",
    description: "Arquivos de apoio, compatibilidade e alertas de instalação.",
    href: "/aplicativos",
    icon: "apps",
    accent: "orange",
  },
  {
    id: "default-products",
    title: "Produtos recomendados",
    description: "Itens automotivos e tecnológicos selecionados para a comunidade.",
    href: "/produtos",
    icon: "products",
    accent: "violet",
  },
  {
    id: "default-calculator",
    title: "Calculadora EV",
    description: "Compare custos de energia, combustível e manutenção.",
    href: "/calculadora",
    icon: "calculator",
    accent: "cyan",
  },
  {
    id: "default-vip",
    title: "Membros VIP",
    description: "Conteúdos, arquivos e benefícios exclusivos para membros.",
    href: "/membros",
    icon: "vip",
    accent: "orange",
  },
];

export function getHomeQuickAccessIcon(icon: HomeQuickAccessIcon): LucideIcon {
  return iconMap[icon] ?? PlaySquare;
}

export async function getHomeQuickAccessItems(): Promise<HomeQuickAccessItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("home_quick_access_items")
      .select("id, title, description, href, icon, accent, sort_order, is_published")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Falha ao carregar os atalhos da home:", error.message);
      return defaultHomeQuickAccessItems;
    }

    return ((data ?? []) as HomeQuickAccessRow[]).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      href: item.href,
      icon: item.icon,
      accent: item.accent,
    }));
  } catch (error) {
    console.warn("Falha inesperada ao carregar os atalhos da home:", error);
    return defaultHomeQuickAccessItems;
  }
}
