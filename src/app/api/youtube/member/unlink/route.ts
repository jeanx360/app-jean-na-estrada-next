import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { getAppUrl } from "@/lib/google-oauth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const { userId } = await getAuthContext();
  if (!userId) return NextResponse.redirect(new URL("/entrar?next=/membros/youtube", getAppUrl()), 303);

  const supabase = createAdminClient();
  const { data: link, error: readError } = await supabase
    .from("youtube_member_links")
    .select("member_channel_id")
    .eq("user_id", userId)
    .maybeSingle();

  const url = new URL("/membros/youtube", getAppUrl());
  if (readError) {
    url.searchParams.set("error", readError.message);
    return NextResponse.redirect(url, 303);
  }

  if (link) {
    const { error: entitlementError } = await supabase
      .from("vip_entitlements")
      .update({ is_active: false, metadata: { reason: "member_unlinked", updated_at: new Date().toISOString() } })
      .eq("user_id", userId)
      .eq("source", "youtube")
      .eq("source_key", link.member_channel_id);
    if (entitlementError) {
      url.searchParams.set("error", entitlementError.message);
      return NextResponse.redirect(url, 303);
    }

    const { error: deleteError } = await supabase.from("youtube_member_links").delete().eq("user_id", userId);
    if (deleteError) {
      url.searchParams.set("error", deleteError.message);
      return NextResponse.redirect(url, 303);
    }

    await supabase.rpc("refresh_member_vip_role", { target_user_id: userId });
  }

  url.searchParams.set("success", "Conta do YouTube desvinculada.");
  return NextResponse.redirect(url, 303);
}
