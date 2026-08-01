"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import type { AuthActionState } from "@/types/auth";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export async function redeemInviteAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) return { error: "Faça login antes de usar um convite." };
  if (profile?.is_blocked) return { error: "Esta conta está bloqueada." };

  const code = readText(formData, "code");
  if (!code) return { error: "Informe o código do convite." };

  const { data, error } = await supabase.rpc("redeem_vip_invite", { invite_code: code });
  if (error) return { error: error.message };

  const messages: Record<string, string> = {
    already_vip: "Sua conta já possui acesso VIP.",
    invalid: "Convite inválido ou não encontrado.",
    inactive: "Este convite foi desativado.",
    expired: "Este convite expirou.",
    limit_reached: "Este convite atingiu o limite de usos.",
    already_used: "Este convite já foi utilizado pela sua conta.",
    blocked: "Esta conta está bloqueada.",
    rate_limited: "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.",
  };

  if (data !== "success" && data !== "already_vip") {
    return { error: messages[String(data)] ?? "Não foi possível ativar o convite." };
  }

  revalidatePath("/membros");
  revalidatePath("/vip");
  return { success: data === "already_vip" ? messages.already_vip : "Convite ativado. Sua conta agora possui acesso VIP." };
}
