import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { decryptRefreshToken, refreshGoogleAccessToken } from "@/lib/google-oauth";
import type { YouTubeSyncResult } from "@/types/youtube-membership";

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";

type ApiError = { error?: { message?: string; errors?: Array<{ reason?: string }> } };

type MembershipLevelResponse = ApiError & {
  items?: Array<{
    id?: string;
    snippet?: { creatorChannelId?: string; levelDetails?: { displayName?: string } };
  }>;
};

type MemberResponse = ApiError & {
  nextPageToken?: string;
  items?: Array<{
    snippet?: {
      creatorChannelId?: string;
      memberDetails?: {
        channelId?: string;
        channelUrl?: string;
        displayName?: string;
        profileImageUrl?: string;
      };
      membershipsDetails?: {
        highestAccessibleLevel?: string;
        highestAccessibleLevelDisplayName?: string;
        accessibleLevels?: string[];
        membershipsDuration?: {
          memberSince?: string;
          memberTotalDurationMonths?: number;
        };
      };
    };
  }>;
};

async function youtubeRequest<T extends ApiError>(path: string, accessToken: string, params: Record<string, string>) {
  const url = new URL(`${YOUTUBE_API_URL}/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const payload = (await response.json()) as T;

  if (!response.ok) {
    const reason = payload.error?.errors?.[0]?.reason;
    const suffix = reason ? ` (${reason})` : "";
    throw new Error(`${payload.error?.message || `YouTube respondeu HTTP ${response.status}`}${suffix}`);
  }

  return payload;
}

async function fetchLevels(accessToken: string) {
  const payload = await youtubeRequest<MembershipLevelResponse>("membershipsLevels", accessToken, {
    part: "id,snippet",
  });

  return (payload.items ?? [])
    .filter((item): item is typeof item & { id: string } => Boolean(item.id))
    .map((item) => ({
      id: item.id,
      creator_channel_id: item.snippet?.creatorChannelId || "",
      display_name: item.snippet?.levelDetails?.displayName || "Nível do canal",
      synced_at: new Date().toISOString(),
    }));
}

async function fetchAllMembers(accessToken: string) {
  const items: NonNullable<MemberResponse["items"]> = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = {
      part: "snippet",
      mode: "all_current",
      maxResults: "1000",
    };
    if (pageToken) params.pageToken = pageToken;

    const payload = await youtubeRequest<MemberResponse>("members", accessToken, params);
    items.push(...(payload.items ?? []));
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return items;
}

export async function syncYouTubeMemberships(): Promise<YouTubeSyncResult> {
  const supabase = createAdminClient();
  const syncStarted = new Date().toISOString();
  const { data: connection, error: connectionError } = await supabase
    .from("youtube_creator_connections")
    .select("creator_channel_id, encrypted_refresh_token, status")
    .eq("connection_key", "primary")
    .maybeSingle();

  if (connectionError) throw new Error(connectionError.message);
  if (!connection || connection.status === "disconnected") {
    throw new Error("Conecte o canal do YouTube antes de sincronizar os membros.");
  }

  try {
    const refreshToken = decryptRefreshToken(connection.encrypted_refresh_token);
    const accessToken = await refreshGoogleAccessToken(refreshToken);
    const [levels, rawMembers] = await Promise.all([
      fetchLevels(accessToken),
      fetchAllMembers(accessToken),
    ]);

    if (levels.length) {
      const { error } = await supabase.from("youtube_membership_levels").upsert(levels, { onConflict: "id" });
      if (error) throw new Error(error.message);
    }

    const identifiableMembers = rawMembers
      .map((item) => item.snippet)
      .filter((snippet) => Boolean(snippet?.memberDetails?.channelId))
      .map((snippet) => ({
        member_channel_id: snippet!.memberDetails!.channelId!,
        creator_channel_id: snippet!.creatorChannelId || connection.creator_channel_id,
        display_name: snippet!.memberDetails?.displayName || null,
        profile_image_url: snippet!.memberDetails?.profileImageUrl || null,
        channel_url: snippet!.memberDetails?.channelUrl || null,
        highest_level_id: snippet!.membershipsDetails?.highestAccessibleLevel || null,
        highest_level_name: snippet!.membershipsDetails?.highestAccessibleLevelDisplayName || null,
        accessible_level_ids: snippet!.membershipsDetails?.accessibleLevels || [],
        member_since: snippet!.membershipsDetails?.membershipsDuration?.memberSince || null,
        total_duration_months:
          snippet!.membershipsDetails?.membershipsDuration?.memberTotalDurationMonths ?? null,
        is_active: true,
        last_seen_at: syncStarted,
      }));

    for (let index = 0; index < identifiableMembers.length; index += 500) {
      const chunk = identifiableMembers.slice(index, index + 500);
      const { error } = await supabase.from("youtube_members").upsert(chunk, {
        onConflict: "member_channel_id",
      });
      if (error) throw new Error(error.message);
    }

    const { data: deactivated, error: inactiveError } = await supabase
      .from("youtube_members")
      .update({ is_active: false })
      .eq("creator_channel_id", connection.creator_channel_id)
      .eq("is_active", true)
      .lt("last_seen_at", syncStarted)
      .select("member_channel_id");
    if (inactiveError) throw new Error(inactiveError.message);

    const { data: links, error: linksError } = await supabase
      .from("youtube_member_links")
      .select("user_id, member_channel_id");
    if (linksError) throw new Error(linksError.message);

    const activeByChannel = new Map(identifiableMembers.map((member) => [member.member_channel_id, member]));
    let linkedCount = 0;

    for (const link of links ?? []) {
      const activeMember = activeByChannel.get(link.member_channel_id);

      if (activeMember) {
        linkedCount += 1;
        const { error: linkError } = await supabase
          .from("youtube_member_links")
          .update({
            display_name: activeMember.display_name,
            profile_image_url: activeMember.profile_image_url,
            last_verified_at: syncStarted,
          })
          .eq("user_id", link.user_id);
        if (linkError) throw new Error(linkError.message);

        const { error: entitlementError } = await supabase.from("vip_entitlements").upsert(
          {
            user_id: link.user_id,
            source: "youtube",
            source_key: link.member_channel_id,
            label: activeMember.highest_level_name || "Membro do canal Jean na Estrada",
            starts_at: activeMember.member_since || syncStarted,
            expires_at: null,
            is_active: true,
            metadata: {
              level_id: activeMember.highest_level_id,
              level_name: activeMember.highest_level_name,
              verified_at: syncStarted,
            },
          },
          { onConflict: "user_id,source,source_key" },
        );
        if (entitlementError) throw new Error(entitlementError.message);
      } else {
        const { error: entitlementError } = await supabase
          .from("vip_entitlements")
          .update({ is_active: false, metadata: { verified_at: syncStarted, reason: "not_current_member" } })
          .eq("user_id", link.user_id)
          .eq("source", "youtube")
          .eq("source_key", link.member_channel_id);
        if (entitlementError) throw new Error(entitlementError.message);
      }
    }

    const unidentifiableCount = rawMembers.length - identifiableMembers.length;
    const result: YouTubeSyncResult = {
      memberCount: rawMembers.length,
      linkedCount,
      unidentifiableCount,
      inactiveCount: deactivated?.length ?? 0,
      levelCount: levels.length,
    };

    const { error: updateError } = await supabase
      .from("youtube_creator_connections")
      .update({
        status: "connected",
        last_synced_at: syncStarted,
        last_sync_status: "success",
        last_sync_error: null,
        last_member_count: result.memberCount,
        last_unidentifiable_count: result.unidentifiableCount,
      })
      .eq("connection_key", "primary");
    if (updateError) throw new Error(updateError.message);

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada na sincronização.";
    await supabase
      .from("youtube_creator_connections")
      .update({ status: "error", last_sync_status: "error", last_sync_error: message })
      .eq("connection_key", "primary");
    throw error;
  }
}
