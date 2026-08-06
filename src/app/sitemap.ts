import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://jneapp.app";
  const routes = [
    "",
    "/comecar",
    "/planos",
    "/motoristas",
    "/videos",
    "/noticias",
    "/tutoriais",
    "/catalogo",
    "/aplicativos",
    "/produtos",
    "/guia",
    "/calculadora",
    "/parceiros",
    "/instalar",
    "/suporte",
    "/contato",
    "/sobre",
    "/termos",
    "/privacidade",
    "/seguranca-apks",
  ];

  return routes.map((route): MetadataRoute.Sitemap[number] => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" || route === "/noticias" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/comecar" || route === "/planos" ? 0.85 : 0.7,
  }));
}
