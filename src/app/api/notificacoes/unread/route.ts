import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import {
  isNotificationVisibleToUser,
  notificationVisibilityFilter,
} from "@/lib/notification-visibility";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId, supabase } = await getAuthContext();
  const now = new Date();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, target_user_id, expires_at")
    .eq("is_published", true)
    .lte("published_at", now.toISOString())
    .or(notificationVisibilityFilter(userId))
    .order("published_at", { ascending: false })
    .limit(250);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Defesa adicional para contas administrativas, que possuem uma policy
  // separada para o painel e não devem receber alertas de outros usuários no sino.
  const ids = (data ?? [])
    .filter((item) => isNotificationVisibleToUser(item, userId))
    .filter((item) => {
      if (!item.expires_at) return true;
      const expiresAt = Date.parse(item.expires_at as string);
      return !Number.isFinite(expiresAt) || expiresAt > now.getTime();
    })
    .map((item) => item.id as string);

  if (!userId || !ids.length) {
    return NextResponse.json(
      { authenticated: Boolean(userId), count: userId ? 0 : undefined, ids },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }

  const { data: reads, error: readsError } = await supabase
    .from("notification_reads")
    .select("notification_id")
    .eq("user_id", userId)
    .in("notification_id", ids);

  if (readsError) {
    return NextResponse.json({ error: readsError.message }, { status: 400 });
  }

  const readIds = new Set((reads ?? []).map((item) => item.notification_id as string));
  return NextResponse.json(
    { authenticated: true, count: ids.filter((id) => !readIds.has(id)).length, ids },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
