export type VideoItem = {
  title: string;
  description: string;
  tag: string;
  videoId: string;
  href: string;
};

export type TutorialResource = {
  label: string;
  description: string;
  href: string;
  kind: "video" | "pdf" | "drive";
};

export type TutorialItem = {
  slug: string;
  title: string;
  description: string;
  vehicle: string;
  level: "Básico" | "Intermediário" | "Avançado";
  status: "Disponível" | "Em preparação";
  resources: TutorialResource[];
};

export type ApplicationItem = {
  name: string;
  description: string;
  compatibility: string;
  status: "Disponível no Drive" | "Em validação";
  href: string;
};

export type PartnerItem = {
  name: string;
  description: string;
  image: string;
  href: string;
  actionLabel: string;
  services: string[];
};

export const videos: VideoItem[] = [
  {
    title: "BYD Dolphin aos 300 mil km",
    description:
      "Um caso real de uso intenso, manutenção e durabilidade de um carro elétrico com alta quilometragem.",
    tag: "ALTA QUILOMETRAGEM",
    videoId: "tlTpTLeQGKA",
    href: "https://www.youtube.com/watch?v=tlTpTLeQGKA",
  },
  {
    title: "Tutorial de desbloqueio do Geely EX2",
    description:
      "Passo a passo para liberar a central multimídia e preparar a instalação de aplicativos.",
    tag: "TUTORIAL",
    videoId: "T-77g9hn5LU",
    href: "https://www.youtube.com/watch?v=T-77g9hn5LU",
  },
  {
    title: "Conhecendo o BYD Sealion 7",
    description:
      "Apresentação do SUV elétrico, acabamento, espaço interno e principais características.",
    tag: "LANÇAMENTO",
    videoId: "8VUeb1l87f4",
    href: "https://www.youtube.com/watch?v=8VUeb1l87f4",
  },
];

export const tutorials: TutorialItem[] = [
  {
    slug: "desbloqueio-geely-ex2",
    title: "Geely EX2 — desbloqueio completo",
    description:
      "Vídeo, manual em PDF e pasta com os arquivos de apoio reunidos em um único lugar.",
    vehicle: "Geely EX2",
    level: "Intermediário",
    status: "Disponível",
    resources: [
      {
        label: "Assistir ao tutorial",
        description: "Passo a passo completo publicado no YouTube.",
        href: "https://www.youtube.com/watch?v=T-77g9hn5LU",
        kind: "video",
      },
      {
        label: "Abrir o guia em PDF",
        description: "Manual de apoio para acompanhar o procedimento.",
        href: "https://github.com/jeanx360/app-jean-estrada/raw/refs/heads/main/arquivos/guia-desbloqueio-geely-ex2.pdf",
        kind: "pdf",
      },
      {
        label: "Acessar os arquivos",
        description: "Pasta no Google Drive com aplicativos e materiais relacionados.",
        href: "https://drive.google.com/drive/folders/1RPzQlNtSc0YC_rpFQf_IIgdB6WvejiLI?usp=drive_link",
        kind: "drive",
      },
    ],
  },
];

export const applications: ApplicationItem[] = [
  {
    name: "Netflix",
    description:
      "Arquivo disponibilizado como apoio para instalação em centrais multimídia compatíveis.",
    compatibility: "Pasta de apoio do Geely EX2",
    status: "Disponível no Drive",
    href: "https://drive.google.com/drive/folders/1RPzQlNtSc0YC_rpFQf_IIgdB6WvejiLI?usp=drive_link",
  },
  {
    name: "GPack",
    description:
      "Pacote disponibilizado junto aos materiais do tutorial de desbloqueio da multimídia.",
    compatibility: "Pasta de apoio do Geely EX2",
    status: "Disponível no Drive",
    href: "https://drive.google.com/drive/folders/1RPzQlNtSc0YC_rpFQf_IIgdB6WvejiLI?usp=drive_link",
  },
];

export const partners: PartnerItem[] = [
  {
    name: "E-VOLK Eletropostos",
    description:
      "Estrutura de recarga rápida e serviços para motoristas de veículos elétricos em Porto Alegre.",
    image: "/partners/banner-evolk.webp",
    href: "https://www.evolkeletropostos.com.br/",
    actionLabel: "Conhecer a E-VOLK",
    services: ["Recarga rápida", "Recarga AC", "Atendimento 24 horas"],
  },
  {
    name: "Xtreme Motor Sports",
    description:
      "Oficina especializada em veículos elétricos, híbridos e a combustão em Cachoeirinha.",
    image: "/partners/banner-xtreme.webp",
    href: "https://wa.me/555134713293",
    actionLabel: "Falar pelo WhatsApp",
    services: ["Diagnóstico eletrônico", "Manutenção", "Freios e suspensão"],
  },
  {
    name: "Dudyscar Pintura Automotiva",
    description:
      "Pintura, retoques, recuperação de para-choques e cuidados estéticos em Canoas.",
    image: "/partners/banner-dudyscar.webp",
    href: "https://wa.me/555198303983",
    actionLabel: "Falar pelo WhatsApp",
    services: ["Pintura automotiva", "Retoques", "Polimento e cristalização"],
  },
];
