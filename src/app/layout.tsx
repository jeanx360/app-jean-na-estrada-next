import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { AppShell } from "@/components/AppShell";
import { PwaManager } from "@/components/PwaManager";
import { PushSubscriptionSync } from "@/components/PushSubscriptionSync";
import "./globals.css";
import "./auth.css";

// O layout contém componentes dependentes da sessão. Renderizar por requisição
// evita reutilização de HTML/RSC entre usuários diferentes.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const basePath = process.env.PAGES_BASE_PATH ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://jneapp.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "JNE App | Jean na Estrada", template: "%s | JNE App" },
  description: "Conteúdo automotivo, comunidade, ferramentas profissionais para motoristas, parceiros e benefícios do Jean na Estrada em uma plataforma própria.",
  keywords: [
    "Jean na Estrada",
    "JNE App",
    "carros elétricos",
    "motorista profissional",
    "orçamentos de viagem",
    "gestão de clientes",
    "mobilidade elétrica",
  ],
  applicationName: "JNE App",
  manifest: `${basePath}/manifest.webmanifest`,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "JNE App",
    title: "JNE App | Jean na Estrada",
    description: "Conteúdo automotivo, comunidade e ferramentas profissionais para motoristas em uma plataforma própria.",
    images: [{ url: "/icons/app-icon-512.png", width: 512, height: 512, alt: "JNE App" }],
  },
  twitter: {
    card: "summary",
    title: "JNE App | Jean na Estrada",
    description: "Conteúdo automotivo, comunidade e ferramentas profissionais para motoristas.",
    images: ["/icons/app-icon-512.png"],
  },
  icons: {
    icon: [
      { url: `${basePath}/icons/favicon-16x16.png`, sizes: "16x16", type: "image/png" },
      { url: `${basePath}/icons/favicon-32x32.png`, sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: `${basePath}/icons/apple-touch-icon.png`, sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = { themeColor: "#050505", colorScheme: "dark", width: "device-width", initialScale: 1 };

const themeBootstrap = `(function(){try{var t=localStorage.getItem("jne-app-theme");var a=["dark","light","red","green","blue"];if(a.indexOf(t)===-1)t="dark";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" data-theme="dark" suppressHydrationWarning><Script id="jne-theme-bootstrap" strategy="beforeInteractive">{themeBootstrap}</Script><body><AppShell>{children}</AppShell><PwaManager /><PushSubscriptionSync /></body></html>;
}
