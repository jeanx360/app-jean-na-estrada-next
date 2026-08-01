"use client";

import { Images, Save } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { saveHomeSlideAction } from "@/app/admin/home/actions";
import type { HomeCarouselActionState, HomeCarouselRow, HomeCarouselSource } from "@/types/home-carousel";

const initialState: HomeCarouselActionState = {};
type ContentOption = { id: string; title: string; content_type: string };

type Props = { initialData?: HomeCarouselRow | null; contents: ContentOption[] };

function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function AdminHomeCarouselForm({ initialData, contents }: Props) {
  const [state, action, pending] = useActionState(saveHomeSlideAction, initialState);
  const [sourceType, setSourceType] = useState<HomeCarouselSource>(initialData?.source_type ?? "custom");
  const [imageUrl, setImageUrl] = useState(initialData?.image_url ?? "");
  const [imagePath, setImagePath] = useState(initialData?.image_path ?? "");

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
    <form className="admin-form" action={action} id="home-carousel-form">
      <input type="hidden" name="slideId" value={initialData?.id ?? ""} />
      <input type="hidden" name="imagePath" value={imagePath} />
      <div className="admin-form__grid admin-form__grid--wide">
        <label><span>Tipo de destaque</span><select name="sourceType" value={sourceType} onChange={(event) => setSourceType(event.target.value as HomeCarouselSource)}><option value="custom">Personalizado</option><option value="latest_video">Último vídeo automático</option><option value="latest_news">Última notícia automática</option><option value="public_content">Publicação cadastrada</option></select></label>
        <label><span>Ordem</span><input name="sortOrder" type="number" min="0" max="100000" defaultValue={initialData?.sort_order ?? 100} /></label>
      </div>

      {sourceType === "public_content" ? (
        <label><span>Publicação</span><select name="publicContentId" required defaultValue={initialData?.public_content_id ?? ""}><option value="">Selecione</option>{contents.map((item) => <option value={item.id} key={item.id}>{item.title} · {item.content_type}</option>)}</select></label>
      ) : null}

      <div className="admin-form__grid admin-form__grid--wide">
        <label><span>Selo</span><input name="badge" defaultValue={initialData?.badge ?? ""} placeholder="DESTAQUE JNE" /></label>
        <label><span>Título opcional</span><input name="title" required={sourceType === "custom"} defaultValue={initialData?.title ?? ""} placeholder="No modo automático pode ficar vazio" /></label>
      </div>
      <label><span>Descrição opcional</span><textarea name="description" required={sourceType === "custom"} rows={3} defaultValue={initialData?.description ?? ""} /></label>
      <div className="admin-form__grid admin-form__grid--wide">
        <label><span>Texto do botão</span><input name="actionLabel" defaultValue={initialData?.action_label ?? ""} placeholder="Abrir destaque" /></label>
        <label><span>Link do botão</span><input name="actionUrl" defaultValue={initialData?.action_url ?? ""} placeholder="/pagina ou https://..." /></label>
      </div>
      <label><span>Imagem personalizada</span><input name="imageUrl" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Envie pelo uploader ou cole uma URL" /></label>
      <div className="admin-form__grid admin-form__grid--wide">
        <label><span>Início opcional (dd/mm/aaaa, 24h)</span><input name="startsAt" type="datetime-local" lang="pt-BR" step={60} defaultValue={localDate(initialData?.starts_at ?? null)} /></label>
        <label><span>Término opcional (dd/mm/aaaa, 24h)</span><input name="endsAt" type="datetime-local" lang="pt-BR" step={60} defaultValue={localDate(initialData?.ends_at ?? null)} /></label>
      </div>
      <label className="admin-checkbox"><input name="isPublished" type="checkbox" defaultChecked={initialData?.is_published ?? true} /><span>Exibir no carrossel</span></label>
      {state.error ? <p className="auth-message auth-message--error">{state.error}</p> : null}
      {state.success ? <p className="auth-message auth-message--success">{state.success}</p> : null}
      <button className="button button--primary" type="submit" disabled={pending}><Save size={18} /> {pending ? "Salvando..." : initialData ? "Salvar destaque" : "Criar destaque"}</button>
      {initialData ? <a className="button button--secondary" href="/admin/home#home-carousel-form"><Images size={17} /> Criar outro</a> : null}
    </form>
  );
}
