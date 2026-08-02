"use client";

import { useEffect } from "react";
import {
  DRIVER_PUBLIC_EVENT_TYPES,
  type DriverMarketingSource,
  type DriverPublicEventType,
} from "@/lib/driver-marketing";

const clickableEvents = new Set<DriverPublicEventType>([
  "whatsapp_click",
  "reservation_cta",
  "contact_save",
]);

export function trackDriverPublicEvent(
  driverSlug: string,
  eventType: DriverPublicEventType,
  source: DriverMarketingSource,
  campaignCode: string,
  packageId?: string | null,
) {
  void fetch("/api/motorista/perfil-evento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ driverSlug, eventType, source, campaignCode, packageId: packageId || null }),
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
        trackDriverPublicEvent(driverSlug, "profile_view", source, campaignCode);
      }
    } catch {
      trackDriverPublicEvent(driverSlug, "profile_view", source, campaignCode);
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-driver-event]")
        : null;
      const eventType = target?.dataset.driverEvent as DriverPublicEventType | undefined;
      if (eventType && clickableEvents.has(eventType) && DRIVER_PUBLIC_EVENT_TYPES.includes(eventType)) {
        trackDriverPublicEvent(driverSlug, eventType, source, campaignCode);
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [campaignCode, driverSlug, source]);

  return null;
}
