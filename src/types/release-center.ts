import type { NotificationAudience } from "@/types/notification";

export type AppReleaseStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "partial"
  | "failed";

export type AppReleaseRow = {
  id: string;
  version: string;
  title: string;
  notification_title: string;
  notification_message: string;
  community_title: string;
  community_body: string;
  highlights: string[];
  audience: NotificationAudience;
  action_url: string | null;
  image_url: string | null;
  publish_notification: boolean;
  feature_notification: boolean;
  send_push: boolean;
  publish_community: boolean;
  pin_community: boolean;
  pin_days: number;
  status: AppReleaseStatus;
  scheduled_at: string | null;
  published_at: string | null;
  last_attempt_at: string | null;
  community_pin_until: string | null;
  community_unpinned_at: string | null;
  notification_id: string | null;
  community_post_id: string | null;
  push_success_count: number;
  push_failure_count: number;
  error_message: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ReleaseActionState = {
  error?: string;
  success?: string;
  releaseId?: string;
  published?: boolean;
};

export type ReleasePublishResult = {
  ok: boolean;
  status: AppReleaseStatus;
  releaseId: string;
  notificationId: string | null;
  communityPostId: string | null;
  pushSuccessCount: number;
  pushFailureCount: number;
  message: string;
};

export type ReleaseAutomationResult = {
  ok: boolean;
  scheduledCount: number;
  publishedCount: number;
  failedCount: number;
  unpinnedCount: number;
  errors: string[];
};
