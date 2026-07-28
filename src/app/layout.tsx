import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const basePath = process.env.PAGES_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: {
    default: "JNE App | Jean na Estrada",
    template: "%s | JNE App",
  },
  description:
    "Vídeos, tutoriais, aplicativos automotivos, parceiros e conteúdos do Jean na Estrada em um só lugar.",
  applicationName: "JNE App",
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${basePath}/icons/favicon-16x16.png`, sizes: "16x16", type: "image/png" },
      { url: `${basePath}/icons/favicon-32x32.png`, sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: `${basePath}/icons/apple-touch-icon.png`, sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#07101d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("jne-app-theme");var a=["dark","light","red","green","blue"];if(a.indexOf(t)===-1)t="dark";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}})();`,
          }}
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
