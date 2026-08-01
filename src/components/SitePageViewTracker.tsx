"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function SitePageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("adminPreview")) return;

    const timer = window.setTimeout(() => {
      void fetch("/api/analytics/page-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname }),
        keepalive: true,
        cache: "no-store",
      }).catch(() => undefined);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
