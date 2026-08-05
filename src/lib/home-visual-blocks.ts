import {
  BatteryCharging,
  Calculator,
  CheckCircle2,
  Grid2X2,
  Handshake,
  PlaySquare,
  Route,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type {
  HomeVisualBlockIcon,
  HomeVisualBlockRow,
} from "@/types/home-visual-block";

const iconMap: Record<HomeVisualBlockIcon, LucideIcon> = {
  sparkles: Sparkles,
  handshake: Handshake,
  battery: BatteryCharging,
  calculator: Calculator,
  route: Route,
  check: CheckCircle2,
  videos: PlaySquare,
  grid: Grid2X2,
};

export const defaultHomeVisualBlocks: HomeVisualBlockRow[] = [
  {
    id: "default-carousel",
    block_key: "carousel",
    block_type: "carousel",
    variant: "default",
    eyebrow: null,
    title: "Carrossel principal",
    description: "Destaques principais da página inicial.",
    action_label: null,
    action_url: null,
    secondary_action_label: null,
    secondary_action_url: null,
    icon: "sparkles",
    accent: "blue",
    metadata: {},
    sort_order: 10,
    is_published: true,
  },
  {
    id: "default-start",
    block_key: "start_cta",
    block_type: "cta",
    variant: "commercial",
    eyebrow: "JNE APP 2.0",
    title: "Escolha seu caminho e comece sem complicação.",
    description: "Use o aplicativo para acompanhar o conteúdo, participar da comunidade ou organizar sua operação como motorista profissional.",
    action_label: "Ver primeiros passos",
    action_url: "/comecar",
    secondary_action_label: "Comparar planos",
    secondary_action_url: "/planos",
    icon: "check",
    accent: "blue",
    metadata: {},
    sort_order: 20,
    is_published: true,
  },
  {
    id: "default-utility-ev",
    block_key: "utility_ev",
    block_type: "utility",
    variant: "ev",
    eyebrow: "PARA QUEM PENSA EM ELÉTRICO",
    title: "Vale a pena ter um elétrico?",
    description: "Compare energia, combustível e manutenção com base no seu uso.",
    action_label: "Calcular economia",
    action_url: "/calculadora",
    secondary_action_label: null,
    secondary_action_url: null,
    icon: "battery",
    accent: "cyan",
    metadata: {},
    sort_order: 30,
    is_published: true,
  },
  {
    id: "default-utility-driver",
    block_key: "utility_driver",
    block_type: "utility",
    variant: "driver",
    eyebrow: "PARA MOTORISTAS",
    title: "Quanto cobrar por uma viagem?",
    description: "Monte uma referência profissional com quilômetros, horas e despesas.",
    action_label: "Montar orçamento",
    action_url: "/motorista/calculadora",
    secondary_action_label: null,
    secondary_action_url: null,
    icon: "calculator",
    accent: "orange",
    metadata: {},
    sort_order: 31,
    is_published: true,
  },
  {
    id: "default-quick-access",
    block_key: "quick_access",
    block_type: "quick_access",
    variant: "default",
    eyebrow: "ACESSO RÁPIDO",
    title: "Encontre o que precisa sem perder tempo.",
    description: "Conteúdo, ferramentas, manuais, parceiros e benefícios organizados em áreas próprias.",
    action_label: null,
    action_url: null,
    secondary_action_label: null,
    secondary_action_url: null,
    icon: "grid",
    accent: "blue",
    metadata: {},
    sort_order: 40,
    is_published: true,
  },
  {
    id: "default-videos",
    block_key: "videos",
    block_type: "videos",
    variant: "default",
    eyebrow: "DESTAQUES DO CANAL",
    title: "Conteúdo que representa o projeto.",
    description: null,
    action_label: "Ver todos",
    action_url: "/videos",
    secondary_action_label: null,
    secondary_action_url: null,
    icon: "videos",
    accent: "blue",
    metadata: {},
    sort_order: 50,
    is_published: true,
  },
  {
    id: "default-community",
    block_key: "community_cta",
    block_type: "cta",
    variant: "community",
    eyebrow: "PLATAFORMA PRÓPRIA",
    title: "Mais que um aplicativo: um ponto de encontro da comunidade.",
    description: "O JNE App é a casa oficial dos conteúdos, arquivos, parceiros e benefícios exclusivos.",
    action_label: "Conhecer a área VIP",
    action_url: "/membros",
    secondary_action_label: null,
    secondary_action_url: null,
    icon: "route",
    accent: "blue",
    metadata: {},
    sort_order: 60,
    is_published: true,
  },
  {
    id: "default-trust-content",
    block_key: "trust_content",
    block_type: "trust",
    variant: "default",
    eyebrow: null,
    title: "Conteúdo real",
    description: "Experiências práticas, testes e opinião transparente.",
    action_label: null,
    action_url: null,
    secondary_action_label: null,
    secondary_action_url: null,
    icon: "sparkles",
    accent: "blue",
    metadata: {},
    sort_order: 70,
    is_published: true,
  },
  {
    id: "default-trust-partners",
    block_key: "trust_partners",
    block_type: "trust",
    variant: "default",
    eyebrow: null,
    title: "Parceiros selecionados",
    description: "Empresas e serviços que agregam valor à comunidade.",
    action_label: null,
    action_url: null,
    secondary_action_label: null,
    secondary_action_url: null,
    icon: "handshake",
    accent: "green",
    metadata: {},
    sort_order: 71,
    is_published: true,
  },
];

export function getHomeVisualBlockIcon(icon: HomeVisualBlockIcon | null): LucideIcon {
  return icon ? iconMap[icon] ?? Sparkles : Sparkles;
}

export async function getHomeVisualBlocks(): Promise<HomeVisualBlockRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("home_visual_blocks")
      .select("id, block_key, block_type, variant, eyebrow, title, description, action_label, action_url, secondary_action_label, secondary_action_url, icon, accent, metadata, sort_order, is_published, created_at, updated_at")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Falha ao carregar os blocos visuais da home:", error.message);
      return defaultHomeVisualBlocks;
    }

    return (data ?? []) as HomeVisualBlockRow[];
  } catch (error) {
    console.warn("Falha inesperada ao carregar os blocos visuais da home:", error);
    return defaultHomeVisualBlocks;
  }
}
