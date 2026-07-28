"use client";

import { BellOff, BellRing, CheckCircle2, LoaderCircle, Save, Smartphone } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { NotificationPreferences, PushSubscriptionPayload } from "@/types/notification";

const CATEGORY_STORAGE_KEY = "jne-push-categories";
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

const defaults: NotificationPreferences = {
  pushEnabled: false,
  general: true,
  videos: true,
  tutorials: true,
  apps: true,
  benefits: true,
};

const categories = [
  { key: "general", label: "Avisos gerais" },
  { key: "videos", label: "Novos vídeos" },
  { key: "tutorials", label: "Tutoriais" },
  { key: "apps", label: "Aplicativos" },
  { key: "benefits", label: "Parceiros e benefícios" },
] as const;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

function serializeSubscription(subscription: PushSubscription): PushSubscriptionPayload {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
  };
}

function loadLocalCategories() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CATEGORY_STORAGE_KEY) || "{}");
    return { ...defaults, ...parsed, pushEnabled: false } as NotificationPreferences;
  } catch {
    return defaults;
  }
}

export function PushNotificationSettings() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaults);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const pushReady = useMemo(() => Boolean(vapidPublicKey), []);

  const syncCurrentState = useCallback(async () => {
    const isSupported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(isSupported);
    if (!isSupported) return;

    setPermission(Notification.permission);
    const response = await fetch("/api/push/preferences", { cache: "no-store" });
    const data = response.ok
      ? ((await response.json()) as { preferences?: NotificationPreferences })
      : {};
    const local = loadLocalCategories();
    setPreferences(data.preferences ? { ...local, ...data.preferences } : local);

    if (process.env.NODE_ENV === "production") {
      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();
      setSubscribed(Boolean(current));
    }
  }, []);

  useEffect(() => {
    void syncCurrentState();
  }, [syncCurrentState]);

  async function saveSubscription(subscription: PushSubscription, nextPreferences: NotificationPreferences) {
    const response = await fetch("/api/push/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: serializeSubscription(subscription),
        categories: nextPreferences,
      }),
    });

    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível salvar a assinatura.");
  }

  async function enablePush() {
    if (!supported || !pushReady) return;
    setBusy(true);
    setMessage("");

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setMessage("A permissão não foi concedida. Você pode liberá-la nas configurações do navegador.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const nextPreferences = { ...preferences, pushEnabled: true };
      await saveSubscription(subscription, nextPreferences);
      await fetch("/api/push/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextPreferences),
      });

      localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(nextPreferences));
      setPreferences(nextPreferences);
      setSubscribed(true);
      setMessage("Notificações ativadas neste dispositivo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível ativar as notificações.");
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    if (!supported) return;
    setBusy(true);
    setMessage("");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      const nextPreferences = { ...preferences, pushEnabled: false };
      await fetch("/api/push/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextPreferences),
      });
      setPreferences(nextPreferences);
      setSubscribed(false);
      setMessage("Notificações desativadas neste dispositivo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível desativar as notificações.");
    } finally {
      setBusy(false);
    }
  }

  async function savePreferences() {
    setBusy(true);
    setMessage("");

    try {
      localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(preferences));
      await fetch("/api/push/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (subscribed && process.env.NODE_ENV === "production") {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) await saveSubscription(subscription, preferences);
      }

      setMessage("Preferências salvas.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar as preferências.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="push-settings-card">
      <div className="push-settings-card__heading">
        <span className="push-settings-card__icon"><BellRing size={24} /></span>
        <div>
          <span>NOTIFICAÇÕES PUSH</span>
          <h2>Receba os avisos importantes</h2>
          <p>Escolha quais novidades podem aparecer no celular ou computador, mesmo com o app fechado.</p>
        </div>
      </div>

      {supported === false ? (
        <div className="push-support-warning">
          <BellOff size={20} />
          <p>Este navegador não oferece suporte a notificações Web Push.</p>
        </div>
      ) : null}

      {!pushReady ? (
        <div className="push-support-warning">
          <Smartphone size={20} />
          <p>As chaves VAPID ainda não foram configuradas no ambiente.</p>
        </div>
      ) : null}

      {process.env.NODE_ENV !== "production" ? (
        <div className="push-support-warning">
          <Smartphone size={20} />
          <p>Teste o recebimento push no endereço HTTPS publicado na Vercel. No ambiente local o Service Worker fica desativado para evitar cache antigo.</p>
        </div>
      ) : null}

      <div className="push-status-row">
        <span className={`push-status ${subscribed ? "is-active" : ""}`}>
          {subscribed ? <CheckCircle2 size={17} /> : <BellOff size={17} />}
          {subscribed ? "Ativas neste dispositivo" : "Desativadas neste dispositivo"}
        </span>
        {subscribed ? (
          <button className="button button--secondary" type="button" onClick={() => void disablePush()} disabled={busy}>
            <BellOff size={17} /> Desativar
          </button>
        ) : (
          <button
            className="button button--primary"
            type="button"
            onClick={() => void enablePush()}
            disabled={busy || !supported || !pushReady || process.env.NODE_ENV !== "production"}
          >
            {busy ? <LoaderCircle className="is-spinning" size={17} /> : <BellRing size={17} />}
            Ativar notificações
          </button>
        )}
      </div>

      {permission === "denied" ? (
        <p className="auth-message auth-message--error">A permissão está bloqueada no navegador. Abra as configurações do site para liberar.</p>
      ) : null}

      <div className="push-category-grid">
        {categories.map((item) => (
          <label className="push-category-option" key={item.key}>
            <input
              type="checkbox"
              checked={preferences[item.key]}
              onChange={(event) => setPreferences((current) => ({ ...current, [item.key]: event.target.checked }))}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      <button className="button button--secondary" type="button" onClick={() => void savePreferences()} disabled={busy}>
        <Save size={17} /> Salvar preferências
      </button>

      {message ? <p className="push-settings-message">{message}</p> : null}
    </section>
  );
}
