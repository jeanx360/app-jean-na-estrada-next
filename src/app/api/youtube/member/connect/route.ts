import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildGoogleAuthorizationUrl,
  createOAuthState,
  getAppUrl,
} from "@/lib/google-oauth";
import { getAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { userId, profile } = await getAuthContext();
  if (!userId) return NextResponse.redirect(new URL("/entrar?next=/membros/youtube", getAppUrl()));
  if (profile?.is_blocked) {
    const url = new URL("/membros/youtube", getAppUrl());
    url.searchParams.set("error", "Esta conta está bloqueada.");
    return NextResponse.redirect(url);
  }

  const state = createOAuthState();
  const cookieStore = await cookies();
  cookieStore.set("jne_youtube_member_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/youtube/member",
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(buildGoogleAuthorizationUrl({ mode: "member", state }));
}
