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


export async function setDriverNetworkVerificationAction(formData: FormData) {
  const { supabase, userId: actorUserId } = await requireAdmin();
  if (!actorUserId) throw new Error("Sessão administrativa inválida.");
  const targetUserId = readText(formData, "userId");
  const status = readText(formData, "status");
  const notes = readText(formData, "notes");
  if (!targetUserId) throw new Error("Motorista inválido.");
  if (!["pending", "verified", "rejected"].includes(status)) throw new Error("Situação de verificação inválida.");

  const admin = createAdminClient();
  const { data: oldSettings, error: readError } = await admin
    .from("driver_network_settings")
    .select("*")
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!oldSettings) throw new Error("Este motorista ainda não solicitou participação na rede.");

  const { error } = await supabase.rpc("admin_set_driver_network_verification", {
    target_user_id: targetUserId,
    selected_status: status,
    admin_notes: notes || null,
  });
  if (error) throw new Error(error.message);

  await audit(actorUserId, "SET_DRIVER_NETWORK_VERIFICATION", "driver_network_settings", targetUserId, oldSettings, {
    verification_status: status,
    verification_notes: notes || null,
  });
  revalidateDriverAdmin();
  revalidatePath("/motoristas");
  revalidatePath("/motorista/rede");
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

const DRIVER_PROFILE_ASSET_BUCKET = "driver-profile-assets";
const DRIVER_PROFILE_THEMES = new Set(["dark", "blue", "green"]);
const DRIVER_BANNER_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function updateDriverPublicProfileAppearanceAction(formData: FormData) {
  const { userId: actorUserId } = await requireAdmin();
  if (!actorUserId) throw new Error("Sessão administrativa inválida.");

  const targetUserId = readText(formData, "userId");
  const theme = readText(formData, "theme");
  const showVehicleBanner = readText(formData, "showVehicleBanner") === "true";
  const removeVehicleBanner = readText(formData, "removeVehicleBanner") === "true";
  const uploadedFile = formData.get("vehicleBanner");

  if (!targetUserId) throw new Error("Motorista inválido.");
  if (!DRIVER_PROFILE_THEMES.has(theme)) throw new Error("Tema inválido.");

  const admin = createAdminClient();
  const { data: oldProfile, error: readError } = await admin
    .from("driver_public_profiles")
    .select("user_id,slug,theme,vehicle_banner_url,vehicle_banner_path,show_vehicle_banner")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (!oldProfile) throw new Error("Este motorista ainda não criou um perfil público.");

  let nextBannerUrl = removeVehicleBanner ? null : oldProfile.vehicle_banner_url;
  let nextBannerPath = removeVehicleBanner ? null : oldProfile.vehicle_banner_path;
  let newUploadPath: string | null = null;

  if (uploadedFile instanceof File && uploadedFile.size > 0) {
    const extension = DRIVER_BANNER_TYPES.get(uploadedFile.type);
    if (!extension) throw new Error("Use uma imagem JPG, PNG ou WebP.");
    if (uploadedFile.size > 6 * 1024 * 1024) throw new Error("A foto do carro pode ter no máximo 6 MB.");

    newUploadPath = `${targetUserId}/admin-vehicle-${Date.now()}.${extension}`;
    const bytes = Buffer.from(await uploadedFile.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(DRIVER_PROFILE_ASSET_BUCKET)
      .upload(newUploadPath, bytes, {
        cacheControl: "3600",
        contentType: uploadedFile.type,
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);
    const { data: publicData } = admin.storage.from(DRIVER_PROFILE_ASSET_BUCKET).getPublicUrl(newUploadPath);
    nextBannerUrl = publicData.publicUrl;
    nextBannerPath = newUploadPath;
  }

  const payload = {
    theme,
    vehicle_banner_url: nextBannerUrl,
    vehicle_banner_path: nextBannerPath,
    show_vehicle_banner: showVehicleBanner && Boolean(nextBannerUrl),
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await admin
    .from("driver_public_profiles")
    .update(payload)
    .eq("user_id", targetUserId);

  if (updateError) {
    if (newUploadPath) await admin.storage.from(DRIVER_PROFILE_ASSET_BUCKET).remove([newUploadPath]);
    throw new Error(updateError.message);
  }

  const oldPath = oldProfile.vehicle_banner_path as string | null;
  if (oldPath && oldPath !== nextBannerPath) {
    await admin.storage.from(DRIVER_PROFILE_ASSET_BUCKET).remove([oldPath]);
  }

  await audit(actorUserId, "UPDATE_DRIVER_PROFILE_APPEARANCE", "driver_public_profiles", targetUserId, oldProfile, payload);
  revalidateDriverAdmin();
  revalidatePath(`/m/${oldProfile.slug}`);
}
