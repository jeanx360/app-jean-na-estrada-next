"use client";

import { BellRing, Send } from "lucide-react";
import { useActionState } from "react";
import { createNotificationAction } from "@/app/admin/notificacoes/actions";
import type { NotificationActionState } from "@/types/notification";

const initialState: NotificationActionState = {};

export function AdminNotificationForm() {
  const [state, formAction, pending] = useActionState(createNotificationAction, initialState);

  return (
    <form className="admin-form" action={formAction}>
      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Título</span>
          <input name="title" required placeholder="Ex.: Novo vídeo disponível" />
        </label>
        <label>
          <span>Público</span>
          <select name="audience" defaultValue="all">
            <option value="all">Todos, inclusive visitantes</option>
            <option value="member">Membros cadastrados</option>
            <option value="vip">VIP e administradores</option>
            <option value="admin">Somente administradores</option>
          </select>
        </label>
        <label>
          <span>Categoria</span>
          <select name="category" defaultValue="general">
            <option value="general">Aviso geral</option>
            <option value="videos">Vídeos</option>
            <option value="tutorials">Tutoriais</option>
            <option value="apps">Aplicativos</option>
            <option value="benefits">Parceiros e benefícios</option>
          </select>
        </label>
      </div>

      <label>
        <span>Mensagem</span>
        <textarea name="message" rows={5} required placeholder="Escreva uma mensagem curta e clara." />
      </label>

      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Destino ao tocar</span>
          <input name="actionUrl" placeholder="/videos ou https://..." />
        </label>
        <label>
          <span>Imagem opcional</span>
          <input name="imageUrl" placeholder="/imagem.webp ou https://..." />
        </label>
      </div>

      <div className="admin-form__checks">
        <label className="admin-checkbox">
          <input name="isPublished" type="checkbox" defaultChecked />
          <span>Publicar na central imediatamente</span>
        </label>
        <label className="admin-checkbox">
          <input name="isFeatured" type="checkbox" />
          <span>Destacar também na página inicial</span>
        </label>
        <label className="admin-checkbox">
          <input name="sendPush" type="checkbox" />
          <span>Enviar Web Push agora</span>
        </label>
      </div>

      {state.error ? <p className="auth-message auth-message--error">{state.error}</p> : null}
      {state.success ? <p className="auth-message auth-message--success">{state.success}</p> : null}

      <button className="button button--primary" type="submit" disabled={pending}>
        {pending ? <BellRing className="is-spinning" size={18} /> : <Send size={18} />}
        {pending ? "Publicando..." : "Publicar notificação"}
      </button>
    </form>
  );
}
