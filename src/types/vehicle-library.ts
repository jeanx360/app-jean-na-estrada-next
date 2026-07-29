export type VehicleDocumentType =
  | "owner"
  | "maintenance"
  | "warranty"
  | "multimedia"
  | "quick-guide"
  | "technical"
  | "other";

export type VehicleDocumentSource = "upload" | "external";
export type VehicleDocumentAccess = "public" | "vip";

export type VehicleBrandRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type VehicleModelRow = {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  image_path: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type VehicleDocumentRow = {
  id: string;
  model_id: string;
  title: string;
  document_type: VehicleDocumentType;
  description: string | null;
  years: number[];
  source_type: VehicleDocumentSource;
  external_url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  language: string;
  source_name: string | null;
  access_level: VehicleDocumentAccess;
  is_published: boolean;
  sort_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VehicleLibraryModel = VehicleModelRow & {
  documents: VehicleDocumentRow[];
};

export type VehicleLibraryBrand = VehicleBrandRow & {
  models: VehicleLibraryModel[];
};

export type VehicleLibraryActionState = {
  error?: string;
  success?: string;
};
