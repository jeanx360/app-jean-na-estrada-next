"use client";

import Link from "next/link";
import { CheckCircle2, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { isPwaInstalled, markPwaInstalled } from "@/lib/pwa-client";

export function PwaInstallChecklistItem() {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");

    const refreshStatus = () => {
      const nextInstalled = isPwaInstalled();
      if (nextInstalled) markPwaInstalled();
      setInstalled(nextInstalled);
    };

    const handleInstalled = () => {
      markPwaInstalled();
      setInstalled(true);
    };

    refreshStatus();
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("jne-app-installed", handleInstalled);
    window.addEventListener("pageshow", refreshStatus);
    window.addEventListener("focus", refreshStatus);
    document.addEventListener("visibilitychange", refreshStatus);
    displayMode.addEventListener?.("change", refreshStatus);

    return () => {
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("jne-app-installed", handleInstalled);
      window.removeEventListener("pageshow", refreshStatus);
      window.removeEventListener("focus", refreshStatus);
      document.removeEventListener("visibilitychange", refreshStatus);
      displayMode.removeEventListener?.("change", refreshStatus);
    };
  }, []);

  return (
    <article className={installed ? "is-complete" : ""}>
      {installed ? <CheckCircle2 size={21} /> : <Download size={21} />}
      <div>
        <strong>Instalação</strong>
        <span>{installed ? "Aplicativo instalado" : "Atalho na tela inicial"}</span>
      </div>
      <Link href="/instalar">{installed ? "Ver detalhes" : "Abrir"}</Link>
    </article>
  );
}
