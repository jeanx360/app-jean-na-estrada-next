"use client";

import { FilePlus2, Save } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { savePublicContentAction } from "@/app/admin/publicacoes/actions";
import type { PublicContentActionState, PublicContentRow, PublicContentType } from "@/types/public-content";

const initialState: PublicContentActionState = {};

type Props = {
  initialData?: PublicContentRow;
};

type ResourceInput = {
  label?: string;
  description?: string;
  href?: string;
  kind?: "video" | "pdf" | "drive";
};

function metaString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

export function AdminPublicContentForm({ initialData }: Props) {
  const [state, formAction, pending] = useActionState(savePublicContentAction, initialState);
  const [type, setType] = useState<PublicContentType>(initialData?.content_type ?? "tutorial");
  const [imageUrl, setImageUrl] = useState(initialData?.image_url ?? "");
  const [imagePath, setImagePath] = useState(initialData?.image_path ?? "");
  const metadata = useMemo(() => initialData?.metadata ?? {}, [initialData]);
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

    window.addEventListener("jne-public-asset-ready", handleAsset);
    return () => window.removeEventListener("jne-public-asset-ready", handleAsset);
  }, []);

  return (
    <form className="admin-form" action={formAction}>
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
        <label>
          <span>Título</span>
          <input name="title" required defaultValue={initialData?.title ?? ""} placeholder="Título exibido no app" />
        </label>
        <label>
          <span>Identificador</span>
          <input name="slug" defaultValue={initialData?.slug ?? ""} placeholder="Gerado automaticamente" />
        </label>
      </div>

      <label>
        <span>Descrição</span>
        <textarea name="summary" rows={3} defaultValue={initialData?.summary ?? ""} placeholder="Resumo exibido no card." />
      </label>

      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Categoria</span>
          <input name="category" defaultValue={initialData?.category ?? "Geral"} />
        </label>
        <label>
          <span>Ordem</span>
          <input name="sortOrder" type="number" min="0" max="100000" defaultValue={initialData?.sort_order ?? 100} />
        </label>
        {type !== "tutorial" ? (
          <label>
            <span>Link principal</span>
            <input name="externalUrl" type="url" required defaultValue={initialData?.external_url ?? ""} placeholder="https://..." />
          </label>
        ) : null}
      </div>

      {type === "tutorial" ? (
        <div className="admin-dynamic-fields">
          <div className="admin-form__grid admin-form__grid--wide">
            <label><span>Veículo</span><input name="vehicle" defaultValue={metaString(metadata, "vehicle")} placeholder="Geely EX2" /></label>
            <label>
              <span>Nível</span>
              <select name="level" defaultValue={metaString(metadata, "level") || "Básico"}>
                <option>Básico</option><option>Intermediário</option><option>Avançado</option>
              </select>
            </label>
            <label>
              <span>Status</span>
              <select name="status" defaultValue={metaString(metadata, "status") || "Disponível"}>
                <option>Disponível</option><option>Em preparação</option>
              </select>
            </label>
          </div>

          {[0, 1, 2].map((index) => {
            const resource = resources[index] ?? {};
            const number = index + 1;
            return (
              <fieldset className="admin-resource-fieldset" key={number}>
                <legend>Recurso {number}{number === 1 ? " (obrigatório)" : ""}</legend>
                <div className="admin-form__grid admin-form__grid--wide">
                  <label><span>Nome</span><input name={`resource${number}Label`} required={number === 1} defaultValue={resource.label ?? ""} placeholder="Assistir ao tutorial" /></label>
                  <label>
                    <span>Tipo</span>
                    <select name={`resource${number}Kind`} defaultValue={resource.kind ?? "video"}>
                      <option value="video">Vídeo</option><option value="pdf">PDF</option><option value="drive">Drive/arquivo</option>
                    </select>
                  </label>
                  <label><span>Link</span><input name={`resource${number}Url`} type="url" required={number === 1} defaultValue={resource.href ?? ""} placeholder="https://..." /></label>
                </div>
                <label><span>Descrição do recurso</span><input name={`resource${number}Description`} defaultValue={resource.description ?? ""} /></label>
              </fieldset>
            );
          })}
        </div>
      ) : null}

      {type === "application" ? (
        <div className="admin-form__grid admin-form__grid--wide">
          <label><span>Compatibilidade</span><input name="compatibility" defaultValue={metaString(metadata, "compatibility")} placeholder="Geely EX2" /></label>
          <label>
            <span>Status</span>
            <select name="status" defaultValue={metaString(metadata, "status") || "Disponível no Drive"}>
              <option>Disponível no Drive</option><option>Em validação</option>
            </select>
          </label>
          <label><span>Origem</span><input name="origin" defaultValue={metaString(metadata, "origin") || "Jean na Estrada"} /></label>
        </div>
      ) : null}

      {type === "partner" ? (
        <div className="admin-dynamic-fields">
          <label>
            <span>URL da imagem</span>
            <input name="imageUrl" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Envie acima ou cole https://..." />
          </label>
          <div className="admin-form__grid admin-form__grid--wide">
            <label><span>Texto do botão</span><input name="actionLabel" defaultValue={metaString(metadata, "actionLabel") || "Conhecer parceiro"} /></label>
            <label className="admin-form__span-2"><span>Serviços (um por linha)</span><textarea name="services" rows={4} defaultValue={Array.isArray(metadata.services) ? metadata.services.join("\n") : ""} /></label>
          </div>
        </div>
      ) : null}

      {type === "product" ? (
        <div className="admin-form__grid admin-form__grid--wide">
          <label>
            <span>Loja</span>
            <select name="retailer" defaultValue={metaString(metadata, "retailer") || "Mercado Livre"}>
              <option>Shopee</option><option>Mercado Livre</option><option>Amazon</option>
            </select>
          </label>
          <label><span>Destaque curto</span><input name="highlight" defaultValue={metaString(metadata, "highlight")} placeholder="Selecionado para o Dolphin" /></label>
        </div>
      ) : null}

      <div className="admin-form__checks">
        <label className="admin-checkbox">
          <input name="isPublished" type="checkbox" defaultChecked={initialData?.is_published ?? true} />
          <span>Publicar imediatamente</span>
        </label>
        <label className="admin-checkbox">
          <input name="isFeatured" type="checkbox" defaultChecked={initialData?.is_featured ?? false} />
          <span>Marcar como destaque</span>
        </label>
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
