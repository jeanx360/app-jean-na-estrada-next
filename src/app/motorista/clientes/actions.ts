"use server";

import { revalidatePath } from "next/cache";
import { assertDriverFeature } from "@/lib/account-plan";
import { DRIVER_CUSTOMER_TAGS, type DriverCustomerTag } from "@/lib/driver-crm";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireOwnedCustomer(customerId: string) {
  const context = await assertDriverFeature("crm");

  const { data, error } = await context.supabase
    .from("driver_customers")
    .select("id")
    .eq("id", customerId)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Cliente não encontrado.");

  return context;
}

function revalidateCustomerPaths(customerId: string) {
  revalidatePath("/motorista");
  revalidatePath("/motorista/clientes");
  revalidatePath(`/motorista/clientes/${customerId}`);
}

export async function saveDriverCustomerAction(formData: FormData) {
  const customerId = readText(formData, "customerId");
  const customName = readText(formData, "customName");
  const privateNotes = readText(formData, "privateNotes");
  const rawTags = formData.getAll("tags").filter((value): value is string => typeof value === "string");
  const tags = Array.from(new Set(rawTags.filter((tag): tag is DriverCustomerTag => DRIVER_CUSTOMER_TAGS.includes(tag as DriverCustomerTag))));

  if (!customerId) throw new Error("Cliente inválido.");
  if (customName && (customName.length < 2 || customName.length > 80)) {
    throw new Error("O nome preferido deve ter entre 2 e 80 caracteres.");
  }
  if (privateNotes.length > 1500) throw new Error("As observações podem ter no máximo 1.500 caracteres.");

  const { supabase, userId } = await requireOwnedCustomer(customerId);
  const { error } = await supabase
    .from("driver_customers")
    .update({
      custom_name: customName || null,
      private_notes: privateNotes || null,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateCustomerPaths(customerId);
}

export async function setDriverCustomerArchivedAction(formData: FormData) {
  const customerId = readText(formData, "customerId");
  const archived = readText(formData, "archived") === "true";
  if (!customerId) throw new Error("Cliente inválido.");

  const { supabase, userId } = await requireOwnedCustomer(customerId);
  const { error } = await supabase
    .from("driver_customers")
    .update({ is_archived: archived, updated_at: new Date().toISOString() })
    .eq("id", customerId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateCustomerPaths(customerId);
}
