import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JNE App | Jean na Estrada",
    short_name: "JNE App",
    description:
      "Conteúdo automotivo, tutoriais, vídeos e benefícios em um só lugar.",
    start_url: "/",
    display: "standalone",
    background_color: "#07101d",
    theme_color: "#07101d",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
