import {
  BookOpenText,
  Calculator,
  Handshake,
  PlaySquare,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type QuickAccessItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: "blue" | "cyan" | "orange" | "violet";
};

export const quickAccessItems: QuickAccessItem[] = [
  {
    title: "Vídeos do canal",
    description: "Análises, testes reais, lançamentos e bastidores.",
    href: "/videos",
    icon: PlaySquare,
    accent: "blue",
  },
  {
    title: "Guia e manuais",
    description: "Aprenda o básico e encontre documentos por veículo e ano.",
    href: "/guia",
    icon: BookOpenText,
    accent: "cyan",
  },
  {
    title: "Aplicativos para carros",
    description: "Arquivos de apoio, compatibilidade e alertas de instalação.",
    href: "/catalogo?tipo=aplicativos",
    icon: Smartphone,
    accent: "orange",
  },
  {
    title: "Produtos recomendados",
    description: "Itens automotivos e tecnológicos selecionados para a comunidade.",
    href: "/catalogo?tipo=produtos",
    icon: ShoppingBag,
    accent: "violet",
  },
  {
    title: "Calculadora EV",
    description: "Compare custos de energia, combustível e manutenção.",
    href: "/calculadora",
    icon: Calculator,
    accent: "cyan",
  },
  {
    title: "Membros VIP",
    description: "Conteúdos, arquivos e benefícios exclusivos para membros.",
    href: "/membros",
    icon: ShieldCheck,
    accent: "orange",
  },
];

export const trustItems: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Conteúdo real",
    description: "Experiências práticas, testes e opinião transparente.",
    icon: Sparkles,
  },
  {
    title: "Parceiros selecionados",
    description: "Empresas e serviços que agregam valor à comunidade.",
    icon: Handshake,
  },
];
