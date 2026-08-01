"use client";

import { KeyRound } from "lucide-react";
import { useActionState } from "react";
import { redeemInviteAction } from "@/app/membros/actions";
import type { AuthActionState } from "@/types/auth";

const initialState: AuthActionState = {};

export function RedeemInviteForm() {
  const [state, formAction, pending] = useActionState(redeemInviteAction, initialState);

  return (
    <form className="invite-redeem-form" action={formAction}>
      <div>
        <KeyRound size={20} />
        <input name="code" required placeholder="JNE-XXXXXXXXXXXXXXXX" autoCapitalize="characters" />
      </div>
      <button className="button button--primary" type="submit" disabled={pending}>
        {pending ? "Ativando..." : "Ativar convite"}
      </button>
      {state.error ? <p className="auth-message auth-message--error">{state.error}</p> : null}
      {state.success ? <p className="auth-message auth-message--success">{state.success}</p> : null}
    </form>
  );
}
