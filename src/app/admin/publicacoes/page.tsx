import type { Metadata } from "next";
import Link from "next/link";
import { Eye, EyeOff, FileText, ImageUp, Pencil, Trash2 } from "lucide-react";
import {
  deletePublicContentAction,
  togglePublicContentAction,
} from "@/app/admin/publicacoes/actions";
import { AdminApplicationFileUploader } from "@/components/AdminApplicationFileUploader";
import { AdminPublicAssetUploader } from "@/components/AdminPublicAssetUploader";
import { AdminPublicContentForm } from "@/components/AdminPublicContentForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { requireAdmin } from "@/lib/admin";
import type { PublicContentRow, PublicContentType } from "@/types/public-content";

export const metadata: Metadata = { title: "Publicações públicas" };

const typeLabels: Record<PublicContentType, string> = {
  tutorial: "Tutorial",
  application: "Aplicativo",
  partner: "Parceiro",
  product: "Produto",
};

export default async function AdminPublicationsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("public_contents")
    .select(
      "id, content_type, title, slug, summary, category, image_url, image_path, external_url, metadata, is_published, is_featured, sort_order, published_at, created_at, updated_at",
    )
    .order("content_type", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  const items = (data ?? []) as PublicContentRow[];

  return (
    <div className="admin-content-stack">
      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>IMAGENS PÚBLICAS</span><h2><ImageUp size={22} /> Enviar imagem</h2></div>
        </div>
        <p className="admin-section__intro">
          Use para banners de parceiros. Ao terminar o upload, a imagem será aplicada automaticamente ao formulário abaixo.
        </p>
        <AdminPublicAssetUploader />
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>ARQUIVOS DE APLICATIVOS</span><h2><FileText size={22} /> Enviar APK ou pacote</h2></div>
        </div>
        <p className="admin-section__intro">O arquivo será aplicado automaticamente ao formulário. Depois escolha o tipo Aplicativo e a forma de acesso Arquivo hospedado.</p>
        <AdminApplicationFileUploader />
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>NOVO CONTEÚDO</span><h2><FileText size={22} /> Criar publicação pública</h2></div>
        </div>
        <AdminPublicContentForm />
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>CATÁLOGO</span><h2>Publicações cadastradas</h2></div>
          <strong>{items.length}</strong>
        </div>

        {error ? (
          <p className="auth-message auth-message--error">
            {error.message.includes("public_contents")
              ? "A tabela de publicações ainda não existe. Execute a migração 0.8.0 no Supabase."
              : error.message}
          </p>
        ) : null}

        <div className="admin-list admin-list--grid">
          {items.map((item) => (
            <article className="admin-list-card admin-list-card--stacked" key={item.id}>
              <div>
                <div className="admin-list-card__meta">
                  <span className={`admin-status ${item.is_published ? "" : "admin-status--warning"}`}>
                    {item.is_published ? "Publicado" : "Rascunho"}
                  </span>
                  <span>{typeLabels[item.content_type]}</span>
                  <span>Ordem {item.sort_order}</span>
                  {item.is_featured ? <span>Destaque</span> : null}
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary || "Sem descrição."}</p>
                <small>/{item.slug}</small>
              </div>

              <div className="admin-inline-actions">
                <Link className="button button--secondary" href={`/admin/publicacoes/${item.id}/editar`}>
                  <Pencil size={16} /> Editar
                </Link>
                <form action={togglePublicContentAction}>
                  <input type="hidden" name="contentId" value={item.id} />
                  <input type="hidden" name="contentType" value={item.content_type} />
                  <input type="hidden" name="publish" value={item.is_published ? "false" : "true"} />
                  <button className="button button--secondary" type="submit">
                    {item.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                    {item.is_published ? "Despublicar" : "Publicar"}
                  </button>
                </form>
                <form action={deletePublicContentAction}>
                  <input type="hidden" name="contentId" value={item.id} />
                  <input type="hidden" name="contentType" value={item.content_type} />
                  <ConfirmSubmitButton className="button button--danger" message="Excluir definitivamente esta publicação e a imagem associada?">
                    <Trash2 size={16} /> Excluir
                  </ConfirmSubmitButton>
                </form>
              </div>
            </article>
          ))}
          {!items.length && !error ? <p className="admin-empty">Nenhuma publicação cadastrada.</p> : null}
        </div>
      </section>
    </div>
  );
}
