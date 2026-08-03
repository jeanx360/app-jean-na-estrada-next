"use client";

import { CheckCircle2, Download, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { isPwaInstalled, markPwaInstalled } from "@/lib/pwa-client";

export function PwaInstallButton() {
  const [installReady, setInstallReady] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const refreshInstalled = () => {
      const nextInstalled = isPwaInstalled();
      if (nextInstalled) markPwaInstalled();
      setInstalled(nextInstalled);
    };

    refreshInstalled();

    const handleReady = () => setInstallReady(true);
    const handleInstalled = () => {
      markPwaInstalled();
      setInstalled(true);
      setInstallReady(false);
    };

    window.addEventListener("jne-install-ready", handleReady);
    window.addEventListener("jne-app-installed", handleInstalled);
    window.addEventListener("pageshow", refreshInstalled);
    window.addEventListener("focus", refreshInstalled);
    window.dispatchEvent(new Event("jne-query-install"));

    return () => {
      window.removeEventListener("jne-install-ready", handleReady);
      window.removeEventListener("jne-app-installed", handleInstalled);
      window.removeEventListener("pageshow", refreshInstalled);
      window.removeEventListener("focus", refreshInstalled);
    };
  }, []);

  if (installed) {
    return (
      <div className="install-status install-status--success" role="status">
        <CheckCircle2 size={20} />
        <span>O JNE App já está instalado neste dispositivo.</span>
      </div>
    );
  }

  if (!installReady) {
    return (
      <div className="install-status" role="status">
        <Smartphone size={20} />
        <span>Use as instruções abaixo caso o botão de instalação não apareça no seu navegador.</span>
      </div>
    );
  }

  return (
    <button
      className="button button--primary install-primary-button"
      type="button"
      onClick={() => window.dispatchEvent(new Event("jne-request-install"))}
    >
      <Download size={18} />
      Instalar JNE App
    </button>
  );
}
