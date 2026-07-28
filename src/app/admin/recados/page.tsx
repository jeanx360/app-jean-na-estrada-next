import type { Metadata } from "next";
import { Eye, EyeOff, Megaphone, Trash2 } from "lucide-react";
import {
  deleteAnnouncementAction,
  toggleAnnouncementAction,
} from "@/app/admin/actions";
import { AdminAnnouncementForm } from "@/components/AdminAnnouncementForm";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Recados" };

type Announcement = {
  id: string;
  title: string;
  message: string;
  audience: "all" | "member" | "vip" | "admin";
  is_published: boolean;
  published_at: string;
  created_at: string;
};

const audienceLabels = {
  all: "Todos",
  member: "Membros",
  vip: "VIP",
  admin: "Administradores",
};

export default async function AdminAnnouncementsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, message, audience, is_published, published_at, created_at")
    .order("created_at", { ascending: false });
  const announcements = (data ?? []) as Announcement[];

  return (
    <div className="admin-columns">
      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>NOVA MENSAGEM</span><h2><Megaphone size={22} /> Publicar recado</h2></div>
        </div>
        <AdminAnnouncementForm />
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>HISTÓRICO</span><h2>Recados cadastrados</h2></div>
          <strong>{announcements.length}</strong>
        </div>
        {error ? <p className="auth-message auth-message--error">{error.message}</p> : null}
        <div className="admin-list">
          {announcements.map((item) => (
            <article className="admin-list-card admin-list-card--stacked" key={item.id}>
              <div>
                <div className="admin-list-card__meta">
                  <span className={`admin-status ${item.is_published ? "" : "admin-status--warning"}`}>
                    {item.is_published ? "Publicado" : "Rascunho"}
                  </span>
                  <span>{audienceLabels[item.audience]}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.message}</p>
                <small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.published_at))}</small>
              </div>
              <div className="admin-inline-actions">
                <form action={toggleAnnouncementAction}>
                  <input type="hidden" name="announcementId" value={item.id} />
                  <input type="hidden" name="publish" value={item.is_published ? "false" : "true"} />
                  <button className="button button--secondary" type="submit">
                    {item.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                    {item.is_published ? "Despublicar" : "Publicar"}
                  </button>
                </form>
                <form action={deleteAnnouncementAction}>
                  <input type="hidden" name="announcementId" value={item.id} />
                  <button className="button button--danger" type="submit"><Trash2 size={16} /> Excluir</button>
                </form>
              </div>
            </article>
          ))}
          {!announcements.length ? <p className="admin-empty">Nenhum recado cadastrado.</p> : null}
        </div>
      </section>
    </div>
  );
}
