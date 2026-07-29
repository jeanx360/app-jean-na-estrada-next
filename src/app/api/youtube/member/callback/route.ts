import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  exchangeGoogleAuthorizationCode,
  fetchGoogleYouTubeChannels,
  getAppUrl,
  safeStateEquals,
} from "@/lib/google-oauth";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function redirectToMember(type: "success" | "error", message: string) {
  const url = new URL("/membros/youtube", getAppUrl());
  url.searchParams.set(type, message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { userId, profile } = await getAuthContext();
  if (!userId) return NextResponse.redirect(new URL("/entrar?next=/membros/youtube", getAppUrl()));
  if (profile?.is_blocked) return redirectToMember("error", "Esta conta está bloqueada.");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("jne_youtube_member_oauth_state")?.value;
  const receivedState = request.nextUrl.searchParams.get("state");
  cookieStore.delete("jne_youtube_member_oauth_state");

  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) return redirectToMember("error", `Autorização cancelada: ${oauthError}.`);
  if (!safeStateEquals(receivedState, expectedState)) {
    return redirectToMember("error", "A autorização expirou ou não pôde ser validada. Tente novamente.");
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return redirectToMember("error", "O Google não retornou o código de autorização.");

  try {
    const token = await exchangeGoogleAuthorizationCode({ code, mode: "member" });
    const channels = await fetchGoogleYouTubeChannels(token.access_token!);
    if (!channels.length) throw new Error("Nenhum canal do YouTube foi encontrado nesta conta Google.");

    const supabase = createAdminClient();
    const channelIds = channels.map((channel) => channel.id);
    const { data: members, error: memberError } = await supabase
      .from("youtube_members")
      .select("member_channel_id, display_name, profile_image_url, highest_level_name, member_since")
      .in("member_channel_id", channelIds)
      .eq("is_active", true);
    if (memberError) throw new Error(memberError.message);
    if (!members?.length) {
      throw new Error("Não encontramos uma assinatura ativa do canal Jean na Estrada nesta conta do YouTube. Sincronize o canal e tente novamente.");
    }

    const member = members[0];
    const [{ data: existingLink, error: existingError }, { data: currentUserLink, error: currentUserError }] = await Promise.all([
      supabase
        .from("youtube_member_links")
        .select("user_id")
        .eq("member_channel_id", member.member_channel_id)
        .maybeSingle(),
      supabase
        .from("youtube_member_links")
        .select("member_channel_id")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (existingError) throw new Error(existingError.message);
    if (currentUserError) throw new Error(currentUserError.message);
    if (existingLink && existingLink.user_id !== userId) {
      throw new Error("Este canal do YouTube já está vinculado a outra conta do JNE App.");
    }

    if (currentUserLink && currentUserLink.member_channel_id !== member.member_channel_id) {
      const { error: oldEntitlementError } = await supabase
        .from("vip_entitlements")
        .update({ is_active: false, metadata: { reason: "youtube_channel_replaced" } })
        .eq("user_id", userId)
        .eq("source", "youtube")
        .eq("source_key", currentUserLink.member_channel_id);
      if (oldEntitlementError) throw new Error(oldEntitlementError.message);
    }

    const channel = channels.find((item) => item.id === member.member_channel_id);
    const now = new Date().toISOString();
    const { error: linkError } = await supabase.from("youtube_member_links").upsert(
      {
        user_id: userId,
        member_channel_id: member.member_channel_id,
        display_name: member.display_name || channel?.title || null,
        profile_image_url: member.profile_image_url || channel?.thumbnailUrl || null,
        linked_at: now,
        last_verified_at: now,
      },
      { onConflict: "user_id" },
    );
    if (linkError) throw new Error(linkError.message);

    const { error: entitlementError } = await supabase.from("vip_entitlements").upsert(
      {
        user_id: userId,
        source: "youtube",
        source_key: member.member_channel_id,
        label: member.highest_level_name || "Membro do canal Jean na Estrada",
        starts_at: member.member_since || now,
        expires_at: null,
        is_active: true,
        metadata: { verified_at: now, level_name: member.highest_level_name },
      },
      { onConflict: "user_id,source,source_key" },
    );
    if (entitlementError) throw new Error(entitlementError.message);

    return redirectToMember("success", "Assinatura do YouTube confirmada. Seu acesso VIP está ativo.");
  } catch (error) {
    return redirectToMember("error", error instanceof Error ? error.message : "Falha inesperada na vinculação.");
  }
}
