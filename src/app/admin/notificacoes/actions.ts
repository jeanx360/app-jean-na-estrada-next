"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { sendPushNotification } from "@/lib/push";
import type {
  NotificationActionState,
  NotificationAudience,
  NotificationCategory,
  NotificationRow,
} from "@/types/notification";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function validUrl(value: string) {
  return !value || value.startsWith("/") || /^https:\/\//i.test(value);
}

function revalidateNotifications() {
  revalidatePath("/");
  revalidatePath("/notificacoes");
  revalidatePath("/configuracoes");
  revalidatePath("/admin");
  revalidatePath("/admin/notificacoes");
}

export async function createNotificationAction(
  _previousState: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  const { supabase, userId } = await requireAdmin();
  const title = readText(formData, "title");
  const message = readText(formData, "message");
  const audience = readText(formData, "audience") as NotificationAudience;
  const category = readText(formData, "category") as NotificationCategory;
  const actionUrl = readText(formData, "actionUrl");
  const imageUrl = readText(formData, "imageUrl");
  const isPublished = readBoolean(formData, "isPublished");
  const isFeatured = readBoolean(formData, "isFeatured");
  const sendPush = readBoolean(formData, "sendPush");

  if (!title || !message) return { error: "Preencha o título e a mensagem." };
  if (!["all", "member", "vip", "admin"].includes(audience)) {
    return { error: "Público inválido." };
  }
  if (!["general", "videos", "tutorials", "apps", "benefits"].includes(category)) {
    return { error: "Categoria inválida." };
  }
  if (!validUrl(actionUrl) || !validUrl(imageUrl)) {
    return { error: "Os links precisam começar com / ou https://" };
  }
  if (sendPush && !isPublished) {
    return { error: "Publique o aviso antes de enviá-lo por push." };
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      title,
      message,
      audience,
      category,
      action_url: actionUrl || null,
      image_url: imageUrl || null,
      is_published: isPublished,
      is_featured: isFeatured,
      published_at: new Date().toISOString(),
      push_requested: sendPush,
      created_by: userId,
    })
    .select(
      "id, title, message, audience, category, action_url, image_url, is_published, is_featured, published_at, push_requested, push_sent_at, push_success_count, push_failure_count, source_key, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    return { error: `Não foi possível criar a notificação: ${error?.message ?? "erro desconhecido"}` };
  }

  let pushMessage = "";
  if (sendPush) {
    try {
      const result = await sendPushNotification({
        id: data.id,
        title: data.title,
        message: data.message,
        audience: data.audience,
        category: data.category,
        actionUrl: data.action_url,
        imageUrl: data.image_url,
      });

      await supabase
        .from("notifications")
        .update({
          push_sent_at: result.configured ? new Date().toISOString() : null,
          push_success_count: result.successCount,
          push_failure_count: result.failureCount,
        })
        .eq("id", data.id);

      pushMessage = result.configured
        ? ` Push enviado para ${result.successCount} dispositivo(s); ${result.failureCount} falha(s).`
        : " Aviso salvo, mas as chaves VAPID ainda não estão configuradas.";
    } catch (pushError) {
      pushMessage = ` Aviso salvo, mas o push falhou: ${pushError instanceof Error ? pushError.message : "erro desconhecido"}`;
    }
  }

  revalidateNotifications();
  return {
    success: `${isPublished ? "Notificação publicada." : "Rascunho salvo."}${pushMessage}`,
  };
}

export async function resendNotificationPushAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const notificationId = readText(formData, "notificationId");
  if (!notificationId) throw new Error("Notificação inválida.");

  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, title, message, audience, category, action_url, image_url, is_published, is_featured, published_at, push_requested, push_sent_at, push_success_count, push_failure_count, source_key, created_at, updated_at",
    )
    .eq("id", notificationId)
    .maybeSingle();

  if (error || !data) throw new Error(error?.message || "Notificação não encontrada.");
  if (!data.is_published) throw new Error("Publique a notificação antes de enviar push.");

  const notification = data as NotificationRow;
  const result = await sendPushNotification({
    id: notification.id,
    title: notification.title,
    message: notification.message,
    audience: notification.audience,
    category: notification.category,
    actionUrl: notification.action_url,
    imageUrl: notification.image_url,
  });

  if (!result.configured) throw new Error("As chaves VAPID ainda não estão configuradas.");

  const { error: updateError } = await supabase
    .from("notifications")
    .update({
      push_requested: true,
      push_sent_at: new Date().toISOString(),
      push_success_count: result.successCount,
      push_failure_count: result.failureCount,
    })
    .eq("id", notificationId);

  if (updateError) throw new Error(updateError.message);
  revalidateNotifications();
}

export async function toggleNotificationAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const notificationId = readText(formData, "notificationId");
  const publish = readText(formData, "publish") === "true";
  if (!notificationId) throw new Error("Notificação inválida.");

  const payload = publish
    ? { is_published: true, published_at: new Date().toISOString() }
    : { is_published: false };
  const { error } = await supabase
    .from("notifications")
    .update(payload)
    .eq("id", notificationId);

  if (error) throw new Error(error.message);
  revalidateNotifications();
}

export async function deleteNotificationAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const notificationId = readText(formData, "notificationId");
  if (!notificationId) throw new Error("Notificação inválida.");

  const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
  if (error) throw new Error(error.message);
  revalidateNotifications();
}
