"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { runDriverNotificationAutomations } from "@/lib/driver-automation";
import { createAdminClient } from "@/lib/supabase/admin";
import { processReleaseCenterAutomations } from "@/lib/release-center";

export async function runDriverAutomationsNowAction() {
  await requireAdmin();
  const driverResult = await runDriverNotificationAutomations(createAdminClient(), "admin");
  const releaseResult = await processReleaseCenterAutomations();
  if (!driverResult.ok || !releaseResult.ok) {
    const errors = [
      driverResult.error,
      ...releaseResult.errors,
    ].filter(Boolean).join(" ");
    throw new Error(errors || "A execução das automações falhou.");
  }

  revalidatePath("/admin/automacoes");
  revalidatePath("/admin/atualizacoes");
  revalidatePath("/admin");
  revalidatePath("/admin/notificacoes");
  revalidatePath("/admin/comunidade");
  revalidatePath("/notificacoes");
  revalidatePath("/comunidade");
  revalidatePath("/motorista/notificacoes");
}
