"use client";

import { useEffect } from "react";
import type { DriverMarketingSource } from "@/lib/driver-marketing";

function sendEvent(
  driverSlug: string,
  eventType: "profile_view" | "whatsapp_click",
  source: DriverMarketingSource,
  campaignCode: string,
) {
  void fetch("/api/motorista/perfil-evento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ driverSlug, eventType, source, campaignCode }),
    keepalive: true,
  });
}

export function DriverProfileEventTracker({
  driverSlug,
  source = "profile",
  campaignCode = "",
}: {
  driverSlug: string;
  source?: DriverMarketingSource;
  campaignCode?: string;
}) {
  useEffect(() => {
    try {
      const day = new Date().toISOString().slice(0, 10);
      const key = `jne-profile-view-${driverSlug}-${source}-${campaignCode || "none"}-${day}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        sendEvent(driverSlug, "profile_view", source, campaignCode);
      }
    } catch {
      sendEvent(driverSlug, "profile_view", source, campaignCode);
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-driver-event='whatsapp']")
        : null;
      if (target) sendEvent(driverSlug, "whatsapp_click", source, campaignCode);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [campaignCode, driverSlug, source]);
  return null;
}
