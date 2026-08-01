"use client";

import { useEffect } from "react";

type Source = "profile" | "qr" | "shared_link";

function sendEvent(driverSlug: string, eventType: "profile_view" | "whatsapp_click", source: Source) {
  void fetch("/api/motorista/perfil-evento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ driverSlug, eventType, source }),
    keepalive: true,
  });
}

export function DriverProfileEventTracker({ driverSlug, source = "profile" }: { driverSlug: string; source?: Source }) {
  useEffect(() => {
    try {
      const key = `jne-profile-view-${driverSlug}-${new Date().toISOString().slice(0, 10)}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        sendEvent(driverSlug, "profile_view", source);
      }
    } catch {
      sendEvent(driverSlug, "profile_view", source);
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-driver-event='whatsapp']") : null;
      if (target) sendEvent(driverSlug, "whatsapp_click", source);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [driverSlug, source]);
  return null;
}
