"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import type { AccountPlanCode, AccountSubscriptionStatus } from "@/lib/account-plan";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalDate(formData: FormData, key: string) {
  const value = readText(formData, key);
  if (!value) return null;
  const date = new Date(`${value}T23:59:59-03:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Data inválida.");
  return date.toISOString();
}

function readStartDate(formData: FormData, key: string) {
  const value = readText(formData, key);
  if (!value) return new Date().toISOString();
  const date = new Date(`${value}T00:00:00-03:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Data de início inválida.");
  return date.toISOString();
}

function revalidatePlanPages() {
  revalidatePath("/admin/assinatura");
  revalidatePath("/membros");
  revalidatePath("/planos");
  revalidatePath("/motorista");
}

export async function updateAppPlanCatalogAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const planCode = readText(formData, "planCode") as AccountPlanCode;
  const description = readText(formData, "description");
  const trialDays = Number(readText(formData, "trialDays"));
  const isActive = formData.get("isActive") === "on";

  if (!(["free", "professional", "premium"] as string[]).includes(planCode)) {
    throw new Error("Plano inválido.");
  }
  if (description.length < 20 || description.length > 500) {
    throw new Error("A descrição precisa ter entre 20 e 500 caracteres.");
  }
  if (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > 90) {
    throw new Error("O período de teste precisa estar entre 0 e 90 dias.");
  }

  const { error } = await supabase
    .from("app_plan_catalog")
    .update({ description, trial_days: trialDays, is_active: planCode === "free" ? true : isActive })
    .eq("code", planCode);

  if (error) throw new Error(error.message);
  revalidatePlanPages();
}

export async function setAccountSubscriptionAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const userId = readText(formData, "userId");
  const planCode = readText(formData, "planCode") as AccountPlanCode;
  const status = readText(formData, "status") as AccountSubscriptionStatus;
  const startsAt = readStartDate(formData, "startsAt");
  const expiresAt = formData.get("noExpiry") === "on" ? null : readOptionalDate(formData, "expiresAt");
  const trialEndsAt = status === "trial" ? readOptionalDate(formData, "trialEndsAt") : null;
  const notes = readText(formData, "notes");

  if (!userId) throw new Error("Membro inválido.");
  if (!(["free", "professional", "premium"] as string[]).includes(planCode)) throw new Error("Plano inválido.");
  if (!(["trial", "active", "past_due", "suspended", "cancelled", "expired"] as string[]).includes(status)) {
    throw new Error("Status inválido.");
  }
  if (notes.length > 600) throw new Error("A observação pode ter no máximo 600 caracteres.");

  const { error } = await supabase.rpc("admin_set_account_subscription", {
    target_user_id: userId,
    selected_plan_code: planCode,
    selected_status: status,
    selected_starts_at: startsAt,
    selected_expires_at: expiresAt,
    selected_trial_ends_at: trialEndsAt,
    admin_notes: notes || null,
  });

  if (error) throw new Error(error.message);
  revalidatePlanPages();
}

export async function clearAccountSubscriptionAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const userId = readText(formData, "userId");
  const notes = readText(formData, "notes");
  if (!userId) throw new Error("Membro inválido.");

  const { error } = await supabase.rpc("admin_clear_account_subscription", {
    target_user_id: userId,
    admin_notes: notes || null,
  });

  if (error) throw new Error(error.message);
  revalidatePlanPages();
}
