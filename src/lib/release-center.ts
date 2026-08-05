import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/push";
import type { NotificationRow } from "@/types/notification";
import type {
  AppReleaseRow,
  ReleaseAutomationResult,
  ReleasePublishResult,
} from "@/types/release-center";

type CommunityPostIdentity = {
  id: string;
};

const RELEASE_SELECT = [
  "id",
  "version",
  "title",
  "notification_title",
  "notification_message",
  "community_title",
  "community_body",
  "highlights",
  "audience",
  "action_url",
  "image_url",
  "publish_notification",
  "feature_notification",
  "send_push",
  "publish_community",
  "pin_community",
  "pin_days",
  "status",
  "scheduled_at",
  "published_at",
  "last_attempt_at",
  "community_pin_until",
  "community_unpinned_at",
  "notification_id",
  "community_post_id",
  "push_success_count",
  "push_failure_count",
  "error_message",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
].join(", ");

const NOTIFICATION_SELECT = [
  "id",
  "title",
  "message",
  "audience",
  "category",
  "action_url",
  "image_url",
  "is_published",
  "is_featured",
  "published_at",
  "push_requested",
  "push_sent_at",
  "push_success_count",
  "push_failure_count",
  "source_key",
  "target_user_id",
  "priority",
  "automation_type",
  "source_entity_type",
  "source_entity_id",
  "expires_at",
  "created_at",
  "updated_at",
].join(", ");

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Falha inesperada.";
}

function releaseSourceKey(release: AppReleaseRow) {
  return `release:${release.version}:notification:${release.audience}`;
}

function pinUntil(release: AppReleaseRow, publishedAt: Date) {
  if (!release.pin_community || release.pin_days <= 0) return null;
  return new Date(publishedAt.getTime() + release.pin_days * 24 * 60 * 60 * 1000).toISOString();
}

function releaseCommunityBody(release: AppReleaseRow) {
  const body = release.community_body.trim();
  const highlights = Array.isArray(release.highlights)
    ? release.highlights.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (!highlights.length) return body;

  const list = highlights.map((item) => `• ${item}`).join("\n");
  return `${body}\n\nPrincipais novidades:\n${list}`.slice(0, 4000);
}

async function loadRelease(releaseId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("app_releases")
    .select(RELEASE_SELECT)
    .eq("id", releaseId)
    .maybeSingle();

  if (error) throw new Error(`Não foi possível carregar a atualização: ${error.message}`);
  if (!data) throw new Error("Atualização não encontrada.");
  return data as unknown as AppReleaseRow;
}

async function claimRelease(release: AppReleaseRow) {
  const supabase = createAdminClient();
  const now = new Date();

  if (release.status === "published") return release;
  if (release.status === "publishing") {
    const lastAttempt = release.last_attempt_at ? Date.parse(release.last_attempt_at) : 0;
    if (lastAttempt && now.getTime() - lastAttempt < 10 * 60 * 1000) {
      throw new Error("Esta atualização já está sendo publicada.");
    }
  }

  const { data, error } = await supabase
    .from("app_releases")
    .update({
      status: "publishing",
      last_attempt_at: now.toISOString(),
      error_message: null,
    })
    .eq("id", release.id)
    .eq("status", release.status)
    .select(RELEASE_SELECT)
    .maybeSingle();

  if (error) throw new Error(`Não foi possível iniciar a publicação: ${error.message}`);
  if (data) return data as unknown as AppReleaseRow;

  const current = await loadRelease(release.id);
  if (current.status === "published") return current;
  throw new Error("A atualização mudou enquanto era publicada. Recarregue a página e tente novamente.");
}

