"use client";

import { BookOpenText, CarFront, Tag, Save } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  saveVehicleBrandAction,
  saveVehicleDocumentAction,
  saveVehicleModelAction,
} from "@/app/admin/manuais/actions";
import type {
  VehicleBrandRow,
  VehicleDocumentRow,
  VehicleDocumentSource,
  VehicleLibraryActionState,
  VehicleModelRow,
} from "@/types/vehicle-library";

const initialState: VehicleLibraryActionState = {};

type Props = {
  brands: VehicleBrandRow[];
  models: VehicleModelRow[];
  initialDocument?: VehicleDocumentRow | null;
};

function formatBytes(value: number | null) {
  if (!value) return "";
  return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.round(value / 1024)} KB`;
}

export function AdminVehicleLibraryForms({ brands, models, initialDocument }: Props) {
  const [brandState, brandAction, brandPending] = useActionState(saveVehicleBrandAction, initialState);
  const [modelState, modelAction, modelPending] = useActionState(saveVehicleModelAction, initialState);
  const [documentState, documentAction, documentPending] = useActionState(saveVehicleDocumentAction, initialState);
  const [sourceType, setSourceType] = useState<VehicleDocumentSource>(initialDocument?.source_type ?? "upload");
  const [filePath, setFilePath] = useState(initialDocument?.file_path ?? "");
  const [fileName, setFileName] = useState(initialDocument?.file_name ?? "");
  const [fileSize, setFileSize] = useState(initialDocument?.file_size ?? 0);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePath, setImagePath] = useState("");

  useEffect(() => {
    function handleDocument(event: Event) {
      const detail = (event as CustomEvent<{ path: string; name: string; size: number }>).detail;
      if (!detail?.path) return;
      setFilePath(detail.path);
      setFileName(detail.name);
      setFileSize(detail.size);
      setSourceType("upload");
    }
    function handleImage(event: Event) {
      const detail = (event as CustomEvent<{ url: string; path: string }>).detail;
      if (!detail?.url) return;
      setImageUrl(detail.url);
      setImagePath(detail.path);
    }
    window.addEventListener("jne-vehicle-document-ready", handleDocument);
    window.addEventListener("jne-public-asset-ready", handleImage);
    return () => {
      window.removeEventListener("jne-vehicle-document-ready", handleDocument);
      window.removeEventListener("jne-public-asset-ready", handleImage);
    };
  }, []);

  const modelsWithBrand = useMemo(
    () => models.map((model) => ({ ...model, brand: brands.find((brand) => brand.id === model.brand_id) })),
    [brands, models],
  );

  return (
    <div className="vehicle-admin-forms">
      <section className="vehicle-admin-form-card">
        <div className="vehicle-admin-form-card__heading"><Tag size={21} /><div><span>ETAPA 1</span><h3>Cadastrar marca</h3></div></div>
        <form className="admin-form" action={brandAction}>
          <div className="admin-form__grid admin-form__grid--wide">
            <label><span>Nome da marca</span><input name="name" placeholder="BYD, Geely, GWM..." required /></label>
            <label><span>Slug opcional</span><input name="slug" placeholder="Gerado automaticamente" /></label>
          </div>
          <div className="admin-form__grid admin-form__grid--wide">
            <label><span>URL do logotipo</span><input name="logoUrl" placeholder="https://..." /></label>
            <label><span>Ordem</span><input name="sortOrder" type="number" min="0" defaultValue="100" /></label>
          </div>
          <label className="admin-checkbox"><input name="isPublished" type="checkbox" defaultChecked /><span>Marca publicada</span></label>
          {brandState.error ? <p className="auth-message auth-message--error">{brandState.error}</p> : null}
          {brandState.success ? <p className="auth-message auth-message--success">{brandState.success}</p> : null}
          <button className="button button--primary" disabled={brandPending} type="submit"><Save size={17} /> {brandPending ? "Salvando..." : "Salvar marca"}</button>
        </form>
      </section>

      <section className="vehicle-admin-form-card">
        <div className="vehicle-admin-form-card__heading"><CarFront size={21} /><div><span>ETAPA 2</span><h3>Cadastrar veículo</h3></div></div>
        <form className="admin-form" action={modelAction}>
          <input type="hidden" name="imagePath" value={imagePath} />
          <label><span>Marca</span><select name="brandId" required defaultValue=""><option value="">Selecione</option>{brands.map((brand) => <option value={brand.id} key={brand.id}>{brand.name}</option>)}</select></label>
          <div className="admin-form__grid admin-form__grid--wide">
            <label><span>Nome do veículo</span><input name="name" placeholder="Dolphin, EX2, Ora 03..." required /></label>
            <label><span>Slug opcional</span><input name="slug" placeholder="Gerado automaticamente" /></label>
          </div>
          <div className="admin-form__grid admin-form__grid--wide">
            <label><span>Imagem do veículo</span><input name="imageUrl" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Uploader acima ou URL" /></label>
            <label><span>Ordem</span><input name="sortOrder" type="number" min="0" defaultValue="100" /></label>
          </div>
          <label className="admin-checkbox"><input name="isPublished" type="checkbox" defaultChecked /><span>Veículo publicado</span></label>
          {modelState.error ? <p className="auth-message auth-message--error">{modelState.error}</p> : null}
          {modelState.success ? <p className="auth-message auth-message--success">{modelState.success}</p> : null}
          {!brands.length ? <p className="auth-message auth-message--warning">Cadastre uma marca antes do veículo.</p> : null}
          <button className="button button--primary" disabled={modelPending || !brands.length} type="submit"><Save size={17} /> {modelPending ? "Salvando..." : "Salvar veículo"}</button>
        </form>
      </section>

      <section className="vehicle-admin-form-card vehicle-admin-form-card--wide" id="vehicle-document-form">
        <div className="vehicle-admin-form-card__heading"><BookOpenText size={21} /><div><span>ETAPA 3</span><h3>{initialDocument ? "Editar documento" : "Cadastrar manual ou documento"}</h3></div></div>
        <form className="admin-form" action={documentAction}>
          <input type="hidden" name="documentId" value={initialDocument?.id ?? ""} />
          <input type="hidden" name="filePath" value={filePath} />
          <input type="hidden" name="fileName" value={fileName} />
          <input type="hidden" name="fileSize" value={fileSize || ""} />

          <label><span>Veículo</span><select name="modelId" required defaultValue={initialDocument?.model_id ?? ""}><option value="">Selecione</option>{modelsWithBrand.map((model) => <option value={model.id} key={model.id}>{model.brand?.name ?? "Marca"} · {model.name}</option>)}</select></label>
          <div className="admin-form__grid admin-form__grid--wide">
            <label><span>Título</span><input name="title" required defaultValue={initialDocument?.title ?? ""} placeholder="Manual do proprietário 2025" /></label>
            <label><span>Tipo</span><select name="documentType" defaultValue={initialDocument?.document_type ?? "owner"}><option value="owner">Manual do proprietário</option><option value="maintenance">Manual de manutenção</option><option value="warranty">Garantia</option><option value="multimedia">Multimídia</option><option value="quick-guide">Guia rápido</option><option value="technical">Documento técnico</option><option value="other">Outro</option></select></label>
          </div>
          <label><span>Descrição</span><textarea name="description" rows={3} defaultValue={initialDocument?.description ?? ""} placeholder="Explique o conteúdo e qualquer observação importante." /></label>
          <div className="admin-form__grid admin-form__grid--wide">
            <label><span>Anos compatíveis</span><input name="years" required defaultValue={initialDocument?.years.join(", ") ?? ""} placeholder="2023, 2024, 2025" /></label>
            <label><span>Idioma</span><input name="language" defaultValue={initialDocument?.language ?? "Português"} /></label>
          </div>
          <div className="admin-form__grid admin-form__grid--wide">
            <label><span>Origem</span><select name="sourceType" value={sourceType} onChange={(event) => setSourceType(event.target.value as VehicleDocumentSource)}><option value="upload">PDF hospedado</option><option value="external">Link externo oficial</option></select></label>
            <label><span>Acesso</span><select name="accessLevel" defaultValue={initialDocument?.access_level ?? "public"}><option value="public">Público</option><option value="vip">Somente VIP</option></select></label>
          </div>

          {sourceType === "external" ? (
            <label><span>Link externo</span><input name="externalUrl" type="url" required defaultValue={initialDocument?.external_url ?? ""} placeholder="https://..." /></label>
          ) : (
            <div className={`admin-uploaded-file ${filePath ? "admin-uploaded-file--ready" : ""}`}>
              <BookOpenText size={21} />
              <div><strong>{fileName || "Nenhum PDF aplicado"}</strong><span>{filePath ? `${formatBytes(fileSize)} · ${filePath}` : "Use o uploader de documentos acima antes de salvar."}</span></div>
            </div>
          )}

          <div className="admin-form__grid admin-form__grid--wide">
            <label><span>Fonte</span><input name="sourceName" defaultValue={initialDocument?.source_name ?? ""} placeholder="Site oficial da montadora" /></label>
            <label><span>Ordem</span><input name="sortOrder" type="number" min="0" defaultValue={initialDocument?.sort_order ?? 100} /></label>
          </div>
          <label className="admin-checkbox"><input name="isPublished" type="checkbox" defaultChecked={initialDocument?.is_published ?? true} /><span>Documento publicado</span></label>
          {documentState.error ? <p className="auth-message auth-message--error">{documentState.error}</p> : null}
          {documentState.success ? <p className="auth-message auth-message--success">{documentState.success}</p> : null}
          {!models.length ? <p className="auth-message auth-message--warning">Cadastre uma marca e um veículo antes do documento.</p> : null}
          <button className="button button--primary" disabled={documentPending || !models.length} type="submit"><Save size={17} /> {documentPending ? "Salvando..." : initialDocument ? "Salvar alterações" : "Salvar documento"}</button>
          {initialDocument ? <a className="button button--secondary" href="/admin/manuais#vehicle-document-form">Criar outro</a> : null}
        </form>
      </section>
    </div>
  );
}
