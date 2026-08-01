"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { acceptLegalDocumentsAction } from "@/app/aceite/actions";
import { LEGAL_DOCUMENTS } from "@/lib/legal";
import type { AuthActionState } from "@/types/auth";

const initialState: AuthActionState = {};

export function LegalAcceptanceForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(acceptLegalDocumentsAction, initialState);

  return (
    <form className="legal-acceptance-form" action={formAction}>
      <input type="hidden" name="next" value={next} />
      <div className="legal-acceptance-list">
        {LEGAL_DOCUMENTS.map((document) => (
          <label key={document.type}>
            <input type="checkbox" name={`accept_${document.type}`} required />
            <span>
              Li e aceito os <Link href={document.href} target="_blank">{document.label}</Link>
              <small>Versão {document.version}</small>
            </span>
          </label>
        ))}
      </div>

      {state.error ? <p className="auth-message auth-message--error">{state.error}</p> : null}
      <button className="button button--primary" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="auth-spinner" size={18} /> : <ShieldCheck size={18} />}
        {pending ? "Registrando..." : "Aceitar e continuar"}
      </button>
      <p className="legal-acceptance-note">
        O aceite fica registrado na sua conta. Quando um documento mudar de versão, o app solicitará uma nova confirmação.
      </p>
    </form>
  );
}
