"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import {
  DRIVER_CAMPAIGN_SOURCE_OPTIONS,
  normalizeDriverCampaignCode,
  normalizeDriverMarketingSource,
} from "@/lib/driver-marketing";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireDriver() {
  const context = await getAuthContext();
  if (!context.userId || !context.profile?.is_professional_driver || context.profile.is_blocked) {
    throw new Error("Acesso de motorista necessário.");
  }
  return context;
}

function revalidateMarketingPages() {
  revalidatePath("/motorista");
  revalidatePath("/motorista/cartao");
  revalidatePath("/motorista/desempenho");
}

export async function createDriverCampaignAction(formData: FormData) {
  const name = text(formData, "name").slice(0, 80);
  const source = normalizeDriverMarketingSource(text(formData, "source"));

  if (name.length < 3) throw new Error("Informe um nome com pelo menos 3 caracteres.");
  if (!(DRIVER_CAMPAIGN_SOURCE_OPTIONS as readonly string[]).includes(source)) {
    throw new Error("Escolha uma origem válida para a campanha.");
  }

  const { supabase, userId } = await requireDriver();
  const { count, error: countError } = await supabase
    .from("driver_marketing_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (countError) throw new Error("Execute a migration 1.11.0 antes de criar campanhas.");
  if ((count ?? 0) >= 50) throw new Error("Arquive uma campanha antes de criar outra.");

  const baseCode = normalizeDriverCampaignCode(name).slice(0, 36) || "campanha";
  const code = `${baseCode}-${randomBytes(3).toString("hex")}`;
  const { error } = await supabase.from("driver_marketing_campaigns").insert({
    user_id: userId,
    name,
    code,
    source,
    is_active: true,
  });

  if (error) throw new Error(error.message);
  revalidateMarketingPages();
}

export async function setDriverCampaignActiveAction(formData: FormData) {
  const campaignId = text(formData, "campaignId");
  const isActive = text(formData, "isActive") === "true";
  if (!campaignId) throw new Error("Campanha inválida.");

  const { supabase, userId } = await requireDriver();
  const { error } = await supabase
    .from("driver_marketing_campaigns")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateMarketingPages();
}
