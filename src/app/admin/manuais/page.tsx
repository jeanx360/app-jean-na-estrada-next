import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenText, CarFront, Eye, EyeOff, FileUp, ImageUp, Pencil, Trash2 } from "lucide-react";
import { deleteVehicleDocumentAction, toggleVehicleDocumentAction } from "@/app/admin/manuais/actions";
import { AdminPublicAssetUploader } from "@/components/AdminPublicAssetUploader";
import { AdminVehicleDocumentUploader } from "@/components/AdminVehicleDocumentUploader";
import { AdminVehicleLibraryForms } from "@/components/AdminVehicleLibraryForms";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { requireAdmin } from "@/lib/admin";
import type { VehicleBrandRow, VehicleDocumentRow, VehicleModelRow } from "@/types/vehicle-library";

export const metadata: Metadata = { title: "Biblioteca de veículos e manuais" };

type Props = { searchParams: Promise<{ edit?: string; editModel?: string }> };

const documentLabels = {
  owner: "Manual do proprietário",
  maintenance: "Manual de manutenção",
  warranty: "Garantia",
  multimedia: "Multimídia",
  "quick-guide": "Guia rápido",
  technical: "Documento técnico",
  other: "Outro",
} as const;

export default async function AdminManualsPage({ searchParams }: Props) {
  const { edit, editModel } = await searchParams;
  const { supabase } = await requireAdmin();
  const [brandsResult, modelsResult, documentsResult] = await Promise.all([
    supabase
      .from("vehicle_brands")
      .select("id, name, slug, logo_url, sort_order, is_published, created_at, updated_at")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("vehicle_models")
      .select("id, brand_id, name, slug, image_url, image_path, sort_order, is_published, created_at, updated_at")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("vehicle_documents")
      .select("id, model_id, title, document_type, description, years, source_type, external_url, file_path, file_name, file_size, language, source_name, access_level, is_published, sort_order, published_at, created_at, updated_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  const brands = (brandsResult.data ?? []) as VehicleBrandRow[];
  const models = (modelsResult.data ?? []) as VehicleModelRow[];
  const documents = (documentsResult.data ?? []) as VehicleDocumentRow[];
  const initialModel = editModel ? models.find((item) => item.id === editModel) ?? null : null;
  const initialDocument = edit ? documents.find((item) => item.id === edit) ?? null : null;
  const hasMigrationError = brandsResult.error || modelsResult.error || documentsResult.error;

  return (
    <div className="admin-content-stack">
      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>ARQUIVOS PRIVADOS</span><h2><FileUp size={22} /> Enviar manual em PDF</h2></div>
        </div>
        <p className="admin-section__intro">
          O PDF fica no bucket privado e é aplicado automaticamente ao formulário. Documentos públicos e VIP usam o mesmo armazenamento protegido.
        </p>
        <AdminVehicleDocumentUploader />
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>IMAGENS DOS VEÍCULOS</span><h2><ImageUp size={22} /> Enviar imagem opcional</h2></div>
        </div>
        <p className="admin-section__intro">A imagem enviada será aplicada ao veículo que estiver sendo criado ou editado.</p>
        <AdminPublicAssetUploader />
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>BIBLIOTECA DO VEÍCULO</span><h2><BookOpenText size={22} /> Marcas, modelos e documentos</h2></div>
          <strong>{documents.length}</strong>
        </div>
        {hasMigrationError ? (
          <p className="auth-message auth-message--error">
            A estrutura da biblioteca ainda não está disponível. Execute a migração 1.1.0 no Supabase e atualize esta página.
          </p>
        ) : null}
        <AdminVehicleLibraryForms key={`${initialModel?.id ?? "new-model"}-${initialDocument?.id ?? "new-document"}`} brands={brands} models={models} initialModel={initialModel} initialDocument={initialDocument} />
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>VEÍCULOS CADASTRADOS</span><h2><CarFront size={22} /> Modelos da biblioteca</h2></div>
          <strong>{models.length}</strong>
        </div>
        <p className="admin-section__intro">
          Edite nome, marca, imagem, ordem e publicação sem alterar os manuais já vinculados ao veículo.
        </p>
        <div className="admin-list admin-list--grid">
          {models.map((model) => {
            const brand = brands.find((item) => item.id === model.brand_id);
            return (
              <article className="admin-list-card admin-list-card--stacked" key={model.id}>
                {model.image_url ? <img className="admin-list-card__cover" src={model.image_url} alt={`Imagem de ${model.name}`} /> : null}
                <div>
                  <div className="admin-list-card__meta">
                    <span className={`admin-status ${model.is_published ? "" : "admin-status--warning"}`}>{model.is_published ? "Publicado" : "Rascunho"}</span>
                    <span>{brand?.name ?? "Marca não encontrada"}</span>
                    <span>Ordem {model.sort_order}</span>
                  </div>
                  <h3>{model.name}</h3>
                  <small>Identificador: /{model.slug}</small>
                </div>
                <div className="admin-inline-actions">
                  <Link className="button button--secondary" href={`/admin/manuais?editModel=${model.id}#vehicle-model-form`}><Pencil size={16} /> Editar veículo</Link>
                </div>
              </article>
            );
          })}
          {!models.length && !hasMigrationError ? <p className="admin-empty">Nenhum veículo cadastrado.</p> : null}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>DOCUMENTOS CADASTRADOS</span><h2>Catálogo de manuais</h2></div>
          <strong>{documents.length}</strong>
        </div>
        <div className="admin-list admin-list--grid">
          {documents.map((document) => {
            const model = models.find((item) => item.id === document.model_id);
            const brand = brands.find((item) => item.id === model?.brand_id);
            return (
              <article className="admin-list-card admin-list-card--stacked" key={document.id}>
                <div>
                  <div className="admin-list-card__meta">
                    <span className={`admin-status ${document.is_published ? "" : "admin-status--warning"}`}>{document.is_published ? "Publicado" : "Rascunho"}</span>
                    <span>{document.access_level === "vip" ? "VIP" : "Público"}</span>
                    <span>{document.source_type === "upload" ? "PDF" : "Link"}</span>
                  </div>
                  <h3>{document.title}</h3>
                  <p>{brand?.name ?? "Marca"} · {model?.name ?? "Veículo"} · {document.years.join(", ")}</p>
                  <small>{documentLabels[document.document_type]} · {document.language} · Ordem {document.sort_order}</small>
                </div>
                <div className="admin-inline-actions">
                  <Link className="button button--secondary" href={`/admin/manuais?edit=${document.id}#vehicle-document-form`}><Pencil size={16} /> Editar</Link>
                  <form action={toggleVehicleDocumentAction}>
                    <input type="hidden" name="documentId" value={document.id} />
                    <input type="hidden" name="publish" value={document.is_published ? "false" : "true"} />
                    <button className="button button--secondary" type="submit">{document.is_published ? <EyeOff size={16} /> : <Eye size={16} />}{document.is_published ? "Despublicar" : "Publicar"}</button>
                  </form>
                  <form action={deleteVehicleDocumentAction}>
                    <input type="hidden" name="documentId" value={document.id} />
                    <ConfirmSubmitButton className="button button--danger" message="Excluir este documento e o PDF associado? A operação não pode ser desfeita."><Trash2 size={16} /> Excluir</ConfirmSubmitButton>
                  </form>
                </div>
              </article>
            );
          })}
          {!documents.length && !hasMigrationError ? <p className="admin-empty">Nenhum manual cadastrado.</p> : null}
        </div>
      </section>
    </div>
  );
}
