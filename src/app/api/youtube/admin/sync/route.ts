import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getAppUrl } from "@/lib/google-oauth";
import { syncYouTubeMemberships } from "@/lib/youtube-memberships";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function redirectToAdmin(type: "success" | "error", message: string) {
  const url = new URL("/admin/youtube", getAppUrl());
  url.searchParams.set(type, message);
  return NextResponse.redirect(url, 303);
}

export async function POST() {
  await requireAdmin();

  try {
    const result = await syncYouTubeMemberships();
    return redirectToAdmin(
      "success",
      `Sincronização concluída: ${result.memberCount} membros, ${result.linkedCount} contas vinculadas e ${result.levelCount} níveis.`,
    );
  } catch (error) {
    return redirectToAdmin("error", error instanceof Error ? error.message : "Falha inesperada na sincronização.");
  }
}
