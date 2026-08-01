import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId, supabase } = await getAuthContext();
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const ids = (data ?? []).map((item) => item.id as string);
  if (!userId || !ids.length) {
    return NextResponse.json(
      { authenticated: Boolean(userId), count: userId ? 0 : undefined, ids },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
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
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
