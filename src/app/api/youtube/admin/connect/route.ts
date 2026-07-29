import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildGoogleAuthorizationUrl, createOAuthState } from "@/lib/google-oauth";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  await requireAdmin();
  const state = createOAuthState();
  const cookieStore = await cookies();
  cookieStore.set("jne_youtube_admin_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/youtube/admin",
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(buildGoogleAuthorizationUrl({ mode: "admin", state }));
}
