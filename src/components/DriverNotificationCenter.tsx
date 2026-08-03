"use client";

import Link from "next/link";
import {
  Archive,
  BellRing,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  Inbox,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatBrazilDateTime } from "@/lib/date-time";
import type { NotificationCategory, NotificationPriority } from "@/types/notification";

export type DriverNotificationItem = {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  action_url: string | null;
  automation_type: string | null;
  source_entity_type: string | null;
  source_entity_id: string | null;
  published_at: string;
  expires_at: string | null;
  read_at: string | null;
  dismissed_at: string | null;
};

type StatusFilter = "active" | "unread" | "read" | "archived" | "all";

const categoryLabels: Partial<Record<NotificationCategory, string>> = {
  agenda: "Agenda",
  customers: "Clientes",
  quotes: "Orçamentos",
  finance: "Financeiro",
  network: "Rede",
  subscription: "Assinatura",
  administration: "Administração",
  reservations: "Reservas",
};

const priorityLabels: Record<NotificationPriority, string> = {
  low: "Informativo",
  normal: "Normal",
  high: "Importante",
  urgent: "Urgente",
};

async function postState(payload: Record<string, unknown>) {
  const response = await fetch("/api/notificacoes/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  });
  const data = (await response.json()) as { ok?: boolean; error?: string };
  if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível atualizar a notificação.");
}

export function DriverNotificationCenter({ initialItems }: { initialItems: DriverNotificationItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [category, setCategory] = useState<NotificationCategory | "all">("all");
  const [priority, setPriority] = useState<NotificationPriority | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const visibleItems = useMemo(() => items.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (priority !== "all" && item.priority !== priority) return false;
    if (status === "archived") return Boolean(item.dismissed_at);
    if (status === "unread") return !item.dismissed_at && !item.read_at;
    if (status === "read") return !item.dismissed_at && Boolean(item.read_at);
    if (status === "active") return !item.dismissed_at;
    return true;
  }), [category, items, priority, status]);

  const unreadCount = items.filter((item) => !item.read_at && !item.dismissed_at).length;
  const archivedCount = items.filter((item) => item.dismissed_at).length;

  async function update(payload: Record<string, unknown>, apply: (current: DriverNotificationItem[]) => DriverNotificationItem[]) {
    setBusy(true);
    setMessage("");
    try {
      await postState(payload);
      setItems(apply);
      window.dispatchEvent(new Event("jne-notifications-updated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a central.");
    } finally {
      setBusy(false);
    }
  }

  function markRead(id: string) {
    const now = new Date().toISOString();
    void update({ notificationId: id }, (current) => current.map((item) => item.id === id ? { ...item, read_at: now } : item));
  }

  function archive(id: string) {
    const now = new Date().toISOString();
    void update({ dismissNotificationId: id }, (current) => current.map((item) => item.id === id ? { ...item, read_at: item.read_at ?? now, dismissed_at: now } : item));
  }

  function restore(id: string) {
    void update({ restoreNotificationId: id }, (current) => current.map((item) => item.id === id ? { ...item, dismissed_at: null } : item));
  }

  function markAllRead() {
    const ids = items.filter((item) => !item.dismissed_at && !item.read_at).map((item) => item.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    void update({ notificationIds: ids }, (current) => current.map((item) => ids.includes(item.id) ? { ...item, read_at: now } : item));
  }

  function archiveRead() {
    const ids = items.filter((item) => item.read_at && !item.dismissed_at).map((item) => item.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    void update({ dismissNotificationIds: ids }, (current) => current.map((item) => ids.includes(item.id) ? { ...item, dismissed_at: now } : item));
  }

  return (
    <section className="driver-notification-center">
      <header className="driver-notification-summary">
        <div>
          <span className="driver-notification-summary__icon"><BellRing size={24} /></span>
          <div>
            <small>CENTRAL PROFISSIONAL</small>
            <h2>{unreadCount} {unreadCount === 1 ? "alerta não lido" : "alertas não lidos"}</h2>
            <p>Os avisos sugerem ações. O sistema não envia mensagens nem altera reservas automaticamente.</p>
          </div>
        </div>
        <div className="driver-notification-summary__numbers">
          <span><strong>{items.length - archivedCount}</strong> ativos</span>
          <span><strong>{archivedCount}</strong> arquivados</span>
        </div>
      </header>

      <div className="driver-notification-toolbar">
        <div className="driver-notification-filters">
          <label>
            <SlidersHorizontal size={16} />
            <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
              <option value="active">Ativos</option>
              <option value="unread">Não lidos</option>
              <option value="read">Lidos</option>
              <option value="archived">Arquivados</option>
              <option value="all">Todos</option>
            </select>
          </label>
          <label>
            <select value={category} onChange={(event) => setCategory(event.target.value as NotificationCategory | "all")}>
              <option value="all">Todas as áreas</option>
              {Object.entries(categoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <select value={priority} onChange={(event) => setPriority(event.target.value as NotificationPriority | "all")}>
              <option value="all">Todas as prioridades</option>
              {Object.entries(priorityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="driver-notification-toolbar__actions">
          <button className="button button--secondary button--compact" type="button" onClick={markAllRead} disabled={busy || unreadCount === 0}>
            <CheckCheck size={16} /> Marcar lidas
          </button>
          <button className="button button--secondary button--compact" type="button" onClick={archiveRead} disabled={busy || !items.some((item) => item.read_at && !item.dismissed_at)}>
            <Archive size={16} /> Arquivar lidas
          </button>
        </div>
      </div>

      {message ? <p className="auth-message auth-message--error">{message}</p> : null}

      <div className="driver-notification-list">
        {visibleItems.map((item) => {
          const archived = Boolean(item.dismissed_at);
          const read = Boolean(item.read_at);
          return (
            <article className={`driver-notification-card priority-${item.priority}${read ? " is-read" : ""}${archived ? " is-archived" : ""}`} key={item.id}>
              <div className="driver-notification-card__topline">
                <div>
                  <span className={`driver-notification-priority priority-${item.priority}`}>
                    {item.priority === "urgent" || item.priority === "high" ? <CircleAlert size={14} /> : null}
                    {priorityLabels[item.priority]}
                  </span>
                  <span className="driver-notification-category">{categoryLabels[item.category] ?? "Aviso"}</span>
                </div>
                <time dateTime={item.published_at}>{formatBrazilDateTime(item.published_at)}</time>
              </div>
              <h3>{item.title}</h3>
              <p>{item.message}</p>
              <footer>
                <div className="driver-notification-card__state">
                  {archived ? <span><Archive size={15} /> Arquivada</span> : read ? <span><CheckCheck size={15} /> Lida</span> : <button className="text-link" type="button" onClick={() => markRead(item.id)} disabled={busy}><CheckCheck size={15} /> Marcar como lida</button>}
                </div>
                <div className="driver-notification-card__actions">
                  {archived ? (
                    <button className="button button--secondary button--compact" type="button" onClick={() => restore(item.id)} disabled={busy}><RotateCcw size={15} /> Restaurar</button>
                  ) : (
                    <button className="button button--secondary button--compact" type="button" onClick={() => archive(item.id)} disabled={busy}><Archive size={15} /> Arquivar</button>
                  )}
                  {item.action_url && !archived ? (
                    <Link className="button button--primary button--compact" href={item.action_url} onClick={() => markRead(item.id)}>
                      Abrir ação <ChevronRight size={16} />
                    </Link>
                  ) : null}
                </div>
              </footer>
            </article>
          );
        })}

        {!visibleItems.length ? (
          <article className="driver-notification-empty">
            <Inbox size={34} />
            <h3>Nenhum alerta neste filtro</h3>
            <p>Altere os filtros ou aguarde a próxima execução das automações.</p>
          </article>
        ) : null}
      </div>
    </section>
  );
}
