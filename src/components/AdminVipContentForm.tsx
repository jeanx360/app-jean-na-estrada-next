"use client";

import { FileText, Link2 } from "lucide-react";
import { useActionState, useState } from "react";
import { createVipContentAction } from "@/app/admin/actions";
import type { AdminActionState } from "@/types/auth";

const initialState: AdminActionState = {};

export function AdminVipContentForm() {
  const [state, formAction, pending] = useActionState(createVipContentAction, initialState);
  const [type, setType] = useState<"text" | "link">("text");

  return (
    <form className="admin-form" action={formAction}>
      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Título</span>
          <input name="title" required placeholder="Título do conteúdo exclusivo" />
        </label>
        <label>
          <span>Categoria</span>
          <input name="category" defaultValue="Geral" placeholder="APKs, Tutorial, Benefício..." />
        </label>
        <label>
          <span>Tipo</span>
          <select
            name="contentType"
            value={type}
            onChange={(event) => setType(event.target.value as "text" | "link")}
          >
            <option value="text">Texto</option>
            <option value="link">Link externo</option>
          </select>
        </label>
      </div>

      <label>
        <span>Descrição curta</span>
        <textarea name="description" rows={3} placeholder="Resumo exibido no card da área VIP." />
      </label>

      {type === "text" ? (
        <label>
          <span>Conteúdo</span>
          <textarea name="body" rows={7} placeholder="Digite o conteúdo completo." />
        </label>
      ) : (
        <label>
          <span>Endereço externo</span>
          <div className="admin-input-with-icon">
            <Link2 size={18} />
            <input name="externalUrl" type="url" required placeholder="https://..." />
          </div>
        </label>
      )}

      <div className="admin-form__checks">
        <label className="admin-checkbox">
          <input name="isPublished" type="checkbox" defaultChecked />
          <span>Publicar imediatamente</span>
        </label>
        <label className="admin-checkbox">
          <input name="isFeatured" type="checkbox" />
          <span>Marcar como destaque</span>
        </label>
      </div>

      {state.error ? <p className="auth-message auth-message--error">{state.error}</p> : null}
      {state.success ? <p className="auth-message auth-message--success">{state.success}</p> : null}

      <button className="button button--primary" type="submit" disabled={pending}>
        <FileText size={18} />
        {pending ? "Salvando..." : "Salvar conteúdo"}
      </button>
    </form>
  );
}
