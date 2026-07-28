"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { LEGAL_DOCUMENTS, safeInternalPath } from "@/lib/legal";
import type { AuthActionState } from "@/types/auth";

export async function acceptLegalDocumentsAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) return { error: "Faça login para registrar o aceite." };
  if (profile?.is_blocked) return { error: "Esta conta está bloqueada." };

  const acceptedAll = LEGAL_DOCUMENTS.every(
    (document) => formData.get(`accept_${document.type}`) === "on",
  );
  if (!acceptedAll) {
    return { error: "É necessário ler e aceitar os três documentos para continuar." };
  }

  const acceptedAt = new Date().toISOString();
  const rows = LEGAL_DOCUMENTS.map((document) => ({
    user_id: userId,
    document_type: document.type,
    version: document.version,
    accepted_at: acceptedAt,
  }));

  const { error } = await supabase
    .from("user_legal_acceptances")
    .upsert(rows, { onConflict: "user_id,document_type" });

  if (error) {
    return { error: `Não foi possível registrar o aceite: ${error.message}` };
  }

  revalidatePath("/membros");
  revalidatePath("/vip");
  revalidatePath("/admin");
  redirect(safeInternalPath(String(formData.get("next") ?? "")), RedirectType.replace);
}
