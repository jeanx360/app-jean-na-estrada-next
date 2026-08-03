export type NotificationAudience = "all" | "member" | "vip" | "admin";

export type NotificationCategory =
  | "general"
  | "videos"
  | "tutorials"
  | "apps"
  | "benefits"
  | "reservations"
  | "agenda"
  | "customers"
  | "quotes"
  | "finance"
  | "network"
  | "subscription"
  | "administration";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type NotificationRow = {
  id: string;
  title: string;
  message: string;
  audience: NotificationAudience;
  category: NotificationCategory;
  priority: NotificationPriority;
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
  automation_type: string | null;
  source_entity_type: string | null;
  source_entity_id: string | null;
  expires_at: string | null;
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

export type DriverNotificationPreferences = {
  user_id: string;
  agenda_enabled: boolean;
  customers_enabled: boolean;
  quotes_enabled: boolean;
  finance_enabled: boolean;
  network_enabled: boolean;
  subscription_enabled: boolean;
  administration_enabled: boolean;
  reservation_upcoming_hours: number;
  reservation_unconfirmed_hours: number;
  quote_expiring_hours: number;
  customer_inactive_days: number;
  created_at?: string;
  updated_at?: string;
};

export type DriverAutomationRunStatus = "running" | "completed" | "partial" | "failed";
export type DriverAutomationRunSource = "cron" | "admin" | "manual" | "test";

export type DriverAutomationRun = {
  id: string;
  request_id: string;
  run_source: DriverAutomationRunSource;
  status: DriverAutomationRunStatus;
  scanned_count: number;
  created_count: number;
  skipped_count: number;
  error_count: number;
  details: Record<string, unknown>;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
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
