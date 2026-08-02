import type { Metadata } from "next";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  FileText,
  ImageUp,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import {
  deletePublicContentAction,
  duplicatePublicContentAction,
  movePublicContentAction,
  setPublicContentStatusAction,
} from "@/app/admin/publicacoes/actions";
import { AdminApplicationFileUploader } from "@/components/AdminApplicationFileUploader";
import { AdminPublicAssetUploader } from "@/components/AdminPublicAssetUploader";
import { AdminPublicContentForm } from "@/components/AdminPublicContentForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { requireAdmin } from "@/lib/admin";
import type {
  PublicContentPublicationStatus,
  PublicContentRow,
  PublicContentType,
} from "@/types/public-content";

export const metadata: Metadata = { title: "Publicações públicas" };

const typeLabels: Record<PublicContentType, string> = {
  tutorial: "Tutorial",
  application: "Aplicativo",
  partner: "Parceiro",
  product: "Produto",
};

const statusLabels: Record<PublicContentPublicationStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

function publicationStatus(item: PublicContentRow): PublicContentPublicationStatus {
  return item.publication_status || (item.is_published ? "published" : "draft");
}

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

type SearchParams = Promise<{
  q?: string | string[];
  type?: string | string[];
  status?: string | string[];
}>;

export default async function AdminPublicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const queryText = singleParam(params.q).trim().toLowerCase();
  const typeFilter = singleParam(params.type);
  const statusFilter = singleParam(params.status);

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("public_contents")
    .select(
      "id, content_type, title, slug, summary, category, image_url, image_path, external_url, metadata, publication_status, is_published, is_featured, sort_order, published_at, archived_at, created_at, updated_at",
    )
    .order("content_type", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const allItems = (data ?? []) as PublicContentRow[];
  const items = allItems.filter((item) => {
    const matchesType = !typeFilter || typeFilter === "all" || item.content_type === typeFilter;
    const matchesStatus = !statusFilter || statusFilter === "all" || publicationStatus(item) === statusFilter;
    const searchable = `${item.title} ${item.summary ?? ""} ${item.category ?? ""} ${item.slug}`.toLowerCase();
    const matchesQuery = !queryText || searchable.includes(queryText);
    return matchesType && matchesStatus && matchesQuery;
  });

  const counts = allItems.reduce(
    (result, item) => {
      result[publicationStatus(item)] += 1;
      return result;
    },
    { draft: 0, published: 0, archived: 0 } as Record<PublicContentPublicationStatus, number>,
  );

  return (
    <div className="admin-content-stack">
      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>IMAGENS PÚBLICAS</span><h2><ImageUp size={22} /> Enviar imagem</h2></div>
        </div>
        <p className="admin-section__intro">
          Use para banners de parceiros e capas grandes de aplicativos. Ao terminar o upload, a imagem será aplicada automaticamente ao formulário abaixo.
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
          <div><span>CATÁLOGO EDITORIAL</span><h2>Publicações cadastradas</h2></div>
          <strong>{allItems.length}</strong>
        </div>

        <div className="admin-publication-summary" aria-label="Resumo das publicações">
          <article><span>Publicadas</span><strong>{counts.published}</strong></article>
          <article><span>Rascunhos</span><strong>{counts.draft}</strong></article>
          <article><span>Arquivadas</span><strong>{counts.archived}</strong></article>
        </div>

        <form className="admin-publication-filters" method="get">
          <label>
            <span>Buscar</span>
            <div className="admin-input-with-icon"><Search size={17} /><input name="q" defaultValue={singleParam(params.q)} placeholder="Título, categoria ou identificador" /></div>
          </label>
          <label>
            <span>Tipo</span>
            <select name="type" defaultValue={typeFilter || "all"}>
              <option value="all">Todos</option>
              <option value="tutorial">Tutoriais</option>
              <option value="application">Aplicativos</option>
              <option value="partner">Parceiros</option>
              <option value="product">Produtos</option>
            </select>
          </label>
          <label>
            <span>Estado</span>
            <select name="status" defaultValue={statusFilter || "all"}>
              <option value="all">Todos</option>
              <option value="published">Publicados</option>
              <option value="draft">Rascunhos</option>
              <option value="archived">Arquivados</option>
            </select>
          </label>
          <div className="admin-publication-filters__actions">
            <button className="button button--primary" type="submit">Filtrar</button>
            <Link className="button button--secondary" href="/admin/publicacoes">Limpar</Link>
          </div>
        </form>

        {error ? (
          <p className="auth-message auth-message--error">
            {error.message.includes("publication_status")
              ? "A estrutura editorial da versão 1.9.0 ainda não foi aplicada. Execute a migração 1.9.0 no Supabase."
              : error.message.includes("public_contents")
                ? "A tabela de publicações ainda não existe. Execute a migração 0.8.0 no Supabase."
                : error.message}
          </p>
        ) : null}

        <div className="admin-list admin-list--grid">
          {items.map((item) => {
            const status = publicationStatus(item);
            return (
              <article className={`admin-list-card admin-list-card--stacked ${status === "archived" ? "admin-list-card--archived" : ""}`} key={item.id}>
                <div>
                  <div className="admin-list-card__meta">
                    <span className={`admin-status ${status === "draft" ? "admin-status--warning" : status === "archived" ? "admin-status--muted" : ""}`}>
                      {statusLabels[status]}
                    </span>
                    <span>{typeLabels[item.content_type]}</span>
                    <span>Ordem {item.sort_order}</span>
                    {item.is_featured ? <span>Destaque</span> : null}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.summary || "Sem descrição."}</p>
                  <small>/{item.slug}</small>
                </div>

                <div className="admin-inline-actions admin-publication-order-actions">
                  <form action={movePublicContentAction}>
                    <input type="hidden" name="contentId" value={item.id} />
                    <input type="hidden" name="contentType" value={item.content_type} />
                    <input type="hidden" name="direction" value="up" />
                    <button className="button button--secondary" type="submit" title="Mover para cima"><ArrowUp size={16} /> Subir</button>
                  </form>
                  <form action={movePublicContentAction}>
                    <input type="hidden" name="contentId" value={item.id} />
                    <input type="hidden" name="contentType" value={item.content_type} />
                    <input type="hidden" name="direction" value="down" />
                    <button className="button button--secondary" type="submit" title="Mover para baixo"><ArrowDown size={16} /> Descer</button>
                  </form>
                  <Link className="button button--secondary" href={`/admin/publicacoes/${item.id}/editar`}>
                    <Pencil size={16} /> Editar
                  </Link>
                  <form action={duplicatePublicContentAction}>
                    <input type="hidden" name="contentId" value={item.id} />
                    <input type="hidden" name="contentType" value={item.content_type} />
                    <button className="button button--secondary" type="submit"><Copy size={16} /> Duplicar</button>
                  </form>

                  {status !== "published" ? (
                    <form action={setPublicContentStatusAction}>
                      <input type="hidden" name="contentId" value={item.id} />
                      <input type="hidden" name="contentType" value={item.content_type} />
                      <input type="hidden" name="publicationStatus" value="published" />
                      <button className="button button--secondary" type="submit"><Eye size={16} /> Publicar</button>
                    </form>
                  ) : (
                    <form action={setPublicContentStatusAction}>
                      <input type="hidden" name="contentId" value={item.id} />
                      <input type="hidden" name="contentType" value={item.content_type} />
                      <input type="hidden" name="publicationStatus" value="draft" />
                      <button className="button button--secondary" type="submit"><EyeOff size={16} /> Rascunho</button>
                    </form>
                  )}

                  {status !== "archived" ? (
                    <form action={setPublicContentStatusAction}>
                      <input type="hidden" name="contentId" value={item.id} />
                      <input type="hidden" name="contentType" value={item.content_type} />
                      <input type="hidden" name="publicationStatus" value="archived" />
                      <button className="button button--secondary" type="submit"><Archive size={16} /> Arquivar</button>
                    </form>
                  ) : (
                    <form action={setPublicContentStatusAction}>
                      <input type="hidden" name="contentId" value={item.id} />
                      <input type="hidden" name="contentType" value={item.content_type} />
                      <input type="hidden" name="publicationStatus" value="draft" />
                      <button className="button button--secondary" type="submit"><ArchiveRestore size={16} /> Restaurar</button>
                    </form>
                  )}

                  <form action={deletePublicContentAction}>
                    <input type="hidden" name="contentId" value={item.id} />
                    <input type="hidden" name="contentType" value={item.content_type} />
                    <ConfirmSubmitButton
                      className="button button--danger"
                      message={`Excluir definitivamente “${item.title}”? Arquivos compartilhados com outras publicações serão preservados.`}
                    >
                      <Trash2 size={16} /> Excluir
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </article>
            );
          })}
          {!items.length && !error ? <p className="admin-empty">Nenhuma publicação encontrada com estes filtros.</p> : null}
        </div>
      </section>
    </div>
  );
}
