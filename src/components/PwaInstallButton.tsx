"use client";

import { CheckCircle2, Download, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

export function PwaInstallButton() {
  const [installReady, setInstallReady] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);

    const handleReady = () => setInstallReady(true);
    const handleInstalled = () => {
      setInstalled(true);
      setInstallReady(false);
    };

    window.addEventListener("jne-install-ready", handleReady);
    window.addEventListener("jne-app-installed", handleInstalled);
    window.dispatchEvent(new Event("jne-query-install"));

    return () => {
      window.removeEventListener("jne-install-ready", handleReady);
      window.removeEventListener("jne-app-installed", handleInstalled);
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
