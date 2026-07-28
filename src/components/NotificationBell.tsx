"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const GUEST_READ_KEY = "jne-notification-read-ids";

function guestReadIds() {
  try {
    const value = JSON.parse(localStorage.getItem(GUEST_READ_KEY) || "[]");
    return Array.isArray(value) ? new Set(value.filter((item): item is string => typeof item === "string")) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

export function NotificationBell() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/notificacoes/unread", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as {
        authenticated?: boolean;
        count?: number;
        ids?: string[];
      };

      if (data.authenticated) {
        setCount(data.count ?? 0);
        return;
      }

      const read = guestReadIds();
      setCount((data.ids ?? []).filter((id) => !read.has(id)).length);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60000);
    const handleUpdate = () => void refresh();
    window.addEventListener("jne-notifications-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("jne-notifications-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refresh]);

  return (
    <Link className="icon-button notification-button" href="/notificacoes" aria-label="Abrir notificações">
      <Bell size={20} />
      {count > 0 ? <span className="notification-count">{count > 99 ? "99+" : count}</span> : null}
    </Link>
  );
}
