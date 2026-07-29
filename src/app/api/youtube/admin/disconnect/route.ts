import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getAppUrl } from "@/lib/google-oauth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("youtube_creator_connections")
    .delete()
    .eq("connection_key", "primary");

  const url = new URL("/admin/youtube", getAppUrl());
  url.searchParams.set(
    error ? "error" : "success",
    error ? error.message : "Canal desconectado. Os acessos já verificados foram preservados até nova decisão administrativa.",
  );
  return NextResponse.redirect(url, 303);
}
