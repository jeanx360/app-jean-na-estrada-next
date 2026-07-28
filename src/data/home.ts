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
    description: "Conteúdo organizado para você encontrar rapidamente.",
    href: "/tutoriais",
    icon: BookOpenText,
    accent: "cyan",
  },
  {
    title: "Aplicativos para carros",
    description: "Área preparada para APKs, compatibilidade e instruções.",
    href: "/aplicativos",
    icon: Smartphone,
    accent: "orange",
  },
  {
    title: "Membros VIP",
    description: "Conteúdos e benefícios exclusivos em uma futura etapa.",
    href: "/membros",
    icon: ShieldCheck,
    accent: "violet",
  },
];

export const featuredVideos = [
  {
    title: "BYD Dolphin aos 300 mil km",
    description: "Um caso real de alta quilometragem e uso intenso.",
    tag: "ALTA QUILOMETRAGEM",
    videoId: "tlTpTLeQGKA",
    href: "https://www.youtube.com/watch?v=tlTpTLeQGKA",
  },
  {
    title: "Geely EX2 desbloqueado",
    description: "Demonstração e orientações sobre a central multimídia.",
    tag: "TUTORIAL",
    videoId: "_MK0Kzi_jw8",
    href: "https://www.youtube.com/watch?v=_MK0Kzi_jw8",
  },
  {
    title: "Conhecendo o BYD Sealion 7",
    description: "Apresentação do SUV elétrico e suas principais características.",
    tag: "LANÇAMENTO",
    videoId: "8VUeb1l87f4",
    href: "https://www.youtube.com/watch?v=8VUeb1l87f4",
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
