export type HomeCarouselSource = "custom" | "latest_video" | "latest_news" | "public_content";

export type HomeCarouselRow = {
  id: string;
  source_type: HomeCarouselSource;
  public_content_id: string | null;
  badge: string | null;
  title: string | null;
  description: string | null;
  action_label: string | null;
  action_url: string | null;
  image_url: string | null;
  image_path: string | null;
  sort_order: number;
  is_published: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  public_contents?: {
    id: string;
    content_type: "tutorial" | "application" | "partner" | "product";
    title: string;
    summary: string | null;
    image_url: string | null;
    external_url: string | null;
    slug: string;
  } | null;
};

export type HomeCarouselSlide = {
  id: string;
  sourceType: HomeCarouselSource;
  badge: string;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  imageUrl?: string;
  external?: boolean;
};

export type HomeCarouselActionState = {
  error?: string;
  success?: string;
};