async function ensureCommunityPost(release: AppReleaseRow, publishedAt: Date) {
  if (!release.publish_community) return null;

  const supabase = createAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("community_posts")
    .select("id")
    .eq("release_id", release.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Não foi possível consultar a Comunidade VIP: ${existingError.message}`);
  }

  const pinned = release.pin_community && release.pin_days > 0;
  const body = releaseCommunityBody(release);

  if (existing) {
    const { error: updateError } = await supabase
      .from("community_posts")
      .update({
        title: release.community_title,
        body,
        is_pinned: pinned,
        is_hidden: false,
        hidden_reason: null,
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`Não foi possível atualizar a publicação VIP: ${updateError.message}`);
    }
    return existing as CommunityPostIdentity;
  }

  const { data: category, error: categoryError } = await supabase
    .from("community_categories")
    .select("id")
    .eq("slug", "atualizacoes-oficiais")
    .eq("is_active", true)
    .maybeSingle();

  if (categoryError) {
    throw new Error(`Não foi possível consultar a categoria oficial: ${categoryError.message}`);
  }
  if (!category) {
    throw new Error("A categoria Atualizações oficiais não foi encontrada. Verifique a migration 2.2.2.");
  }

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      author_id: release.created_by,
      category_id: category.id,
      title: release.community_title,
      body,
      image_path: null,
      poll_question: null,
      is_pinned: pinned,
      is_locked: false,
      is_hidden: false,
      release_id: release.id,
      created_at: publishedAt.toISOString(),
    })
    .select("id")
    .single();

  if (!error && data) return data as CommunityPostIdentity;

  if (error?.code === "23505") {
    const { data: concurrent } = await supabase
      .from("community_posts")
      .select("id")
      .eq("release_id", release.id)
      .maybeSingle();
    if (concurrent) return concurrent as CommunityPostIdentity;
  }

  throw new Error(`Não foi possível publicar na Comunidade VIP: ${error?.message ?? "erro desconhecido"}`);
}

async function ensureNotification(
  release: AppReleaseRow,
  communityPostId: string | null,
  publishedAt: Date,
) {
  if (!release.publish_notification) return null;

  const supabase = createAdminClient();
  const sourceKey = releaseSourceKey(release);
  const actionUrl = release.action_url || (communityPostId ? `/comunidade/${communityPostId}` : "/notificacoes");

  const { data: existing, error: existingError } = await supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("source_key", sourceKey)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Não foi possível consultar a notificação: ${existingError.message}`);
  }

  const existingNotification = existing as unknown as NotificationRow | null;

  if (existingNotification) {
    const { data: updated, error: updateError } = await supabase
      .from("notifications")
      .update({
        title: release.notification_title,
        message: release.notification_message,
        audience: release.audience,
        category: "general",
        action_url: actionUrl,
        image_url: release.image_url || null,
        is_published: true,
        is_featured: release.feature_notification,
        push_requested: release.send_push,
        source_entity_type: "app_release",
        source_entity_id: release.id,
        automation_type: "release_center",
      })
      .eq("id", existingNotification.id)
      .select(NOTIFICATION_SELECT)
      .single();

    if (updateError || !updated) {
      throw new Error(`Não foi possível atualizar a notificação: ${updateError?.message ?? "erro desconhecido"}`);
    }
    return updated as unknown as NotificationRow;
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      title: release.notification_title,
      message: release.notification_message,
      audience: release.audience,
      category: "general",
      priority: "normal",
      action_url: actionUrl,
      image_url: release.image_url || null,
      is_published: true,
      is_featured: release.feature_notification,
      published_at: publishedAt.toISOString(),
      push_requested: release.send_push,
      source_key: sourceKey,
      source_entity_type: "app_release",
      source_entity_id: release.id,
      automation_type: "release_center",
      created_by: release.created_by,
    })
    .select(NOTIFICATION_SELECT)
    .single();

  if (!error && data) return data as unknown as NotificationRow;

  if (error?.code === "23505") {
    const { data: concurrent } = await supabase
      .from("notifications")
      .select(NOTIFICATION_SELECT)
      .eq("source_key", sourceKey)
      .maybeSingle();
    if (concurrent) return concurrent as unknown as NotificationRow;
  }

  throw new Error(`Não foi possível criar a notificação: ${error?.message ?? "erro desconhecido"}`);
}

