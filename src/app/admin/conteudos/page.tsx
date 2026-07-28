import type { Metadata } from "next";
import { Crown, Eye, EyeOff, FileArchive, Link2, Trash2 } from "lucide-react";
import {
  deleteVipContentAction,
  toggleVipContentAction,
} from "@/app/admin/actions";
import { AdminFileUploader } from "@/components/AdminFileUploader";
import { AdminVipContentForm } from "@/components/AdminVipContentForm";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Conteúdo VIP" };

type VipContent = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content_type: "text" | "file" | "link";
  file_path: string | null;
  external_url: string | null;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
};

export default async function AdminContentPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("vip_content")
    .select("id, title, description, category, content_type, file_path, external_url, is_published, is_featured, created_at")
    .order("created_at", { ascending: false });
  const items = (data ?? []) as VipContent[];

  return (
    <div className="admin-content-stack">
      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>TEXTO OU LINK</span><h2><Crown size={22} /> Novo conteúdo VIP</h2></div>
        </div>
        <AdminVipContentForm />
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>ARQUIVO PRIVADO</span><h2><FileArchive size={22} /> Enviar APK, ZIP ou PDF</h2></div>
        </div>
        <AdminFileUploader />
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>BIBLIOTECA VIP</span><h2>Conteúdos cadastrados</h2></div>
          <strong>{items.length}</strong>
        </div>
        {error ? <p className="auth-message auth-message--error">{error.message}</p> : null}
        <div className="admin-list admin-list--grid">
          {items.map((item) => (
            <article className="admin-list-card admin-list-card--stacked" key={item.id}>
              <div>
                <div className="admin-list-card__meta">
                  <span className={`admin-status ${item.is_published ? "" : "admin-status--warning"}`}>
                    {item.is_published ? "Publicado" : "Rascunho"}
                  </span>
                  <span>{item.category}</span>
                  {item.is_featured ? <span>Destaque</span> : null}
                </div>
                <h3>{item.title}</h3>
                <p>{item.description || "Sem descrição."}</p>
                <small>
                  {item.content_type === "file" ? <><FileArchive size={13} /> Arquivo privado</> : null}
                  {item.content_type === "link" ? <><Link2 size={13} /> Link externo</> : null}
                  {item.content_type === "text" ? "Texto" : null}
                </small>
              </div>
              <div className="admin-inline-actions">
                <form action={toggleVipContentAction}>
                  <input type="hidden" name="contentId" value={item.id} />
                  <input type="hidden" name="publish" value={item.is_published ? "false" : "true"} />
                  <button className="button button--secondary" type="submit">
                    {item.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                    {item.is_published ? "Despublicar" : "Publicar"}
                  </button>
                </form>
                <form action={deleteVipContentAction}>
                  <input type="hidden" name="contentId" value={item.id} />
                  <button className="button button--danger" type="submit"><Trash2 size={16} /> Excluir</button>
                </form>
              </div>
            </article>
          ))}
          {!items.length ? <p className="admin-empty">Nenhum conteúdo VIP cadastrado.</p> : null}
        </div>
      </section>
    </div>
  );
}
