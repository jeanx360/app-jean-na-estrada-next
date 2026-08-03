import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://jneapp.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/membros",
        "/motorista/",
        "/perfil",
        "/aceite",
        "/vip",
        "/diagnostico",
        "/notificacoes",
        "/configuracoes",
        "/entrar",
        "/cadastro",
        "/recuperar-senha",
        "/atualizar-senha",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
