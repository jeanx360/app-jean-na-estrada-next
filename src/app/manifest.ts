import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "JNE App | Jean na Estrada",
    short_name: "JNE App",
    description: "Conteúdo automotivo, comunidade e ferramentas profissionais para motoristas.",
    start_url: "/comecar?origem=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    orientation: "portrait",
    categories: ["automotive", "business", "productivity", "social"],
    prefer_related_applications: false,
    shortcuts: [
      {
        name: "Painel do motorista",
        short_name: "Motorista",
        description: "Abra a operação profissional do motorista.",
        url: "/motorista",
        icons: [{ src: "/icons/app-icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Calculadora de viagem",
        short_name: "Calcular",
        description: "Calcule uma referência profissional de viagem.",
        url: "/motorista/calculadora",
        icons: [{ src: "/icons/app-icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Central de ajuda",
        short_name: "Ajuda",
        description: "Encontre orientações e suporte do JNE App.",
        url: "/suporte",
        icons: [{ src: "/icons/app-icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    icons: [
      { src: "/icons/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/app-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
