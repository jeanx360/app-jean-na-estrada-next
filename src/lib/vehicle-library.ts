import { createClient } from "@/lib/supabase/server";
import type {
  VehicleBrandRow,
  VehicleDocumentRow,
  VehicleLibraryBrand,
  VehicleModelRow,
} from "@/types/vehicle-library";

export async function getVehicleLibrary(): Promise<VehicleLibraryBrand[]> {
  try {
    const supabase = await createClient();
    const [brandsResult, modelsResult, documentsResult] = await Promise.all([
      supabase
        .from("vehicle_brands")
        .select("id, name, slug, logo_url, sort_order, is_published, created_at, updated_at")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("vehicle_models")
        .select("id, brand_id, name, slug, image_url, image_path, sort_order, is_published, created_at, updated_at")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("vehicle_documents")
        .select(
          "id, model_id, title, document_type, description, years, source_type, external_url, file_path, file_name, file_size, language, source_name, access_level, is_published, sort_order, published_at, created_at, updated_at",
        )
        .eq("is_published", true)
        .lte("published_at", new Date().toISOString())
        .order("sort_order", { ascending: true })
        .order("published_at", { ascending: false }),
    ]);

    if (brandsResult.error || modelsResult.error || documentsResult.error) {
      console.warn(
        "Falha ao carregar biblioteca de veículos:",
        brandsResult.error?.message ?? modelsResult.error?.message ?? documentsResult.error?.message,
      );
      return [];
    }

    const brands = (brandsResult.data ?? []) as VehicleBrandRow[];
    const models = (modelsResult.data ?? []) as VehicleModelRow[];
    const documents = (documentsResult.data ?? []) as VehicleDocumentRow[];

    return brands
      .map((brand) => ({
        ...brand,
        models: models
          .filter((model) => model.brand_id === brand.id)
          .map((model) => ({
            ...model,
            documents: documents.filter((document) => document.model_id === model.id),
          }))
          .filter((model) => model.documents.length > 0),
      }))
      .filter((brand) => brand.models.length > 0);
  } catch (error) {
    console.warn("Falha inesperada ao carregar biblioteca de veículos:", error);
    return [];
  }
}
