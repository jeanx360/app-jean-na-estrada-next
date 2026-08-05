"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { publishAppRelease } from "@/lib/release-center";
import type { NotificationAudience } from "@/types/notification";
import type { ReleaseActionState } from "@/types/release-center";

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

function parseHighlights(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 20);
}

function parseScheduledAt(value: string) {
  if (!value) return null;
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  const parsed = new Date(`${withSeconds}-03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function revalidateReleaseCenter(releaseId?: string) {
  revalidatePath("/");
  revalidatePath("/notificacoes");
  revalidatePath("/comunidade");
  revalidatePath("/admin");
  revalidatePath("/admin/notificacoes");
  revalidatePath("/admin/comunidade");
  revalidatePath("/admin/atualizacoes");
  revalidatePath("/admin/automacoes");
  if (releaseId) revalidatePath(`/admin/atualizacoes/${releaseId}/editar`);
}

export async function saveReleaseAction(
  _previousState: ReleaseActionState,
  formData: FormData,
): Promise<ReleaseActionState> {
  const { supabase, userId } = await requireAdmin();
  const releaseId = readText(formData, "releaseId");
  const intent = readText(formData, "intent") || "draft";
  const version = readText(formData, "version");
  const title = readText(formData, "title");
  const notificationTitle = readText(formData, "notificationTitle");
  const notificationMessage = readText(formData, "notificationMessage");
  const communityTitle = readText(formData, "communityTitle");
  const communityBody = readText(formData, "communityBody");
  const highlights = parseHighlights(readText(formData, "highlights"));
  const audience = readText(formData, "audience") as NotificationAudience;
  const actionUrl = readText(formData, "actionUrl");
  const imageUrl = readText(formData, "imageUrl");
  const publishNotification = readBoolean(formData, "publishNotification");
  const featureNotification = readBoolean(formData, "featureNotification");
  const sendPush = readBoolean(formData, "sendPush");
  const publishCommunity = readBoolean(formData, "publishCommunity");
  const pinCommunity = readBoolean(formData, "pinCommunity");
  const pinDays = Number(readText(formData, "pinDays") || "0");
  const scheduledAtText = readText(formData, "scheduledAt");
  const scheduledAt = parseScheduledAt(scheduledAtText);

  if (!/^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$/.test(version)) {
    return { error: "Informe uma versão válida, como 2.2.2." };
  }
  if (title.length < 3 || title.length > 120) {
    return { error: "O título interno precisa ter entre 3 e 120 caracteres." };
  }
  if (notificationTitle.length < 3 || notificationTitle.length > 100) {
    return { error: "O título da notificação precisa ter entre 3 e 100 caracteres." };
  }
  if (notificationMessage.length < 3 || notificationMessage.length > 600) {
    return { error: "A mensagem da notificação precisa ter entre 3 e 600 caracteres." };
  }
  if (communityTitle.length < 3 || communityTitle.length > 120) {
    return { error: "O título da Comunidade VIP precisa ter entre 3 e 120 caracteres." };
  }
  if (communityBody.length < 3 || communityBody.length > 4000) {
    return { error: "O texto da Comunidade VIP precisa ter entre 3 e 4.000 caracteres." };
  }
  if (!publishNotification && !publishCommunity) {
    return { error: "Selecione ao menos um canal de publicação." };
  }
  if (sendPush && !publishNotification) {
    return { error: "O Web Push depende da notificação interna." };
  }
  if (!["all", "member", "vip", "admin"].includes(audience)) {
    return { error: "Público inválido." };
  }
  if (!validUrl(actionUrl) || !validUrl(imageUrl)) {
    return { error: "Os links precisam começar com / ou https://" };
  }
  if (!Number.isInteger(pinDays) || pinDays < 0 || pinDays > 30) {
    return { error: "A fixação pode durar de 0 a 30 dias." };
  }
  if (intent === "schedule") {
    if (!scheduledAt) return { error: "Informe uma data e hora válidas para o agendamento." };
    if (scheduledAt.getTime() <= Date.now() + 120_000) {
      return { error: "O agendamento precisa estar pelo menos dois minutos no futuro." };
    }
  }

  const payload = {
    version,
    title,
    notification_title: notificationTitle,
    notification_message: notificationMessage,
    community_title: communityTitle,
    community_body: communityBody,
    highlights,
    audience,
    action_url: actionUrl || null,
    image_url: imageUrl || null,
    publish_notification: publishNotification,
    feature_notification: featureNotification,
    send_push: sendPush,
    publish_community: publishCommunity,
    pin_community: publishCommunity && pinCommunity && pinDays > 0,
    pin_days: publishCommunity && pinCommunity ? pinDays : 0,
    status: intent === "schedule" ? "scheduled" : "draft",
    scheduled_at: intent === "schedule" ? scheduledAt?.toISOString() : null,
    updated_by: userId,
    error_message: null,
  };

  let savedId = releaseId;

  if (releaseId) {
    const { data: current, error: currentError } = await supabase
      .from("app_releases")
      .select("id, status")
      .eq("id", releaseId)
      .maybeSingle();

    if (currentError || !current) {
      return { error: currentError?.message || "Atualização não encontrada." };
    }
    if (current.status === "published" || current.status === "publishing") {
      return { error: "Uma atualização publicada não pode ser editada." };
    }

    const { error } = await supabase
      .from("app_releases")
      .update(payload)
      .eq("id", releaseId);

    if (error) {
      const duplicate = error.code === "23505" ? "Essa versão já está cadastrada." : error.message;
      return { error: `Não foi possível salvar: ${duplicate}` };
    }
  } else {
    const { data, error } = await supabase
      .from("app_releases")
      .insert({ ...payload, created_by: userId })
      .select("id")
      .single();

    if (error || !data) {
      const duplicate = error?.code === "23505" ? "Essa versão já está cadastrada." : error?.message;
      return { error: `Não foi possível salvar: ${duplicate || "erro desconhecido"}` };
    }
    savedId = data.id;
  }

  if (intent === "publish") {
    const result = await publishAppRelease(savedId);
    revalidateReleaseCenter(savedId);
    if (!result.ok) {
      return {
        error: `A atualização foi salva, mas a publicação ficou ${result.status === "partial" ? "parcial" : "com falha"}: ${result.message}`,
        releaseId: savedId,
      };
    }
    return {
      success: `JNE App ${version} publicada. Push: ${result.pushSuccessCount} entregue(s), ${result.pushFailureCount} falha(s).`,
      releaseId: savedId,
      published: true,
    };
  }

  revalidateReleaseCenter(savedId);
  return {
    success: intent === "schedule"
      ? `Atualização ${version} agendada. Ela será processada pela próxima rotina de automações.`
      : `Rascunho da versão ${version} salvo.`,
    releaseId: savedId,
  };
}

export async function publishReleaseAction(formData: FormData) {
  await requireAdmin();
  const releaseId = readText(formData, "releaseId");
  if (!releaseId) throw new Error("Atualização inválida.");

  const result = await publishAppRelease(releaseId);
  revalidateReleaseCenter(releaseId);
  if (!result.ok) throw new Error(result.message);
}

export async function cancelReleaseScheduleAction(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const releaseId = readText(formData, "releaseId");
  if (!releaseId) throw new Error("Atualização inválida.");

  const { error } = await supabase
    .from("app_releases")
    .update({ status: "draft", scheduled_at: null, updated_by: userId })
    .eq("id", releaseId)
    .eq("status", "scheduled");

  if (error) throw new Error(error.message);
  revalidateReleaseCenter(releaseId);
}

export async function deleteReleaseAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const releaseId = readText(formData, "releaseId");
  if (!releaseId) throw new Error("Atualização inválida.");

  const { data: release, error: loadError } = await supabase
    .from("app_releases")
    .select("status, notification_id, community_post_id")
    .eq("id", releaseId)
    .maybeSingle();

  if (loadError || !release) throw new Error(loadError?.message || "Atualização não encontrada.");
  if (release.notification_id || release.community_post_id || !["draft", "scheduled", "failed"].includes(release.status)) {
    throw new Error("Somente rascunhos sem canais publicados podem ser excluídos.");
  }

  const { error } = await supabase.from("app_releases").delete().eq("id", releaseId);
  if (error) throw new Error(error.message);
  revalidateReleaseCenter();
}
