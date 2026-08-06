export type PublicContentType = "tutorial" | "application" | "partner" | "product";
export type PublicContentPublicationStatus = "draft" | "published" | "archived";

export type PublicContentRow = {
  id: string;
  content_type: PublicContentType;
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  catalog_category_id: string | null;
  image_url: string | null;
  image_path: string | null;
  external_url: string | null;
  metadata: Record<string, unknown>;
  publication_status: PublicContentPublicationStatus;
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicContentActionState = {
  error?: string;
  success?: string;
};
