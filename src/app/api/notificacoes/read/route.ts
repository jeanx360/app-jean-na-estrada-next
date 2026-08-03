import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && UUID_PATTERN.test(item)))).slice(0, 250);
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
    const { error } = await supabase
      .from("notification_reads")
      .update({ dismissed_at: null })
      .eq("user_id", userId)
      .eq("notification_id", body.restoreNotificationId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const individualDismiss = body.dismissNotificationId && UUID_PATTERN.test(body.dismissNotificationId)
    ? [body.dismissNotificationId]
    : [];
  const dismissIds = Array.from(new Set([...individualDismiss, ...validIds(body.dismissNotificationIds)]));

  if (dismissIds.length) {
    const rows = dismissIds.map((notificationId) => ({
      notification_id: notificationId,
      user_id: userId,
      read_at: now,
      dismissed_at: now,
    }));
    const { error } = await supabase
      .from("notification_reads")
      .upsert(rows, { onConflict: "notification_id,user_id" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  if (body.dismissRead) {
    const { data: existingReads, error: existingError } = await supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", userId)
      .is("dismissed_at", null);

    if (existingError) return NextResponse.json({ ok: false, error: existingError.message }, { status: 400 });
    const readIds = (existingReads ?? []).map((item) => item.notification_id as string);
    if (readIds.length) {
      const { error: dismissError } = await supabase
        .from("notification_reads")
        .update({ dismissed_at: now })
        .eq("user_id", userId)
        .in("notification_id", readIds);
      if (dismissError) return NextResponse.json({ ok: false, error: dismissError.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  let ids = validIds(body.notificationIds);

  if (body.all) {
    const { data, error } = await supabase
      .from("notifications")
      .select("id")
      .eq("is_published", true)
      .lte("published_at", now)
      .limit(250);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    ids = (data ?? []).map((item) => item.id as string);
  } else if (body.notificationId && UUID_PATTERN.test(body.notificationId)) {
    ids = Array.from(new Set([...ids, body.notificationId]));
  }

  if (!ids.length) return NextResponse.json({ ok: true });

  const rows = ids.map((notificationId) => ({
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
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
