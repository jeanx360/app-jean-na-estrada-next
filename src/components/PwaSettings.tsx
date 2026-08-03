"use client";

import { CheckCircle2, Download, RefreshCw, Smartphone, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { isPwaInstalled, markPwaInstalled } from "@/lib/pwa-client";

export function PwaSettings() {
  const [online, setOnline] = useState(true);
  const [installed, setInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine);
    const updateInstalled = () => {
      const nextInstalled = isPwaInstalled();
      if (nextInstalled) markPwaInstalled();
      setInstalled(nextInstalled);
    };
    const handleInstallReady = () => setCanInstall(true);
    const handleInstalled = () => {
      markPwaInstalled();
      setInstalled(true);
      setCanInstall(false);
    };
    const handleSwReady = () => setServiceWorkerReady(true);

    updateConnection();
    updateInstalled();
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setServiceWorkerReady(Boolean(navigator.serviceWorker?.controller));

    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    window.addEventListener("jne-install-ready", handleInstallReady);
    window.addEventListener("jne-app-installed", handleInstalled);
    window.addEventListener("jne-sw-ready", handleSwReady);
    window.addEventListener("pageshow", updateInstalled);
    window.addEventListener("focus", updateInstalled);
    window.dispatchEvent(new Event("jne-query-install"));

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      window.removeEventListener("jne-install-ready", handleInstallReady);
      window.removeEventListener("jne-app-installed", handleInstalled);
      window.removeEventListener("jne-sw-ready", handleSwReady);
      window.removeEventListener("pageshow", updateInstalled);
      window.removeEventListener("focus", updateInstalled);
    };
  }, []);

  const requestInstall = () => {
    window.dispatchEvent(new Event("jne-request-install"));
  };

  const checkForUpdates = async () => {
    const registration = await navigator.serviceWorker?.getRegistration();
    await registration?.update();
  };

  return (
    <div className="settings-grid">
      <section className="settings-card settings-card--highlight">
        <div className="settings-card__icon">
          <Smartphone size={24} />
        </div>
        <div>
          <span className="settings-card__eyebrow">Instalação</span>
          <h2>{installed ? "JNE App instalado" : "Instale na tela inicial"}</h2>
          <p>
            {installed
              ? "Você está usando a experiência instalada do aplicativo."
              : "Abra o JNE App sem precisar procurar o endereço no navegador."}
          </p>
        </div>
        {installed ? (
          <span className="status-pill status-pill--success">
            <CheckCircle2 size={15} /> Instalado
          </span>
        ) : canInstall ? (
          <button className="button button--primary" type="button" onClick={requestInstall}>
            <Download size={17} /> Instalar aplicativo
          </button>
        ) : (
          <span className="status-pill">Aguardando navegador</span>
        )}
      </section>

      {isIos && !installed ? (
        <section className="settings-card settings-card--wide">
          <div className="settings-card__icon">
            <Download size={22} />
          </div>
          <div>
            <span className="settings-card__eyebrow">iPhone e iPad</span>
            <h2>Adicionar à Tela de Início</h2>
            <p>
              No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.
            </p>
          </div>
        </section>
      ) : null}

      <section className="settings-card">
        <div className="settings-card__icon">
          {online ? <Wifi size={22} /> : <WifiOff size={22} />}
        </div>
        <div>
          <span className="settings-card__eyebrow">Conexão</span>
          <h2>{online ? "Conectado" : "Modo offline"}</h2>
          <p>
            {online
              ? "O aplicativo pode buscar conteúdo novo normalmente."
              : "Você pode continuar acessando as páginas que já foram armazenadas."}
          </p>
        </div>
        <span className={`status-pill ${online ? "status-pill--success" : "status-pill--warning"}`}>
          {online ? "Online" : "Offline"}
        </span>
      </section>

      <section className="settings-card">
        <div className="settings-card__icon">
          <RefreshCw size={22} />
        </div>
        <div>
          <span className="settings-card__eyebrow">Atualizações</span>
          <h2>{serviceWorkerReady ? "Atualização automática ativa" : "Preparando atualização"}</h2>
          <p>O app verifica novas versões sem apagar suas preferências de tema.</p>
        </div>
        <button className="button button--secondary" type="button" onClick={() => void checkForUpdates()}>
          Verificar agora
        </button>
      </section>

      <section className="settings-note">
        <strong>Como funciona o modo offline?</strong>
        <p>
          O JNE App guarda a estrutura e as páginas visitadas. Conteúdos externos, como vídeos do
          YouTube e arquivos do Drive, ainda precisam de internet para abrir.
        </p>
      </section>
    </div>
  );
}
