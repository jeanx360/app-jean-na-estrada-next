"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { runDriverNotificationAutomations } from "@/lib/driver-automation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function runDriverAutomationsNowAction() {
  await requireAdmin();
  const result = await runDriverNotificationAutomations(createAdminClient(), "admin");
  if (!result.ok) throw new Error(result.error || "A execução das automações falhou.");

  revalidatePath("/admin/automacoes");
  revalidatePath("/admin");
  revalidatePath("/motorista/notificacoes");
}
