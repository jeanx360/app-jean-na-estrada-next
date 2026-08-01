"use client";

import { LayoutGrid, Save } from "lucide-react";
import { useActionState } from "react";
import { saveQuickAccessItemAction } from "@/app/admin/home/actions";
import type {
  HomeQuickAccessActionState,
  HomeQuickAccessRow,
} from "@/types/home-quick-access";

const initialState: HomeQuickAccessActionState = {};

type Props = { initialData?: HomeQuickAccessRow | null };

export function AdminQuickAccessForm({ initialData }: Props) {
  const [state, action, pending] = useActionState(saveQuickAccessItemAction, initialState);

  return (
    <form className="admin-form" action={action} id="quick-access-form">
      <input type="hidden" name="itemId" value={initialData?.id ?? ""} />

      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Título</span>
          <input name="title" required maxLength={70} defaultValue={initialData?.title ?? ""} placeholder="Ex.: Comunidade VIP" />
        </label>
        <label>
          <span>Ordem</span>
          <input name="sortOrder" type="number" min="0" max="100000" defaultValue={initialData?.sort_order ?? 100} />
        </label>
      </div>

      <label>
        <span>Descrição</span>
        <textarea name="description" required rows={2} maxLength={180} defaultValue={initialData?.description ?? ""} placeholder="Uma frase curta para explicar o atalho." />
      </label>

      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Destino</span>
          <input name="href" required defaultValue={initialData?.href ?? ""} placeholder="/comunidade ou https://..." />
        </label>
        <label>
          <span>Ícone</span>
          <select name="icon" defaultValue={initialData?.icon ?? "videos"}>
            <option value="videos">Vídeos</option>
            <option value="manuals">Guia e manuais</option>
            <option value="apps">Aplicativos</option>
            <option value="products">Produtos</option>
            <option value="calculator">Calculadora</option>
            <option value="vip">VIP</option>
            <option value="community">Comunidade</option>
            <option value="news">Notícias</option>
            <option value="partners">Parceiros</option>
          </select>
        </label>
      </div>

      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Cor</span>
          <select name="accent" defaultValue={initialData?.accent ?? "blue"}>
            <option value="blue">Azul</option>
            <option value="cyan">Ciano</option>
            <option value="orange">Laranja</option>
            <option value="violet">Violeta</option>
          </select>
        </label>
        <label className="admin-checkbox">
          <input name="isPublished" type="checkbox" defaultChecked={initialData?.is_published ?? true} />
          <span>Exibir na página inicial</span>
        </label>
      </div>

      {state.error ? <p className="auth-message auth-message--error">{state.error}</p> : null}
      {state.success ? <p className="auth-message auth-message--success">{state.success}</p> : null}

      <div className="admin-inline-actions">
        <button className="button button--primary" type="submit" disabled={pending}>
          <Save size={18} /> {pending ? "Salvando..." : initialData ? "Salvar atalho" : "Criar atalho"}
        </button>
        {initialData ? <a className="button button--secondary" href="/admin/home#quick-access-form"><LayoutGrid size={17} /> Criar outro</a> : null}
      </div>
    </form>
  );
}
