"use server";

import { redirect, RedirectType } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";
import type { AuthActionState } from "@/types/auth";

export async function deleteOwnAccountAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) return { error: "Faça login novamente." };
  if (profile?.role === "admin") {
    return { error: "Por segurança, uma conta administradora não pode ser excluída pelo aplicativo. Altere o nível antes de excluir." };
  }

  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (confirmation !== "EXCLUIR") {
    return { error: "Digite EXCLUIR para confirmar a remoção definitiva da conta." };
  }

  try {
    const admin = createAdminClient();
    await admin
      .from("push_subscriptions")
      .update({ is_active: false, user_id: null })
      .eq("user_id", userId);

    if (profile?.avatar_path) {
      await admin.storage.from("avatars").remove([profile.avatar_path]);
    }

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { error: `Não foi possível excluir a conta: ${error.message}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao excluir a conta." };
  }

  await supabase.auth.signOut();
  redirect("/?conta=excluida", RedirectType.replace);
}
