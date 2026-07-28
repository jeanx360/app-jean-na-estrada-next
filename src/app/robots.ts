import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app-jean-na-estrada-next.vercel.app";
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/membros", "/vip", "/perfil", "/aceite", "/diagnostico"] }, sitemap: `${baseUrl}/sitemap.xml` };
}
