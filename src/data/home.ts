import {
  BookOpenText,
  Handshake,
  PlaySquare,
  ShieldCheck,
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
    title: "Guias e tutoriais",
    description: "Vídeos, PDFs e arquivos reunidos por veículo.",
    href: "/tutoriais",
    icon: BookOpenText,
    accent: "cyan",
  },
  {
    title: "Aplicativos para carros",
    description: "Arquivos de apoio, compatibilidade e alertas de instalação.",
    href: "/aplicativos",
    icon: Smartphone,
    accent: "orange",
  },
  {
    title: "Membros VIP",
    description: "Estrutura reservada para futuros conteúdos e benefícios.",
    href: "/membros",
    icon: ShieldCheck,
    accent: "violet",
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
