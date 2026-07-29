"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import type { AuthActionState } from "@/types/auth";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createSubscriptionRequestAction(
  formData: FormData,
): Promise<AuthActionState> {
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) return { error: "Faça login novamente." };
  if (profile?.is_blocked) return { error: "Esta conta está bloqueada." };

  const paymentMethod = readText(formData, "paymentMethod");
  const paymentReference = readText(formData, "paymentReference");
  const proofPath = readText(formData, "proofPath");
  const notes = readText(formData, "notes");

  if (!['payment_link', 'pix'].includes(paymentMethod)) {
    return { error: "Forma de pagamento inválida." };
  }
  if (!paymentReference && !proofPath) {
    return { error: "Informe a referência do pagamento ou envie um comprovante." };
  }
  if (notes.length > 500) return { error: "A observação pode ter no máximo 500 caracteres." };

  const { data: plan, error: planError } = await supabase
    .from("vip_plan_settings")
    .select("price_cents, is_active, pix_enabled, recurring_payment_link")
    .eq("id", 1)
    .maybeSingle();

  if (planError || !plan?.is_active) return { error: "O plano VIP não está disponível no momento." };
  if (paymentMethod === "pix" && !plan.pix_enabled) return { error: "O pagamento por Pix não está disponível." };
  if (paymentMethod === "payment_link" && !plan.recurring_payment_link) {
    return { error: "O link de assinatura ainda não foi configurado." };
  }

  const { data: pending } = await supabase
    .from("vip_subscription_requests")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (pending) return { error: "Você já possui um pedido aguardando análise." };

  const { error } = await supabase.from("vip_subscription_requests").insert({
    user_id: userId,
    payment_method: paymentMethod,
    amount_cents: plan.price_cents,
    payment_reference: paymentReference || null,
    proof_path: proofPath || null,
    notes: notes || null,
  });

  if (error) return { error: `Não foi possível enviar o pedido: ${error.message}` };

  revalidatePath("/assinar");
  revalidatePath("/admin/assinatura");
  return { success: "Pedido enviado. A administração verificará o pagamento e liberará seu acesso VIP." };
}
