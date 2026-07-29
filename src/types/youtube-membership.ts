export type YouTubeCreatorConnection = {
  connection_key: "primary";
  creator_channel_id: string;
  creator_channel_title: string | null;
  status: "connected" | "error" | "disconnected";
  connected_at: string;
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  last_member_count: number;
  last_unidentifiable_count: number;
  updated_at: string;
};

export type YouTubeMembershipLevel = {
  id: string;
  creator_channel_id: string;
  display_name: string;
  synced_at: string;
};

export type YouTubeMember = {
  member_channel_id: string;
  creator_channel_id: string;
  display_name: string | null;
  profile_image_url: string | null;
  channel_url: string | null;
  highest_level_id: string | null;
  highest_level_name: string | null;
  accessible_level_ids: string[];
  member_since: string | null;
  total_duration_months: number | null;
  is_active: boolean;
  last_seen_at: string;
};

export type YouTubeMemberLink = {
  user_id: string;
  member_channel_id: string;
  display_name: string | null;
  profile_image_url: string | null;
  linked_at: string;
  last_verified_at: string;
};

export type YouTubeSyncResult = {
  memberCount: number;
  linkedCount: number;
  unidentifiableCount: number;
  inactiveCount: number;
  levelCount: number;
};
