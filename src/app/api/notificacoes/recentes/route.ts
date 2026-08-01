import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { userId, supabase } = await getAuthContext();
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? 6);
  const limit = Math.min(20, Math.max(1, Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 6));

  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, message, category, action_url, published_at")
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(limit + 30);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const rows = data ?? [];
  if (!userId || !rows.length) {
    return NextResponse.json(
      { ok: true, authenticated: Boolean(userId), items: rows.slice(0, limit) },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const ids = rows.map((item) => item.id as string);
  const { data: states, error: statesError } = await supabase
    .from("notification_reads")
    .select("notification_id, read_at, dismissed_at")
    .eq("user_id", userId)
    .in("notification_id", ids);

  if (statesError) {
    return NextResponse.json({ ok: false, error: statesError.message }, { status: 400 });
  }

  const hiddenIds = new Set(
    (states ?? [])
      .filter((item) => Boolean(item.read_at) || Boolean(item.dismissed_at))
      .map((item) => item.notification_id as string),
  );

  return NextResponse.json(
    {
      ok: true,
      authenticated: true,
      items: rows.filter((item) => !hiddenIds.has(item.id as string)).slice(0, limit),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
