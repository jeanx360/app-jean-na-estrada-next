"use client";

import { Copy, KeyRound } from "lucide-react";
import { useActionState, useState } from "react";
import { createInviteAction } from "@/app/admin/actions";
import type { AdminActionState } from "@/types/auth";

const initialState: AdminActionState = {};

export function AdminInviteForm() {
  const [state, formAction, pending] = useActionState(createInviteAction, initialState);
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!state.code) return;
    await navigator.clipboard.writeText(state.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <form className="admin-form" action={formAction}>
      <div className="admin-form__grid">
        <label>
          <span>Identificação do convite</span>
          <input name="label" required placeholder="Ex.: membro do YouTube — julho" />
        </label>
        <label>
          <span>Limite de usos</span>
          <input name="maxUses" type="number" min="1" max="10000" defaultValue="1" required />
        </label>
        <label>
          <span>Validade opcional (até 23:59)</span>
          <input name="expiresAt" type="date" />
        </label>
      </div>

      {state.error ? <p className="auth-message auth-message--error">{state.error}</p> : null}
      {state.success ? <p className="auth-message auth-message--success">{state.success}</p> : null}

      {state.code ? (
        <div className="invite-code-result">
          <div>
            <KeyRound size={20} />
            <code>{state.code}</code>
          </div>
          <button className="button button--secondary" type="button" onClick={copyCode}>
            <Copy size={17} />
            {copied ? "Copiado" : "Copiar código"}
          </button>
        </div>
      ) : null}

      <button className="button button--primary" type="submit" disabled={pending}>
        <KeyRound size={18} />
        {pending ? "Criando..." : "Criar convite VIP"}
      </button>
    </form>
  );
}
