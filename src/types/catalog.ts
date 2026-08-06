export type CatalogType = "application" | "product";

export type CatalogCategoryRow = {
  id: string;
  catalog_type: CatalogType;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CatalogAssignmentItem = {
  id: string;
  content_type: CatalogType;
  title: string;
  category: string | null;
  catalog_category_id: string | null;
  publication_status: "draft" | "published" | "archived";
  is_published: boolean;
};
