import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  encryptRefreshToken,
  exchangeGoogleAuthorizationCode,
  fetchGoogleYouTubeChannels,
  getAppUrl,
  safeStateEquals,
} from "@/lib/google-oauth";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function redirectToAdmin(type: "success" | "error", message: string) {
  const url = new URL("/admin/youtube", getAppUrl());
  url.searchParams.set(type, message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { userId } = await requireAdmin();
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("jne_youtube_admin_oauth_state")?.value;
  const receivedState = request.nextUrl.searchParams.get("state");
  cookieStore.delete("jne_youtube_admin_oauth_state");

  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) return redirectToAdmin("error", `Autorização cancelada: ${oauthError}.`);
  if (!safeStateEquals(receivedState, expectedState)) {
    return redirectToAdmin("error", "A autorização expirou ou não pôde ser validada. Tente novamente.");
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return redirectToAdmin("error", "O Google não retornou o código de autorização.");

  try {
    const token = await exchangeGoogleAuthorizationCode({ code, mode: "admin" });
    if (!token.refresh_token) {
      throw new Error("O Google não retornou um token permanente. Remova o acesso do JNE App na Conta Google e conecte novamente.");
    }

    const channels = await fetchGoogleYouTubeChannels(token.access_token!);
    if (!channels.length) throw new Error("Nenhum canal do YouTube foi encontrado nesta conta Google.");

    const expectedChannelId = process.env.YOUTUBE_CHANNEL_ID?.trim();
    const channel = expectedChannelId
      ? channels.find((item) => item.id === expectedChannelId)
      : channels[0];
    if (!channel) {
      throw new Error("A conta autorizada não possui o canal configurado em YOUTUBE_CHANNEL_ID.");
    }
    const supabase = createAdminClient();
    const { error } = await supabase.from("youtube_creator_connections").upsert(
      {
        connection_key: "primary",
        creator_channel_id: channel.id,
        creator_channel_title: channel.title,
        encrypted_refresh_token: encryptRefreshToken(token.refresh_token),
        granted_scopes: token.scope?.split(" ").filter(Boolean) ?? [],
        status: "connected",
        connected_by: userId,
        connected_at: new Date().toISOString(),
        last_sync_status: null,
        last_sync_error: null,
      },
      { onConflict: "connection_key" },
    );
    if (error) throw new Error(error.message);

    return redirectToAdmin("success", `Canal ${channel.title} conectado. Faça a primeira sincronização.`);
  } catch (error) {
    return redirectToAdmin("error", error instanceof Error ? error.message : "Falha inesperada na conexão.");
  }
}
