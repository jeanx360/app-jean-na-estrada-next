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
  id?: string;
  name: string;
  description: string;
  compatibility: string;
  status: string;
  href: string;
  image?: string;
  version?: string;
  origin?: string;
  deliveryType?: "upload" | "external";
  fileName?: string;
  fileSize?: number;
  checksumSha256?: string;
  accessLevel?: "public" | "vip";
  buttonLabel?: string;
};

export type PartnerItem = {
  name: string;
  description: string;
  image: string;
  href: string;
  actionLabel: string;
  services: string[];
};

export type ProductItem = {
  name: string;
  description: string;
  category: string;
  retailer: "Shopee" | "Mercado Livre" | "Amazon";
  href: string;
  highlight?: string;
};

export type GuideSection = {
  title: string;
  description: string;
  points: string[];
};

export type ContactItem = {
  label: string;
  description: string;
  href: string;
  kind: "email" | "video" | "short-video" | "photo";
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
    status: "Disponível",
    href: "https://drive.google.com/drive/folders/1RPzQlNtSc0YC_rpFQf_IIgdB6WvejiLI?usp=drive_link",
    origin: "Jean na Estrada",
    deliveryType: "external",
    accessLevel: "public",
    buttonLabel: "Abrir arquivos",
  },
  {
    name: "GPack",
    description:
      "Pacote disponibilizado junto aos materiais do tutorial de desbloqueio da multimídia.",
    compatibility: "Pasta de apoio do Geely EX2",
    status: "Disponível",
    href: "https://drive.google.com/drive/folders/1RPzQlNtSc0YC_rpFQf_IIgdB6WvejiLI?usp=drive_link",
    origin: "Jean na Estrada",
    deliveryType: "external",
    accessLevel: "public",
    buttonLabel: "Abrir arquivos",
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

export const products: ProductItem[] = [
  {
    name: "Tapete para BYD Dolphin",
    description: "Jogo de tapetes para as versões do Dolphin, com peça traseira inteiriça.",
    category: "Acessórios",
    retailer: "Shopee",
    href: "https://s.shopee.com.br/60QGhL6SzG?share_channel_code=1",
    highlight: "Selecionado para o Dolphin",
  },
  {
    name: "Adaptador V2L 16A",
    description: "Adaptador com botão liga/desliga para veículos elétricos compatíveis com V2L.",
    category: "Energia e recarga",
    retailer: "Shopee",
    href: "https://s.shopee.com.br/7VF4U8v0Vd?share_channel_code=1",
    highlight: "Uso automotivo",
  },
  {
    name: "Streaming Box Carlinkit",
    description: "Solução Android para centrais com CarPlay ou Android Auto compatível.",
    category: "Multimídia",
    retailer: "Mercado Livre",
    href: "https://meli.la/1CG7XUY",
  },
  {
    name: "Adaptador CarPlay e Android Auto sem fio",
    description: "Alternativa para transformar uma conexão compatível por cabo em conexão sem fio.",
    category: "Multimídia",
    retailer: "Mercado Livre",
    href: "https://meli.la/1jRbS9B",
  },
  {
    name: "Câmera veicular 1080p",
    description: "Câmera compacta para registro do trânsito e apoio durante viagens.",
    category: "Segurança",
    retailer: "Amazon",
    href: "https://www.amazon.com/dp/B06bUJWik",
  },
  {
    name: "Azdome M550 Pro — 3 canais",
    description: "Conjunto de câmeras para gravação frontal, interna e traseira.",
    category: "Segurança",
    retailer: "Amazon",
    href: "https://www.amazon.com/dp/B0areF0CL",
  },
  {
    name: "Pneu Pirelli 215/50R17",
    description: "Opção de medida usada em projetos e configurações compatíveis com o Dolphin Plus.",
    category: "Pneus",
    retailer: "Mercado Livre",
    href: "https://meli.la/33xa5QL",
  },
  {
    name: "Pneu Pirelli 195/60R16",
    description: "Opção de medida para configurações compatíveis com o BYD Dolphin GS.",
    category: "Pneus",
    retailer: "Mercado Livre",
    href: "https://meli.la/2oVRfCq",
  },
];

export const beginnerGuide: GuideSection[] = [
  {
    title: "Entenda o carro elétrico",
    description:
      "Conheça os componentes principais antes de comparar modelos ou planejar a compra.",
    points: [
      "Motor elétrico, inversor, bateria de alta tensão e sistema de regeneração.",
      "Diferença entre potência, capacidade da bateria e autonomia.",
      "Consumo pode aparecer em km/kWh ou kWh/100 km.",
    ],
  },
  {
    title: "Aprenda sobre recarga",
    description:
      "A rotina melhora quando você entende potência, conectores e tempo de carregamento.",
    points: [
      "Recarga AC costuma ser usada em casa, condomínios e estacionamentos.",
      "Recarga DC é indicada para viagens e reposições mais rápidas.",
      "A potência aceita pelo carro pode limitar a velocidade mesmo em um carregador mais forte.",
    ],
  },
  {
    title: "Planeje seus custos",
    description:
      "Compare o custo por quilômetro e não apenas o valor total de uma recarga.",
    points: [
      "Use seu preço real de energia e a média de consumo do veículo.",
      "Inclua manutenção, seguro, pneus e desvalorização na decisão.",
      "A calculadora do JNE App ajuda a montar uma estimativa inicial.",
    ],
  },
  {
    title: "Cuide da bateria",
    description:
      "Uso normal não exige paranoia, mas alguns hábitos ajudam na rotina e na durabilidade.",
    points: [
      "Siga as recomendações do manual do veículo sobre carga e armazenamento.",
      "Evite deixar o carro parado por longos períodos em extremos de carga.",
      "Em viagens, considere margem de segurança e disponibilidade dos pontos de recarga.",
    ],
  },
  {
    title: "Avalie um elétrico usado",
    description:
      "Histórico, estado geral e garantia são mais importantes que uma única porcentagem isolada.",
    points: [
      "Confira revisões, campanhas, garantia e histórico de uso.",
      "Observe pneus, suspensão, freios, sistema de recarga e funcionamento da multimídia.",
      "Quando possível, solicite uma avaliação técnica da bateria e do veículo.",
    ],
  },
];

export const contactItems: ContactItem[] = [
  {
    label: "E-mail",
    description: "Contato comercial, propostas e assuntos profissionais.",
    href: "mailto:contato.jeannaestrada@gmail.com",
    kind: "email",
  },
  {
    label: "YouTube",
    description: "Vídeos completos, análises, tutoriais e transmissões.",
    href: "https://www.youtube.com/@jeannaestrada",
    kind: "video",
  },
  {
    label: "TikTok",
    description: "Vídeos curtos, cortes e atualizações rápidas.",
    href: "https://www.tiktok.com/@jeannaestrada",
    kind: "short-video",
  },
  {
    label: "Instagram",
    description: "Reels, stories, bastidores e contato com a comunidade.",
    href: "https://www.instagram.com/jeannaestradaoficial/",
    kind: "photo",
  },
];
