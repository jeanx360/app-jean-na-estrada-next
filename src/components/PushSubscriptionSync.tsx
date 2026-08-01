"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationPreferences, PushSubscriptionPayload } from "@/types/notification";

const CATEGORY_STORAGE_KEY = "jne-push-categories";

const defaults: NotificationPreferences = {
  pushEnabled: true,
  general: true,
  videos: true,
  tutorials: true,
  apps: true,
  benefits: true,
  reservations: true,
};

function serialize(subscription: PushSubscription): PushSubscriptionPayload {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
  };
}

function preferences() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(CATEGORY_STORAGE_KEY) || "{}") };
  } catch {
    return defaults;
  }
}

export function PushSubscriptionSync() {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    async function sync() {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;

      await fetch("/api/push/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: serialize(subscription), categories: preferences() }),
      });
    }

    void sync();
    const { data } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void sync(), 350);
    });

    return () => data.subscription.unsubscribe();
  }, [supabase]);

  return null;
}
