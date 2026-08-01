export type HomeQuickAccessAccent = "blue" | "cyan" | "orange" | "violet";

export type HomeQuickAccessIcon =
  | "videos"
  | "manuals"
  | "apps"
  | "products"
  | "calculator"
  | "vip"
  | "community"
  | "news"
  | "partners";

export type HomeQuickAccessRow = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: HomeQuickAccessIcon;
  accent: HomeQuickAccessAccent;
  sort_order: number;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
};

export type HomeQuickAccessItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: HomeQuickAccessIcon;
  accent: HomeQuickAccessAccent;
};

export type HomeQuickAccessActionState = {
  error?: string;
  success?: string;
};
