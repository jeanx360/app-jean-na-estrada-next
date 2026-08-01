"use client";

import { Megaphone } from "lucide-react";
import { useActionState } from "react";
import { createAnnouncementAction } from "@/app/admin/actions";
import type { AdminActionState } from "@/types/auth";

const initialState: AdminActionState = {};

export function AdminAnnouncementForm() {
  const [state, formAction, pending] = useActionState(createAnnouncementAction, initialState);

  return (
    <form className="admin-form" action={formAction}>
      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Título</span>
          <input name="title" required placeholder="Ex.: Novo tutorial disponível" />
        </label>
        <label>
          <span>Público</span>
          <select name="audience" defaultValue="member">
            <option value="all">Todos os membros</option>
            <option value="member">Membros cadastrados</option>
            <option value="vip">Somente VIP e admin</option>
            <option value="admin">Somente administradores</option>
          </select>
        </label>
      </div>
      <label>
        <span>Mensagem</span>
        <textarea name="message" rows={5} required placeholder="Escreva o recado que aparecerá na área de membros." />
      </label>
      <label className="admin-checkbox">
        <input name="isPublished" type="checkbox" defaultChecked />
        <span>Publicar imediatamente</span>
      </label>

      {state.error ? <p className="auth-message auth-message--error">{state.error}</p> : null}
      {state.success ? <p className="auth-message auth-message--success">{state.success}</p> : null}

      <button className="button button--primary" type="submit" disabled={pending}>
        <Megaphone size={18} />
        {pending ? "Salvando..." : "Salvar recado"}
      </button>
    </form>
  );
}
