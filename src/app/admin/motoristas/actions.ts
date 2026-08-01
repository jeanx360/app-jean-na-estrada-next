"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function audit(actorUserId: string, action: string, entityType: string, entityId: string, oldData?: unknown, newData?: unknown) {
  const admin = createAdminClient();
  await admin.from("admin_audit_logs").insert({
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_data: oldData ?? null,
    new_data: newData ?? null,
  });
}

function revalidateDriverAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/motoristas");
  revalidatePath("/admin/membros");
  revalidatePath("/motorista");
  revalidatePath("/motorista/reservas");
  revalidatePath("/motorista/orcamentos");
  revalidatePath("/motorista/financeiro");
}

export async function setDriverProfessionalStatusAction(formData: FormData) {
  const { userId: actorUserId } = await requireAdmin();
  if (!actorUserId) throw new Error("Sessão administrativa inválida.");
  const targetUserId = readText(formData, "userId");
  const active = readText(formData, "active") === "true";
  if (!targetUserId) throw new Error("Motorista inválido.");
  if (targetUserId === actorUserId && !active) throw new Error("Você não pode remover o próprio perfil profissional por este painel.");

  const admin = createAdminClient();
  const { data: oldProfile, error: readError } = await admin
    .from("profiles")
    .select("id, is_professional_driver")
    .eq("id", targetUserId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!oldProfile) throw new Error("Conta não encontrada.");

  const { error } = await admin
    .from("profiles")
    .update({ is_professional_driver: active, updated_at: new Date().toISOString() })
    .eq("id", targetUserId);
  if (error) throw new Error(error.message);

  if (!active) {
    const { error: publicError } = await admin
      .from("driver_public_profiles")
      .update({ is_published: false, accepts_reservations: false, updated_at: new Date().toISOString() })
      .eq("user_id", targetUserId);
    if (publicError) throw new Error(publicError.message);
  }

  await audit(actorUserId, active ? "ENABLE_DRIVER" : "DISABLE_DRIVER", "profiles", targetUserId, oldProfile, { is_professional_driver: active });
  revalidateDriverAdmin();
}

export async function setDriverPublicProfilePublishedAction(formData: FormData) {
  const { userId: actorUserId } = await requireAdmin();
  if (!actorUserId) throw new Error("Sessão administrativa inválida.");
  const targetUserId = readText(formData, "userId");
  const published = readText(formData, "published") === "true";
  if (!targetUserId) throw new Error("Motorista inválido.");

  const admin = createAdminClient();
  const { data: oldProfile, error: readError } = await admin
    .from("driver_public_profiles")
    .select("user_id, slug, is_published, accepts_reservations")
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!oldProfile) throw new Error("Este motorista ainda não criou um perfil público.");

  const { error } = await admin
    .from("driver_public_profiles")
    .update({ is_published: published, accepts_reservations: published, updated_at: new Date().toISOString() })
    .eq("user_id", targetUserId);
  if (error) throw new Error(error.message);

  await audit(actorUserId, published ? "PUBLISH_DRIVER_PROFILE" : "UNPUBLISH_DRIVER_PROFILE", "driver_public_profiles", targetUserId, oldProfile, { is_published: published });
  revalidateDriverAdmin();
  revalidatePath(`/m/${oldProfile.slug}`);
}

export async function deleteDriverRecordAdminAction(formData: FormData) {
  const { userId: actorUserId } = await requireAdmin();
  if (!actorUserId) throw new Error("Sessão administrativa inválida.");
  const recordId = readText(formData, "recordId");
  const recordKind = readText(formData, "recordKind");
  if (!recordId || !["reservation", "quote", "trip"].includes(recordKind)) {
    throw new Error("Registro inválido.");
  }

  const admin = createAdminClient();

  if (recordKind === "reservation") {
    const { data: record, error: readError } = await admin.from("driver_reservations").select("*").eq("id", recordId).maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!record) throw new Error("Reserva não encontrada.");
    const { error } = await admin.from("driver_reservations").delete().eq("id", recordId);
    if (error) throw new Error(error.message);
    await audit(actorUserId, "DELETE", "driver_reservations", recordId, record, null);
  }

  if (recordKind === "quote") {
    const { data: record, error: readError } = await admin.from("driver_quotes").select("*").eq("id", recordId).maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!record) throw new Error("Orçamento não encontrado.");
    const { error } = await admin.from("driver_quotes").delete().eq("id", recordId);
    if (error) throw new Error(error.message);
    await audit(actorUserId, "DELETE", "driver_quotes", recordId, record, null);
  }

  if (recordKind === "trip") {
    const { data: record, error: readError } = await admin.from("driver_trips").select("*").eq("id", recordId).maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!record) throw new Error("Viagem não encontrada.");
    const { error } = await admin.from("driver_trips").delete().eq("id", recordId);
    if (error) throw new Error(error.message);

    if (record.reservation_id) {
      await admin
        .from("driver_reservations")
        .update({ status: record.quote_id ? "quoted" : "negotiating", updated_at: new Date().toISOString() })
        .eq("id", record.reservation_id);
    }
    await audit(actorUserId, "DELETE", "driver_trips", recordId, record, null);
  }

  revalidateDriverAdmin();
  revalidatePath("/admin/logs");
}
