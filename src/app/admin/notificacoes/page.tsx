import type { Metadata } from "next";
import { BellRing, Eye, EyeOff, RefreshCw, Send, Trash2 } from "lucide-react";
import {
  deleteNotificationAction,
  resendNotificationPushAction,
  toggleNotificationAction,
} from "@/app/admin/notificacoes/actions";
import { AdminNotificationForm } from "@/components/AdminNotificationForm";
import { requireAdmin } from "@/lib/admin";
import type { NotificationRow } from "@/types/notification";

export const metadata: Metadata = { title: "Notificações" };

const audienceLabels = {
  all: "Todos",
  member: "Membros",
  vip: "VIP",
  admin: "Administradores",
};

const categoryLabels = {
  general: "Geral",
  videos: "Vídeos",
  tutorials: "Tutoriais",
  apps: "Aplicativos",
  benefits: "Benefícios",
};

export default async function AdminNotificationsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, title, message, audience, category, action_url, image_url, is_published, is_featured, published_at, push_requested, push_sent_at, push_success_count, push_failure_count, source_key, created_at, updated_at",
    )
    .order("created_at", { ascending: false });
  const notifications = (data ?? []) as NotificationRow[];

  return (
    <div className="admin-columns">
      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>NOVO AVISO</span><h2><BellRing size={22} /> Publicar notificação</h2></div>
        </div>
        <AdminNotificationForm />
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>HISTÓRICO</span><h2>Notificações cadastradas</h2></div>
          <strong>{notifications.length}</strong>
        </div>
        {error ? <p className="auth-message auth-message--error">{error.message}</p> : null}
        <div className="admin-list">
          {notifications.map((item) => (
            <article className="admin-list-card admin-list-card--stacked" key={item.id}>
              <div>
                <div className="admin-list-card__meta">
                  <span className={`admin-status ${item.is_published ? "" : "admin-status--warning"}`}>
                    {item.is_published ? "Publicado" : "Rascunho"}
                  </span>
                  <span>{audienceLabels[item.audience]}</span>
                  <span>{categoryLabels[item.category]}</span>
                  {item.is_featured ? <span>Destaque</span> : null}
                </div>
                <h3>{item.title}</h3>
                <p>{item.message}</p>
                <small>
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "America/Sao_Paulo",
                  }).format(new Date(item.published_at))}
                </small>
                <div className="admin-push-result">
                  {item.push_sent_at ? (
                    <><Send size={15} /> {item.push_success_count} enviados · {item.push_failure_count} falhas</>
                  ) : item.push_requested ? (
                    <><RefreshCw size={15} /> Push solicitado, mas ainda não enviado</>
                  ) : (
                    <><BellRing size={15} /> Somente central interna</>
                  )}
                </div>
              </div>
              <div className="admin-inline-actions">
                <form action={toggleNotificationAction}>
                  <input type="hidden" name="notificationId" value={item.id} />
                  <input type="hidden" name="publish" value={item.is_published ? "false" : "true"} />
                  <button className="button button--secondary" type="submit">
                    {item.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                    {item.is_published ? "Despublicar" : "Publicar"}
                  </button>
                </form>
                {item.is_published ? (
                  <form action={resendNotificationPushAction}>
                    <input type="hidden" name="notificationId" value={item.id} />
                    <button className="button button--secondary" type="submit"><Send size={16} /> Enviar push</button>
                  </form>
                ) : null}
                <form action={deleteNotificationAction}>
                  <input type="hidden" name="notificationId" value={item.id} />
                  <button className="button button--danger" type="submit"><Trash2 size={16} /> Excluir</button>
                </form>
              </div>
            </article>
          ))}
          {!notifications.length ? <p className="admin-empty">Nenhuma notificação cadastrada.</p> : null}
        </div>
      </section>
    </div>
  );
}
