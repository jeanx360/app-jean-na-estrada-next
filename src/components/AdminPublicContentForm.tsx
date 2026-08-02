"use client";

import { FilePlus2, Save } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { savePublicContentAction } from "@/app/admin/publicacoes/actions";
import type {
  PublicContentActionState,
  PublicContentPublicationStatus,
  PublicContentRow,
  PublicContentType,
} from "@/types/public-content";

const initialState: PublicContentActionState = {};

type Props = { initialData?: PublicContentRow };
type ResourceInput = { label?: string; description?: string; href?: string; kind?: "video" | "pdf" | "drive" };

function metaString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

function metaNumber(metadata: Record<string, unknown>, key: string) {
  const value = Number(metadata[key] ?? 0);
  return Number.isFinite(value) && value > 0 ? String(value) : "";
}

function initialPublicationStatus(initialData?: PublicContentRow): PublicContentPublicationStatus {
  if (!initialData) return "published";
  if (initialData.publication_status) return initialData.publication_status;
  return initialData.is_published ? "published" : "draft";
}

export function AdminPublicContentForm({ initialData }: Props) {
  const [state, formAction, pending] = useActionState(savePublicContentAction, initialState);
  const [type, setType] = useState<PublicContentType>(initialData?.content_type ?? "tutorial");
  const metadata = useMemo(() => initialData?.metadata ?? {}, [initialData]);
  const [imageUrl, setImageUrl] = useState(initialData?.image_url ?? "");
  const [imagePath, setImagePath] = useState(initialData?.image_path ?? "");
  const [deliveryType, setDeliveryType] = useState<"upload" | "external">(
    metaString(metadata, "deliveryType") === "upload" ? "upload" : "external",
  );
  const [appFile, setAppFile] = useState({
    path: metaString(metadata, "filePath"),
    name: metaString(metadata, "fileName"),
    size: metaNumber(metadata, "fileSize"),
    checksum: metaString(metadata, "checksumSha256"),
  });
  const resources = useMemo(() => {
    const value = metadata.resources;
    return Array.isArray(value) ? (value as ResourceInput[]) : [];
  }, [metadata]);

  useEffect(() => {
    function handleAsset(event: Event) {
      const detail = (event as CustomEvent<{ url: string; path: string }>).detail;
      if (!detail?.url) return;
      setImageUrl(detail.url);
      setImagePath(detail.path);
    }
    function handleAppFile(event: Event) {
      const detail = (event as CustomEvent<{ path: string; name: string; size: number; checksum: string }>).detail;
      if (!detail?.path) return;
      setDeliveryType("upload");
      setAppFile({ path: detail.path, name: detail.name, size: String(detail.size), checksum: detail.checksum });
    }
    window.addEventListener("jne-public-asset-ready", handleAsset);
    window.addEventListener("jne-application-file-ready", handleAppFile);
    return () => {
      window.removeEventListener("jne-public-asset-ready", handleAsset);
      window.removeEventListener("jne-application-file-ready", handleAppFile);
    };
  }, []);

  return (
    <form className="admin-form" action={formAction} id="public-content-form">
      <input type="hidden" name="contentId" value={initialData?.id ?? ""} />
      <input type="hidden" name="imagePath" value={imagePath} />

      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Tipo</span>
          <select name="contentType" value={type} onChange={(event) => setType(event.target.value as PublicContentType)}>
            <option value="tutorial">Tutorial</option>
            <option value="application">Aplicativo</option>
            <option value="partner">Parceiro</option>
            <option value="product">Produto</option>
          </select>
        </label>
        <label><span>Título</span><input name="title" required defaultValue={initialData?.title ?? ""} placeholder="Título exibido no app" /></label>
        <label><span>Identificador</span><input name="slug" defaultValue={initialData?.slug ?? ""} placeholder="Gerado automaticamente" /></label>
        <label>
          <span>Estado editorial</span>
          <select name="publicationStatus" defaultValue={initialPublicationStatus(initialData)}>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
            <option value="archived">Arquivado</option>
          </select>
          <small>Arquivados deixam de aparecer no aplicativo sem serem excluídos.</small>
        </label>
      </div>

      <label><span>Descrição</span><textarea name="summary" rows={3} defaultValue={initialData?.summary ?? ""} placeholder="Resumo exibido no card." /></label>

      <div className="admin-form__grid admin-form__grid--wide">
        <label><span>Categoria</span><input name="category" defaultValue={initialData?.category ?? "Geral"} /></label>
        <label><span>Ordem</span><input name="sortOrder" type="number" min="0" max="100000" defaultValue={initialData?.sort_order ?? 100} /></label>
        {type === "partner" || type === "product" ? (
          <label><span>Link principal</span><input name="externalUrl" type="url" required defaultValue={initialData?.external_url ?? ""} placeholder="https://..." /></label>
        ) : null}
      </div>

      {type === "tutorial" ? (
        <div className="admin-dynamic-fields">
          <div className="admin-form__grid admin-form__grid--wide">
            <label><span>Veículo</span><input name="vehicle" defaultValue={metaString(metadata, "vehicle")} placeholder="Geely EX2" /></label>
            <label><span>Nível</span><select name="level" defaultValue={metaString(metadata, "level") || "Básico"}><option>Básico</option><option>Intermediário</option><option>Avançado</option></select></label>
            <label><span>Status do material</span><select name="status" defaultValue={metaString(metadata, "status") || "Disponível"}><option>Disponível</option><option>Em preparação</option></select></label>
          </div>
          {[0, 1, 2].map((index) => {
            const resource = resources[index] ?? {};
            const number = index + 1;
            return (
              <fieldset className="admin-resource-fieldset" key={number}>
                <legend>Recurso {number}{number === 1 ? " (obrigatório)" : ""}</legend>
                <div className="admin-form__grid admin-form__grid--wide">
                  <label><span>Nome</span><input name={`resource${number}Label`} required={number === 1} defaultValue={resource.label ?? ""} placeholder="Assistir ao tutorial" /></label>
                  <label><span>Tipo</span><select name={`resource${number}Kind`} defaultValue={resource.kind ?? "video"}><option value="video">Vídeo</option><option value="pdf">PDF</option><option value="drive">Drive/arquivo</option></select></label>
                  <label><span>Link</span><input name={`resource${number}Url`} type="url" required={number === 1} defaultValue={resource.href ?? ""} placeholder="https://..." /></label>
                </div>
                <label><span>Descrição do recurso</span><input name={`resource${number}Description`} defaultValue={resource.description ?? ""} /></label>
              </fieldset>
            );
          })}
        </div>
      ) : null}

      {type === "application" ? (
        <div className="admin-dynamic-fields">
          <label><span>Imagem de capa opcional</span><input name="imageUrl" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Envie na área de imagens ou cole https://..." /><small>Com imagem, o aplicativo recebe um banner grande. Sem imagem, mantém o ícone universal.</small></label>
          <div className="admin-form__grid admin-form__grid--wide">
            <label><span>Forma de acesso</span><select name="deliveryType" value={deliveryType} onChange={(event) => setDeliveryType(event.target.value as "upload" | "external")}><option value="external">Link externo</option><option value="upload">Arquivo hospedado</option></select></label>
            <label><span>Nível de acesso</span><select name="accessLevel" defaultValue={metaString(metadata, "accessLevel") || "public"}><option value="public">Público</option><option value="vip">Somente VIP</option></select></label>
          </div>
          {deliveryType === "external" ? (
            <label><span>Link do aplicativo</span><input name="externalUrl" type="url" required defaultValue={initialData?.external_url ?? ""} placeholder="https://play.google.com, GitHub ou site oficial" /></label>
          ) : (
            <div className="admin-uploaded-file-box">
              <input type="hidden" name="appFilePath" value={appFile.path} />
              <input type="hidden" name="appFileName" value={appFile.name} />
              <input type="hidden" name="appFileSize" value={appFile.size} />
              <strong>{appFile.name || "Nenhum arquivo aplicado"}</strong>
              <small>{appFile.path || "Use o uploader de aplicativos antes de salvar."}</small>
            </div>
          )}
          <div className="admin-form__grid admin-form__grid--wide">
            <label><span>Compatibilidade</span><input name="compatibility" defaultValue={metaString(metadata, "compatibility")} placeholder="Geely EX2 2025/2026" /></label>
            <label><span>Versão</span><input name="version" defaultValue={metaString(metadata, "version")} placeholder="1.2.0" /></label>
            <label><span>Status do arquivo</span><select name="status" defaultValue={metaString(metadata, "status") || "Disponível"}><option>Disponível</option><option>Testado pelo Jean</option><option>Em validação</option><option>Versão antiga</option></select></label>
            <label><span>Origem</span><input name="origin" defaultValue={metaString(metadata, "origin") || "Jean na Estrada"} placeholder="Desenvolvedor, GitHub ou fonte" /></label>
            <label><span>Texto do botão</span><input name="buttonLabel" defaultValue={metaString(metadata, "buttonLabel")} placeholder={deliveryType === "upload" ? "Baixar arquivo" : "Abrir página oficial"} /></label>
            <label><span>Checksum SHA-256</span><input name="checksumSha256" value={appFile.checksum || metaString(metadata, "checksumSha256")} onChange={(event) => setAppFile((current) => ({ ...current, checksum: event.target.value }))} placeholder="Preenchido automaticamente no upload" /></label>
          </div>
        </div>
      ) : null}

      {type === "partner" ? (
        <div className="admin-dynamic-fields">
          <label><span>URL da imagem</span><input name="imageUrl" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Envie acima ou cole https://..." /></label>
          <div className="admin-form__grid admin-form__grid--wide">
            <label><span>Texto do botão</span><input name="actionLabel" defaultValue={metaString(metadata, "actionLabel") || "Conhecer parceiro"} /></label>
            <label className="admin-form__span-2"><span>Serviços (um por linha)</span><textarea name="services" rows={4} defaultValue={Array.isArray(metadata.services) ? metadata.services.join("\n") : ""} /></label>
          </div>
        </div>
      ) : null}

      {type === "product" ? (
        <div className="admin-form__grid admin-form__grid--wide">
          <label><span>Loja</span><select name="retailer" defaultValue={metaString(metadata, "retailer") || "Mercado Livre"}><option>Shopee</option><option>Mercado Livre</option><option>Amazon</option></select></label>
          <label><span>Destaque curto</span><input name="highlight" defaultValue={metaString(metadata, "highlight")} placeholder="Selecionado para o Dolphin" /></label>
        </div>
      ) : null}

      <div className="admin-form__checks">
        <label className="admin-checkbox"><input name="isFeatured" type="checkbox" defaultChecked={initialData?.is_featured ?? false} /><span>Marcar como destaque</span></label>
        {!initialData ? <label className="admin-checkbox"><input name="notifyUsers" type="checkbox" defaultChecked /><span>Criar aviso ao publicar</span></label> : null}
        {!initialData ? <label className="admin-checkbox"><input name="sendPush" type="checkbox" /><span>Enviar também por Web Push</span></label> : null}
      </div>

      {state.error ? <p className="auth-message auth-message--error">{state.error}</p> : null}
      {state.success ? <p className="auth-message auth-message--success">{state.success}</p> : null}
      <button className="button button--primary" type="submit" disabled={pending}>
        {initialData ? <Save size={18} /> : <FilePlus2 size={18} />}
        {pending ? "Salvando..." : initialData ? "Salvar alterações" : "Criar publicação"}
      </button>
    </form>
  );
}
