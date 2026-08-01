"use client";

import { useRef, useState } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { createCommunityCategoryAction } from "@/app/comunidade/actions";

export function AdminCommunityCategoryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await createCommunityCategoryAction({}, new FormData(event.currentTarget));
    setPending(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    formRef.current?.reset();
    setMessage({ type: "success", text: result.success || "Categoria criada." });
  }

  return (
    <form ref={formRef} className="admin-community-category-form" onSubmit={handleSubmit}>
      <div className="admin-form-grid">
        <label>
          <span>Nome</span>
          <input name="name" required minLength={2} maxLength={60} placeholder="Ex.: Acessórios" />
        </label>
        <label>
          <span>Slug opcional</span>
          <input name="slug" maxLength={60} placeholder="acessorios" />
        </label>
        <label>
          <span>Ícone</span>
          <input name="icon" defaultValue="message-circle" maxLength={60} />
        </label>
        <label>
          <span>Ordem</span>
          <input name="sortOrder" type="number" defaultValue="100" />
        </label>
      </div>
      <label>
        <span>Descrição</span>
        <textarea name="description" rows={2} maxLength={240} />
      </label>
      {message ? <p className={`auth-message auth-message--${message.type}`}>{message.text}</p> : null}
      <button className="button button--primary" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="auth-spinner" size={17} /> : <Plus size={17} />}
        {pending ? "Criando..." : "Criar categoria"}
      </button>
    </form>
  );
}
