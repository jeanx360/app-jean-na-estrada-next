import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import {
  isNotificationVisibleToUser,
  notificationVisibilityFilter,
} from "@/lib/notification-visibility";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && UUID_PATTERN.test(item)))).slice(0, 250);
}

async function accessibleNotificationIds(
  supabase: SupabaseClient,
  userId: string,
  ids: string[],
) {
  if (!ids.length) return { ids: [] as string[], error: null as string | null };

  const { data, error } = await supabase
    .from("notifications")
    .select("id, target_user_id")
    .in("id", ids)
    .eq("is_published", true)
    .or(notificationVisibilityFilter(userId));

  if (error) return { ids: [] as string[], error: error.message };

  return {
    ids: (data ?? [])
      .filter((item) => isNotificationVisibleToUser(item, userId))
      .map((item) => item.id as string),
    error: null as string | null,
  };
}

export async function POST(request: Request) {
  const { userId, supabase } = await getAuthContext();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Faça login para sincronizar a leitura." }, { status: 401 });
  }

  let body: {
    notificationId?: string;
    notificationIds?: string[];
    all?: boolean;
    dismissRead?: boolean;
    dismissNotificationId?: string;
    dismissNotificationIds?: string[];
    restoreNotificationId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Dados inválidos." }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (body.restoreNotificationId && UUID_PATTERN.test(body.restoreNotificationId)) {
    const accessible = await accessibleNotificationIds(supabase, userId, [body.restoreNotificationId]);
    if (accessible.error) return NextResponse.json({ ok: false, error: accessible.error }, { status: 400 });
    if (!accessible.ids.length) return NextResponse.json({ ok: false, error: "Notificação não disponível para esta conta." }, { status: 403 });

    const { error } = await supabase
      .from("notification_reads")
      .update({ dismissed_at: null })
      .eq("user_id", userId)
      .eq("notification_id", accessible.ids[0]);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }

  const individualDismiss = body.dismissNotificationId && UUID_PATTERN.test(body.dismissNotificationId)
    ? [body.dismissNotificationId]
    : [];
  const requestedDismissIds = Array.from(new Set([...individualDismiss, ...validIds(body.dismissNotificationIds)]));

  if (requestedDismissIds.length) {
    const accessible = await accessibleNotificationIds(supabase, userId, requestedDismissIds);
    if (accessible.error) return NextResponse.json({ ok: false, error: accessible.error }, { status: 400 });
    if (!accessible.ids.length) return NextResponse.json({ ok: false, error: "Nenhuma notificação disponível para esta conta." }, { status: 403 });

    const rows = accessible.ids.map((notificationId) => ({
      notification_id: notificationId,
      user_id: userId,
      read_at: now,
      dismissed_at: now,
    }));
    const { error } = await supabase
      .from("notification_reads")
      .upsert(rows, { onConflict: "notification_id,user_id" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }

  if (body.dismissRead) {
    const { data: existingReads, error: existingError } = await supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", userId)
      .is("dismissed_at", null);

    if (existingError) return NextResponse.json({ ok: false, error: existingError.message }, { status: 400 });
    const requestedIds = (existingReads ?? []).map((item) => item.notification_id as string);
    const accessible = await accessibleNotificationIds(supabase, userId, requestedIds);
    if (accessible.error) return NextResponse.json({ ok: false, error: accessible.error }, { status: 400 });

    if (accessible.ids.length) {
      const { error: dismissError } = await supabase
        .from("notification_reads")
        .update({ dismissed_at: now })
        .eq("user_id", userId)
        .in("notification_id", accessible.ids);
      if (dismissError) return NextResponse.json({ ok: false, error: dismissError.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }

  let requestedIds = validIds(body.notificationIds);

  if (body.all) {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, target_user_id")
      .eq("is_published", true)
      .lte("published_at", now)
      .or(notificationVisibilityFilter(userId))
      .limit(250);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    requestedIds = (data ?? [])
      .filter((item) => isNotificationVisibleToUser(item, userId))
      .map((item) => item.id as string);
  } else if (body.notificationId && UUID_PATTERN.test(body.notificationId)) {
    requestedIds = Array.from(new Set([...requestedIds, body.notificationId]));
  }

  const accessible = await accessibleNotificationIds(supabase, userId, requestedIds);
  if (accessible.error) return NextResponse.json({ ok: false, error: accessible.error }, { status: 400 });
  if (!accessible.ids.length) return NextResponse.json({ ok: true });

  const rows = accessible.ids.map((notificationId) => ({
    notification_id: notificationId,
    user_id: userId,
    read_at: now,
  }));

  const { error } = await supabase
    .from("notification_reads")
    .upsert(rows, { onConflict: "notification_id,user_id" });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
