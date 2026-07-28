"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import type { AdminActionState, MemberRole } from "@/types/auth";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function normalizeDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59-03:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function updateMemberRoleAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const targetUserId = readText(formData, "userId");
  const role = readText(formData, "role") as MemberRole;

  if (!targetUserId || !["member", "vip", "admin"].includes(role)) {
    throw new Error("Dados de membro inválidos.");
  }

  const { error } = await supabase.rpc("admin_update_member_role", {
    target_user_id: targetUserId,
    new_role: role,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/membros");
  revalidatePath("/membros");
  revalidatePath("/vip");
}

export async function setMemberBlockedAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const targetUserId = readText(formData, "userId");
  const blocked = readText(formData, "blocked") === "true";
  const reason = readText(formData, "reason");

  if (!targetUserId) throw new Error("Membro inválido.");

  const { error } = await supabase.rpc("admin_set_member_blocked", {
    target_user_id: targetUserId,
    blocked,
    reason: reason || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/membros");
}

export async function createInviteAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { supabase, userId } = await requireAdmin();
  const label = readText(formData, "label");
  const maxUses = Number(readText(formData, "maxUses") || "1");
  const expiresAt = normalizeDate(readText(formData, "expiresAt"));

  if (!label) return { error: "Informe um nome para identificar o convite." };
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 10000) {
    return { error: "O limite de usos deve ficar entre 1 e 10.000." };
  }

  const code = `JNE-${randomBytes(8).toString("hex").toUpperCase()}`;
  const codeHash = createHash("sha256").update(code).digest("hex");
  const codeHint = code.slice(-6);

  const { error } = await supabase.from("vip_invites").insert({
    code_hash: codeHash,
    code_hint: codeHint,
    label,
    max_uses: maxUses,
    expires_at: expiresAt,
    created_by: userId,
  });

  if (error) return { error: `Não foi possível criar o convite: ${error.message}` };

  revalidatePath("/admin/convites");
  return {
    success: "Convite criado. Copie o código agora: ele não será exibido novamente.",
    code,
  };
}

export async function revokeInviteAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const inviteId = readText(formData, "inviteId");
  if (!inviteId) throw new Error("Convite inválido.");

  const { error } = await supabase
    .from("vip_invites")
    .update({ is_active: false })
    .eq("id", inviteId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/convites");
}

export async function createAnnouncementAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { supabase, userId } = await requireAdmin();
  const title = readText(formData, "title");
  const message = readText(formData, "message");
  const audience = readText(formData, "audience");
  const isPublished = readBoolean(formData, "isPublished");

  if (!title || !message) return { error: "Preencha o título e a mensagem." };
  if (!["all", "member", "vip", "admin"].includes(audience)) {
    return { error: "Público do recado inválido." };
  }

  const { error } = await supabase.from("announcements").insert({
    title,
    message,
    audience,
    is_published: isPublished,
    published_at: new Date().toISOString(),
    created_by: userId,
  });

  if (error) return { error: `Não foi possível salvar o recado: ${error.message}` };
  revalidatePath("/admin/recados");
  revalidatePath("/membros");
  return { success: isPublished ? "Recado publicado." : "Recado salvo como rascunho." };
}

export async function toggleAnnouncementAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const announcementId = readText(formData, "announcementId");
  const publish = readText(formData, "publish") === "true";
  if (!announcementId) throw new Error("Recado inválido.");

  const { error } = await supabase
    .from("announcements")
    .update({ is_published: publish, published_at: new Date().toISOString() })
    .eq("id", announcementId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/recados");
  revalidatePath("/membros");
}

export async function deleteAnnouncementAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const announcementId = readText(formData, "announcementId");
  if (!announcementId) throw new Error("Recado inválido.");

  const { error } = await supabase.from("announcements").delete().eq("id", announcementId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/recados");
  revalidatePath("/membros");
}

export async function createVipContentAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { supabase } = await requireAdmin();
  const title = readText(formData, "title");
  const description = readText(formData, "description");
  const category = readText(formData, "category") || "Geral";
  const contentType = readText(formData, "contentType");
  const externalUrl = readText(formData, "externalUrl");
  const body = readText(formData, "body");
  const isPublished = readBoolean(formData, "isPublished");
  const isFeatured = readBoolean(formData, "isFeatured");

  if (!title) return { error: "Informe o título do conteúdo." };
  if (!['text', 'link'].includes(contentType)) return { error: "Tipo de conteúdo inválido." };
  if (contentType === "link" && !/^https:\/\//i.test(externalUrl)) {
    return { error: "O link externo precisa começar com https://" };
  }

  const { error } = await supabase.from("vip_content").insert({
    title,
    description: description || null,
    category,
    content_type: contentType,
    external_url: contentType === "link" ? externalUrl : null,
    content: contentType === "text" ? { body } : {},
    is_published: isPublished,
    is_featured: isFeatured,
    published_at: new Date().toISOString(),
  });

  if (error) return { error: `Não foi possível salvar o conteúdo: ${error.message}` };
  revalidatePath("/admin/conteudos");
  revalidatePath("/vip");
  return { success: isPublished ? "Conteúdo publicado." : "Conteúdo salvo como rascunho." };
}

export async function toggleVipContentAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const contentId = readText(formData, "contentId");
  const publish = readText(formData, "publish") === "true";
  if (!contentId) throw new Error("Conteúdo inválido.");

  const { error } = await supabase
    .from("vip_content")
    .update({ is_published: publish, published_at: new Date().toISOString() })
    .eq("id", contentId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/conteudos");
  revalidatePath("/vip");
}

export async function deleteVipContentAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const contentId = readText(formData, "contentId");
  if (!contentId) throw new Error("Conteúdo inválido.");

  const { data: item, error: readError } = await supabase
    .from("vip_content")
    .select("file_path")
    .eq("id", contentId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (item?.file_path) {
    const { error: storageError } = await supabase.storage.from("vip-files").remove([item.file_path]);
    if (storageError) throw new Error(storageError.message);
  }

  const { error } = await supabase.from("vip_content").delete().eq("id", contentId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/conteudos");
  revalidatePath("/vip");
}
