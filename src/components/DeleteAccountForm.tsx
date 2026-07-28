"use client";

import { useActionState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { deleteOwnAccountAction } from "@/app/perfil/actions";
import type { AuthActionState } from "@/types/auth";

const initialState: AuthActionState = {};

export function DeleteAccountForm({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionState(deleteOwnAccountAction, initialState);
  return (
    <form className="delete-account-form" action={formAction}>
      <label><span>Digite EXCLUIR para confirmar</span><input name="confirmation" autoComplete="off" disabled={disabled || pending} /></label>
      {disabled ? <p>Contas administradoras precisam ter o nível alterado antes da exclusão.</p> : null}
      {state.error ? <p className="auth-message auth-message--error">{state.error}</p> : null}
      <button
        className="button button--danger"
        type="submit"
        disabled={disabled || pending}
        onClick={(event) => {
          if (!window.confirm("Esta ação é definitiva. Deseja realmente excluir sua conta e seus dados vinculados?")) event.preventDefault();
        }}
      >
        {pending ? <LoaderCircle className="auth-spinner" size={18} /> : <Trash2 size={18} />}
        {pending ? "Excluindo..." : "Excluir minha conta"}
      </button>
    </form>
  );
}
