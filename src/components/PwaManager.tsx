"use client";

import { Download, RefreshCw, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { publicPath } from "@/lib/public-path";
import { clearPwaInstalledHint, isPwaInstalled, isRunningAsInstalledApp, markPwaInstalled } from "@/lib/pwa-client";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

async function removeDevelopmentPwaState() {
  const tasks: Promise<unknown>[] = [];

  if ("serviceWorker" in navigator) {
    tasks.push(
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister()))),
    );
  }

  if ("caches" in window) {
    tasks.push(
      caches
        .keys()
        .then((keys) => Promise.all(keys.filter((key) => key.startsWith("jne-app-")).map((key) => caches.delete(key)))),
    );
  }

  await Promise.all(tasks);
}

export function PwaManager() {
  const installPrompt = useRef<InstallPromptEvent | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [online, setOnline] = useState(true);
  const [installDismissed, setInstallDismissed] = useState(false);

  const requestInstall = useCallback(async () => {
    const prompt = installPrompt.current;
    if (!prompt) return;

    await prompt.prompt();
    const choice = await prompt.userChoice;

    if (choice.outcome === "accepted") {
      installPrompt.current = null;
      setCanInstall(false);
      markPwaInstalled();
      window.dispatchEvent(new Event("jne-app-installed"));
    }
  }, []);

  const applyUpdate = useCallback(() => {
    const waitingWorker = registrationRef.current?.waiting;
    if (waitingWorker) waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleInstallRequest = () => void requestInstall();
    const handleInstallQuery = () => {
      if (isPwaInstalled()) {
        markPwaInstalled();
        window.dispatchEvent(new Event("jne-app-installed"));
      } else if (installPrompt.current) {
        window.dispatchEvent(new Event("jne-install-ready"));
      }
    };

    if (isPwaInstalled()) {
      markPwaInstalled();
      setCanInstall(false);
      window.dispatchEvent(new Event("jne-app-installed"));
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("jne-request-install", handleInstallRequest);
    window.addEventListener("jne-query-install", handleInstallQuery);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("jne-request-install", handleInstallRequest);
      window.removeEventListener("jne-query-install", handleInstallQuery);
    };
  }, [requestInstall]);

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      if (isRunningAsInstalledApp()) {
        markPwaInstalled();
        setCanInstall(false);
        return;
      }
      clearPwaInstalledHint();
      installPrompt.current = event as InstallPromptEvent;
      setCanInstall(true);
      window.dispatchEvent(new Event("jne-install-ready"));
    };

    const handleInstalled = () => {
      installPrompt.current = null;
      setCanInstall(false);
      markPwaInstalled();
      window.dispatchEvent(new Event("jne-app-installed"));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      const hadController = Boolean(navigator.serviceWorker.controller);
      void removeDevelopmentPwaState().then(() => {
        if (hadController) window.location.reload();
      });
      return;
    }

    let refreshing = false;

    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    void navigator.serviceWorker
      .register(publicPath("/sw.js"), {
        scope: publicPath("/"),
        updateViaCache: "none",
      })
      .then((registration) => {
        registrationRef.current = registration;

        if (registration.waiting) setUpdateAvailable(true);

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
              window.dispatchEvent(new Event("jne-update-ready"));
            }
          });
        });

        window.dispatchEvent(new Event("jne-sw-ready"));
        void registration.update();
      })
      .catch((error) => {
        console.error("Não foi possível registrar o Service Worker:", error);
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return (
    <div className="pwa-toast-stack" aria-live="polite">
      {!online ? (
        <div className="pwa-toast pwa-toast--warning">
          <WifiOff size={19} />
          <div>
            <strong>Você está offline</strong>
            <span>As áreas de conta e VIP exigem conexão.</span>
          </div>
        </div>
      ) : null}

      {canInstall && !installDismissed ? (
        <div className="pwa-toast">
          <Download size={19} />
          <div>
            <strong>Instale o JNE App</strong>
            <span>Acesse pela tela inicial como um aplicativo.</span>
          </div>
          <button className="pwa-toast__action" type="button" onClick={() => void requestInstall()}>
            Instalar
          </button>
          <button
            className="pwa-toast__close"
            type="button"
            aria-label="Fechar aviso de instalação"
            onClick={() => setInstallDismissed(true)}
          >
            <X size={17} />
          </button>
        </div>
      ) : null}

      {updateAvailable ? (
        <div className="pwa-toast">
          <RefreshCw size={19} />
          <div>
            <strong>Nova versão disponível</strong>
            <span>Atualize para evitar arquivos antigos no navegador.</span>
          </div>
          <button className="pwa-toast__action" type="button" onClick={applyUpdate}>
            Atualizar
          </button>
        </div>
      ) : null}
    </div>
  );
}
