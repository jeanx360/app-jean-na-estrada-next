import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { userId, supabase } = await getAuthContext();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Faça login para sincronizar a leitura." }, { status: 401 });
  }

  const body = (await request.json()) as { notificationId?: string; all?: boolean; dismissRead?: boolean };
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
        .update({ dismissed_at: new Date().toISOString() })
        .eq("user_id", userId)
        .in("notification_id", readIds);
      if (dismissError) return NextResponse.json({ ok: false, error: dismissError.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  let ids: string[] = [];

  if (body.all) {
    const { data, error } = await supabase
      .from("notifications")
      .select("id")
      .eq("is_published", true)
      .lte("published_at", new Date().toISOString());

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    ids = (data ?? []).map((item) => item.id as string);
  } else if (body.notificationId) {
    ids = [body.notificationId];
  }

  if (!ids.length) return NextResponse.json({ ok: true });

  const rows = ids.map((notificationId) => ({
    notification_id: notificationId,
    user_id: userId,
    read_at: new Date().toISOString(),
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
