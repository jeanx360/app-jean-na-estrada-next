export type HomeVisualBlockType =
  | "carousel"
  | "cta"
  | "utility"
  | "quick_access"
  | "videos"
  | "trust";

export type HomeVisualBlockVariant =
  | "default"
  | "commercial"
  | "community"
  | "ev"
  | "driver";

export type HomeVisualBlockIcon =
  | "sparkles"
  | "handshake"
  | "battery"
  | "calculator"
  | "route"
  | "check"
  | "videos"
  | "grid";

export type HomeVisualBlockAccent =
  | "blue"
  | "cyan"
  | "orange"
  | "violet"
  | "green";

export type HomeVisualBlockRow = {
  id: string;
  block_key: string;
  block_type: HomeVisualBlockType;
  variant: HomeVisualBlockVariant;
  eyebrow: string | null;
  title: string | null;
  description: string | null;
  action_label: string | null;
  action_url: string | null;
  secondary_action_label: string | null;
  secondary_action_url: string | null;
  icon: HomeVisualBlockIcon | null;
  accent: HomeVisualBlockAccent;
  metadata: Record<string, unknown>;
  sort_order: number;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
};

export type HomeVisualBlockActionState = {
  error?: string;
  success?: string;
};
