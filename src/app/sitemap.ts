import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app-jean-na-estrada-next.vercel.app";
  const routes = ["", "/videos", "/noticias", "/tutoriais", "/aplicativos", "/produtos", "/guia", "/calculadora", "/parceiros", "/contato", "/sobre", "/termos", "/privacidade", "/seguranca-apks"];
  return routes.map((route): MetadataRoute.Sitemap[number] => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
