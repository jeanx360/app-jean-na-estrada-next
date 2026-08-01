export type NotificationAudience = "all" | "member" | "vip" | "admin";
export type NotificationCategory = "general" | "videos" | "tutorials" | "apps" | "benefits" | "reservations";

export type NotificationRow = {
  id: string;
  title: string;
  message: string;
  audience: NotificationAudience;
  category: NotificationCategory;
  action_url: string | null;
  image_url: string | null;
  is_published: boolean;
  is_featured: boolean;
  published_at: string;
  push_requested: boolean;
  push_sent_at: string | null;
  push_success_count: number;
  push_failure_count: number;
  source_key: string | null;
  target_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationPreferences = {
  pushEnabled: boolean;
  general: boolean;
  videos: boolean;
  tutorials: boolean;
  apps: boolean;
  benefits: boolean;
  reservations: boolean;
};

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type NotificationActionState = {
  error?: string;
  success?: string;
};
