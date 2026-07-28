import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JNE App | Jean na Estrada",
    short_name: "JNE App",
    description:
      "Conteúdo automotivo, tutoriais, vídeos e benefícios em um só lugar.",
    start_url: ".",
    display: "standalone",
    background_color: "#07101d",
    theme_color: "#07101d",
    orientation: "portrait",
    icons: [
      {
        src: "icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
