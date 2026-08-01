"use client";

import Link from "next/link";
import { Bell, CheckCheck, ExternalLink, Filter, Inbox, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { NotificationCategory, NotificationRow } from "@/types/notification";

const GUEST_READ_KEY = "jne-notification-read-ids";
const GUEST_DISMISSED_KEY = "jne-notification-dismissed-ids";

const categoryLabels: Record<NotificationCategory, string> = {
  general: "Geral",
  videos: "Vídeos",
  tutorials: "Tutoriais",
  apps: "Aplicativos",
  benefits: "Benefícios",
  reservations: "Reservas",
};

type NotificationDisplay = NotificationRow & {
  publishedLabel: string;
};

type Props = {
  items: NotificationDisplay[];
  initialReadIds: string[];
  initialDismissedIds: string[];
  authenticated: boolean;
};

function storedGuestReads() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_READ_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}


function storedGuestDismissed() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_DISMISSED_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function NotificationCenter({ items, initialReadIds, initialDismissedIds, authenticated }: Props) {
  const [readIds, setReadIds] = useState<string[]>(initialReadIds);
  const [dismissedIds, setDismissedIds] = useState<string[]>(initialDismissedIds);
  const [category, setCategory] = useState<NotificationCategory | "all">("all");
  const [onlyUnread, setOnlyUnread] = useState(true);
  const readSet = useMemo(() => new Set(readIds), [readIds]);
  const dismissedSet = useMemo(() => new Set(dismissedIds), [dismissedIds]);

  useEffect(() => {
    if (authenticated) return;
    setReadIds((current) => Array.from(new Set([...current, ...storedGuestReads()])));
    setDismissedIds((current) => Array.from(new Set([...current, ...storedGuestDismissed()])));
  }, [authenticated]);

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        if (dismissedSet.has(item.id)) return false;
        if (category !== "all" && item.category !== category) return false;
        if (onlyUnread && readSet.has(item.id)) return false;
        return true;
      }),
    [category, dismissedSet, items, onlyUnread, readSet],
  );

  function persistGuest(nextIds: string[]) {
    localStorage.setItem(GUEST_READ_KEY, JSON.stringify(nextIds.slice(-300)));
  }

  async function markRead(notificationId: string) {
    if (readSet.has(notificationId)) return;
    const nextIds = [...readIds, notificationId];
    setReadIds(nextIds);

    if (authenticated) {
      await fetch("/api/notificacoes/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
    } else {
      persistGuest(nextIds);
    }

    window.dispatchEvent(new Event("jne-notifications-updated"));
  }

  async function markAllRead() {
    const nextIds = Array.from(new Set([...readIds, ...items.map((item) => item.id)]));
    setReadIds(nextIds);

    if (authenticated) {
      await fetch("/api/notificacoes/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } else {
      persistGuest(nextIds);
    }

    window.dispatchEvent(new Event("jne-notifications-updated"));
  }

  async function clearRead() {
    const nextDismissed = Array.from(new Set([...dismissedIds, ...readIds]));
    setDismissedIds(nextDismissed);

    if (authenticated) {
      await fetch("/api/notificacoes/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissRead: true }),
      });
    } else {
      localStorage.setItem(GUEST_DISMISSED_KEY, JSON.stringify(nextDismissed.slice(-300)));
    }

    window.dispatchEvent(new Event("jne-notifications-updated"));
  }

  const unreadCount = items.filter((item) => !readSet.has(item.id)).length;

  return (
    <div className="notification-center">
      <section className="notification-toolbar">
        <div className="notification-toolbar__summary">
          <Bell size={20} />
          <div>
            <strong>{unreadCount} não {unreadCount === 1 ? "lida" : "lidas"}</strong>
            <span>{onlyUnread ? "As lidas saem da lista ativa" : `${items.length} avisos no histórico`}</span>
          </div>
        </div>

        <div className="notification-toolbar__filters">
          <label>
            <Filter size={16} />
            <select value={category} onChange={(event) => setCategory(event.target.value as NotificationCategory | "all")}>
              <option value="all">Todas as categorias</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="notification-unread-toggle">
            <input type="checkbox" checked={onlyUnread} onChange={(event) => setOnlyUnread(event.target.checked)} />
            <span>Somente não lidas</span>
          </label>
          <button className="button button--secondary" type="button" onClick={() => void markAllRead()} disabled={!unreadCount}>
            <CheckCheck size={17} /> Marcar todas como lidas
          </button>
          <button className="button button--secondary" type="button" onClick={() => void clearRead()} disabled={!readIds.length}>
            <Trash2 size={17} /> Limpar lidas
          </button>
        </div>
      </section>

      <section className="notification-list">
        {visibleItems.map((item) => {
          const isRead = readSet.has(item.id);
          return (
            <article className={`notification-card ${isRead ? "is-read" : "is-unread"}`} key={item.id}>
              <div className="notification-card__topline">
                <span className={`notification-category notification-category--${item.category}`}>
                  {categoryLabels[item.category]}
                </span>
                <small>{item.publishedLabel}</small>
              </div>
              <h2>{item.title}</h2>
              <p>{item.message}</p>
              <div className="notification-card__actions">
                {!isRead ? (
                  <button className="text-link" type="button" onClick={() => void markRead(item.id)}>
                    <CheckCheck size={16} /> Marcar como lida
                  </button>
                ) : <span className="notification-read-label"><CheckCheck size={15} /> Lida</span>}
                {item.action_url ? (
                  <Link
                    className="button button--primary"
                    href={item.action_url}
                    onClick={() => void markRead(item.id)}
                    target={item.action_url.startsWith("http") ? "_blank" : undefined}
                    rel={item.action_url.startsWith("http") ? "noreferrer" : undefined}
                  >
                    Abrir <ExternalLink size={16} />
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}

        {!visibleItems.length ? (
          <article className="notification-empty">
            <Inbox size={34} />
            <h2>Nenhum aviso neste filtro</h2>
            <p>Altere a categoria ou desative o filtro de não lidas.</p>
          </article>
        ) : null}
      </section>
    </div>
  );
}
