import "server-only";

import * as webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationAudience, NotificationCategory } from "@/types/notification";

type PushNotificationInput = {
  id: string;
  title: string;
  message: string;
  audience: NotificationAudience;
  category: NotificationCategory;
  actionUrl?: string | null;
  imageUrl?: string | null;
  targetUserId?: string | null;
};

type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  user_id: string | null;
  categories: Record<string, boolean> | null;
  is_active: boolean;
  profiles:
    | {
        role: "member" | "vip" | "admin";
        is_blocked: boolean;
      }
    | Array<{
        role: "member" | "vip" | "admin";
        is_blocked: boolean;
      }>
    | null;
};

export type PushSendResult = {
  configured: boolean;
  successCount: number;
  failureCount: number;
  disabledCount: number;
};

function pushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

function profileOf(subscription: StoredSubscription) {
  return Array.isArray(subscription.profiles)
    ? subscription.profiles[0] ?? null
    : subscription.profiles;
}

function matchesAudience(subscription: StoredSubscription, audience: NotificationAudience, targetUserId?: string | null) {
  const profile = profileOf(subscription);
  if (targetUserId) return subscription.user_id === targetUserId && Boolean(profile && !profile.is_blocked);
  if (audience === "all") return true;

  if (!subscription.user_id || !profile || profile.is_blocked) return false;
  if (audience === "member") return true;
  if (audience === "vip") return profile.role === "vip" || profile.role === "admin";
  return profile.role === "admin";
}

function categoryEnabled(subscription: StoredSubscription, category: NotificationCategory) {
  return subscription.categories?.[category] !== false;
}

function statusCodeOf(error: unknown) {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) return 0;
  const statusCode = Number((error as { statusCode?: number }).statusCode);
  return Number.isFinite(statusCode) ? statusCode : 0;
}

export async function sendPushNotification(
  notification: PushNotificationInput,
): Promise<PushSendResult> {
  const config = pushConfig();
  if (!config) {
    return { configured: false, successCount: 0, failureCount: 0, disabledCount: 0 };
  }

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select(
      "id, endpoint, p256dh, auth_key, user_id, categories, is_active, profiles!push_subscriptions_user_id_fkey(role, is_blocked)",
    )
    .eq("is_active", true);

  if (error) throw new Error(`Não foi possível listar assinaturas push: ${error.message}`);

  const subscriptions = ((data ?? []) as StoredSubscription[]).filter(
    (item) => matchesAudience(item, notification.audience, notification.targetUserId) && categoryEnabled(item, notification.category),
  );

  const payload = JSON.stringify({
    notificationId: notification.id,
    title: notification.title,
    body: notification.message,
    category: notification.category,
    url: notification.actionUrl || "/notificacoes",
    image: notification.imageUrl || undefined,
    icon: "/icons/app-icon-192.png",
    badge: "/icons/favicon-32x32.png",
  });

  let successCount = 0;
  let failureCount = 0;
  const disabledIds: string[] = [];

  for (let index = 0; index < subscriptions.length; index += 20) {
    const batch = subscriptions.slice(index, index + 20);
    const results = await Promise.allSettled(
      batch.map((item) =>
        webpush.sendNotification(
          {
            endpoint: item.endpoint,
            keys: {
              p256dh: item.p256dh,
              auth: item.auth_key,
            },
          },
          payload,
          { TTL: 60 * 60 * 24 },
        ),
      ),
    );

    results.forEach((result, resultIndex) => {
      if (result.status === "fulfilled") {
        successCount += 1;
        return;
      }

      failureCount += 1;
      const statusCode = statusCodeOf(result.reason);
      if (statusCode === 404 || statusCode === 410) {
        disabledIds.push(batch[resultIndex].id);
      }
    });
  }

  if (disabledIds.length) {
    await supabase
      .from("push_subscriptions")
      .update({ is_active: false, user_id: null })
      .in("id", disabledIds);
  }

  return {
    configured: true,
    successCount,
    failureCount,
    disabledCount: disabledIds.length,
  };
}

export function isPushConfigured() {
  return Boolean(pushConfig());
}
