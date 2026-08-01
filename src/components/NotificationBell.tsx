"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BellRing, ChevronRight, Inbox, LoaderCircle, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatBrazilDateTime } from "@/lib/date-time";

const GUEST_READ_KEY = "jne-notification-read-ids";
const GUEST_DISMISSED_KEY = "jne-notification-dismissed-ids";

type NotificationCategory = "general" | "videos" | "tutorials" | "apps" | "benefits" | "reservations";

type FloatingNotification = {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  action_url: string | null;
  published_at: string;
};

const categoryLabels: Record<NotificationCategory, string> = {
  general: "Geral",
  videos: "Vídeo",
  tutorials: "Tutorial",
  apps: "Aplicativo",
  benefits: "Benefício",
  reservations: "Reserva",
};

function storedIds(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function formatPublishedAt(value: string) {
  return formatBrazilDateTime(value, { fallback: "" });
}

export function NotificationBell() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<FloatingNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
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

      const read = new Set(storedIds(GUEST_READ_KEY));
      const dismissed = new Set(storedIds(GUEST_DISMISSED_KEY));
      setCount((data.ids ?? []).filter((id) => !read.has(id) && !dismissed.has(id)).length);
    } catch {
      setCount(0);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setCount(0);

    try {
      const unreadResponse = await fetch("/api/notificacoes/unread", { cache: "no-store" });
      if (!unreadResponse.ok) return;
      const unreadData = (await unreadResponse.json()) as {
        authenticated?: boolean;
        ids?: string[];
      };

      if (unreadData.authenticated) {
        await fetch("/api/notificacoes/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
      } else {
        const nextIds = Array.from(new Set([...storedIds(GUEST_READ_KEY), ...(unreadData.ids ?? [])]));
        localStorage.setItem(GUEST_READ_KEY, JSON.stringify(nextIds.slice(-300)));
      }
    } finally {
      window.dispatchEvent(new Event("jne-notifications-updated"));
    }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notificacoes/recentes?limit=10", { cache: "no-store" });
      const data = (await response.json()) as {
        ok?: boolean;
        authenticated?: boolean;
        items?: FloatingNotification[];
        error?: string;
      };
      if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível carregar as notificações.");

      const read = new Set(storedIds(GUEST_READ_KEY));
      const dismissed = new Set(storedIds(GUEST_DISMISSED_KEY));
      const visibleItems = data.authenticated
        ? (data.items ?? [])
        : (data.items ?? []).filter((item) => !read.has(item.id) && !dismissed.has(item.id));
      setItems(visibleItems);
      return true;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as notificações.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setItems([]);
    setError(null);
  }, []);

  function toggleMenu() {
    if (open) {
      closeMenu();
      return;
    }

    setOpen(true);
    void (async () => {
      const loaded = await loadItems();
      if (loaded) await markAllRead();
    })();
  }

  useEffect(() => {
    void refreshCount();
    const interval = window.setInterval(() => void refreshCount(), 60000);
    const handleUpdate = () => void refreshCount();
    window.addEventListener("jne-notifications-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("jne-notifications-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refreshCount]);

  useEffect(() => {
    setOpen(false);
    setItems([]);
    setError(null);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closeMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, open]);

  return (
    <div className="notification-floating" ref={rootRef}>
      <button
        className={`icon-button notification-button ${open ? "is-open" : ""}`}
        type="button"
        aria-label="Abrir notificações"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggleMenu}
      >
        <Bell size={20} />
        {count > 0 ? <span className="notification-count">{count > 99 ? "99+" : count}</span> : null}
      </button>

      {open ? (
        <section className="notification-floating__panel" role="dialog" aria-label="Notificações recentes">
          <header className="notification-floating__header">
            <div>
              <span className="eyebrow">CENTRAL JNE</span>
              <strong><BellRing size={18} /> Notificações</strong>
              <small>Ao abrir, os avisos são marcados como lidos e não voltam a aparecer aqui.</small>
            </div>
            <button className="icon-button notification-floating__close" type="button" onClick={closeMenu} aria-label="Fechar notificações">
              <X size={18} />
            </button>
          </header>

          <div className="notification-floating__content">
            {loading ? (
              <div className="notification-floating__state"><LoaderCircle className="auth-spinner" size={24} /><span>Carregando avisos...</span></div>
            ) : error ? (
              <div className="notification-floating__state"><Inbox size={26} /><span>{error}</span><button className="text-link" type="button" onClick={() => void loadItems()}>Tentar novamente</button></div>
            ) : items.length ? (
              <div className="notification-floating__list">
                {items.map((item) => {
                  const content = (
                    <>
                      <div className="notification-floating__meta">
                        <span className={`notification-category notification-category--${item.category}`}>{categoryLabels[item.category]}</span>
                        <time dateTime={item.published_at}>{formatPublishedAt(item.published_at)}</time>
                      </div>
                      <strong>{item.title}</strong>
                      <p>{item.message}</p>
                      {item.action_url ? <span className="notification-floating__open">Abrir <ChevronRight size={16} /></span> : null}
                    </>
                  );

                  return item.action_url ? (
                    <Link
                      key={item.id}
                      href={item.action_url}
                      className="notification-floating__item"
                      target={item.action_url.startsWith("http") ? "_blank" : undefined}
                      rel={item.action_url.startsWith("http") ? "noreferrer" : undefined}
                      onClick={closeMenu}
                    >
                      {content}
                    </Link>
                  ) : (
                    <article key={item.id} className="notification-floating__item">{content}</article>
                  );
                })}
              </div>
            ) : (
              <div className="notification-floating__state"><Inbox size={28} /><strong>Tudo em dia</strong><span>Nenhuma notificação nova.</span></div>
            )}
          </div>

          <footer className="notification-floating__footer">
            <Link className="button button--secondary" href="/notificacoes" onClick={closeMenu}>
              Ver histórico completo <ChevronRight size={17} />
            </Link>
          </footer>
        </section>
      ) : null}
    </div>
  );
}