export async function publishAppRelease(releaseId: string): Promise<ReleasePublishResult> {
  const supabase = createAdminClient();
  const original = await loadRelease(releaseId);

  if (original.status === "published") {
    return {
      ok: true,
      status: "published",
      releaseId: original.id,
      notificationId: original.notification_id,
      communityPostId: original.community_post_id,
      pushSuccessCount: original.push_success_count,
      pushFailureCount: original.push_failure_count,
      message: "Esta atualização já foi publicada.",
    };
  }

  const release = await claimRelease(original);
  const publishedAt = new Date();
  let communityPostId = release.community_post_id;
  let notificationId = release.notification_id;
  let pushSuccessCount = release.push_success_count;
  let pushFailureCount = release.push_failure_count;
  let stage = "preparação";

  try {
    stage = "Comunidade VIP";
    const communityPost = await ensureCommunityPost(release, publishedAt);
    communityPostId = communityPost?.id ?? null;

    stage = "notificação interna";
    const notification = await ensureNotification(release, communityPostId, publishedAt);
    notificationId = notification?.id ?? null;

    if (release.send_push && notification) {
      stage = "Web Push";
      if (!notification.push_sent_at) {
        const pushResult = await sendPushNotification({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          audience: notification.audience,
          category: notification.category,
          actionUrl: notification.action_url,
          imageUrl: notification.image_url,
        });

        if (!pushResult.configured) {
          throw new Error("As chaves VAPID não estão configuradas para o Web Push.");
        }

        pushSuccessCount = pushResult.successCount;
        pushFailureCount = pushResult.failureCount;

        const { error: pushUpdateError } = await supabase
          .from("notifications")
          .update({
            push_sent_at: new Date().toISOString(),
            push_success_count: pushSuccessCount,
            push_failure_count: pushFailureCount,
          })
          .eq("id", notification.id);

        if (pushUpdateError) {
          throw new Error(`O push foi enviado, mas as métricas não foram salvas: ${pushUpdateError.message}`);
        }
      } else {
        pushSuccessCount = notification.push_success_count;
        pushFailureCount = notification.push_failure_count;
      }
    }

    const { error: finalError } = await supabase
      .from("app_releases")
      .update({
        status: "published",
        published_at: release.published_at || publishedAt.toISOString(),
        notification_id: notificationId,
        community_post_id: communityPostId,
        community_pin_until: pinUntil(release, publishedAt),
        community_unpinned_at: null,
        push_success_count: pushSuccessCount,
        push_failure_count: pushFailureCount,
        error_message: null,
      })
      .eq("id", release.id);

    if (finalError) {
      throw new Error(`Os canais foram publicados, mas o histórico não foi finalizado: ${finalError.message}`);
    }

    return {
      ok: true,
      status: "published",
      releaseId: release.id,
      notificationId,
      communityPostId,
      pushSuccessCount,
      pushFailureCount,
      message: "Atualização publicada nos canais selecionados.",
    };
  } catch (error) {
    const message = `${stage}: ${messageOf(error)}`;
    const partial = Boolean(notificationId || communityPostId);

    await supabase
      .from("app_releases")
      .update({
        status: partial ? "partial" : "failed",
        notification_id: notificationId,
        community_post_id: communityPostId,
        push_success_count: pushSuccessCount,
        push_failure_count: pushFailureCount,
        error_message: message.slice(0, 1500),
      })
      .eq("id", release.id);

    return {
      ok: false,
      status: partial ? "partial" : "failed",
      releaseId: release.id,
      notificationId,
      communityPostId,
      pushSuccessCount,
      pushFailureCount,
      message,
    };
  }
}

export async function processReleaseCenterAutomations(): Promise<ReleaseAutomationResult> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const errors: string[] = [];
  let publishedCount = 0;
  let failedCount = 0;
  let unpinnedCount = 0;

  const { data: scheduled, error: scheduledError } = await supabase
    .from("app_releases")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(20);

  if (scheduledError) {
    errors.push(`Agendamentos: ${scheduledError.message}`);
  } else {
    for (const item of scheduled ?? []) {
      const result = await publishAppRelease(item.id);
      if (result.ok) publishedCount += 1;
      else {
        failedCount += 1;
        errors.push(`Atualização ${item.id}: ${result.message}`);
      }
    }
  }

  const { data: expiredPins, error: pinsError } = await supabase
    .from("app_releases")
    .select("id, community_post_id")
    .eq("status", "published")
    .not("community_post_id", "is", null)
    .not("community_pin_until", "is", null)
    .is("community_unpinned_at", null)
    .lte("community_pin_until", now)
    .limit(50);

  if (pinsError) {
    errors.push(`Fixações: ${pinsError.message}`);
  } else {
    for (const item of expiredPins ?? []) {
      if (!item.community_post_id) continue;
      const { error: unpinError } = await supabase
        .from("community_posts")
        .update({ is_pinned: false })
        .eq("id", item.community_post_id);

      if (unpinError) {
        errors.push(`Desafixar ${item.id}: ${unpinError.message}`);
        continue;
      }

      await supabase
        .from("app_releases")
        .update({ community_unpinned_at: new Date().toISOString() })
        .eq("id", item.id);
      unpinnedCount += 1;
    }
  }

  return {
    ok: errors.length === 0,
    scheduledCount: scheduled?.length ?? 0,
    publishedCount,
    failedCount,
    unpinnedCount,
    errors,
  };
}
