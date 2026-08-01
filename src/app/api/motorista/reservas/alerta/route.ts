import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId, supabase, profile } = await getAuthContext();
  if (!userId || !profile?.is_professional_driver || profile.is_blocked) {
    return NextResponse.json({ ok: true, authenticated: Boolean(userId), reservation: null }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data, error } = await supabase
    .from("driver_reservations")
    .select("id, passenger_name, origin, destination, created_at")
    .eq("driver_user_id", userId)
    .eq("status", "new")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, authenticated: true, reservation: data ?? null }, { headers: { "Cache-Control": "no-store" } });
}
