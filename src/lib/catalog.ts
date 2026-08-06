import { createClient } from "@/lib/supabase/server";
import type { CatalogCategoryRow, CatalogType } from "@/types/catalog";

export const fallbackCatalogCategories: CatalogCategoryRow[] = [
  { id: "fallback-app-launchers", catalog_type: "application", name: "Launchers", slug: "launchers", description: "Telas iniciais e interfaces para centrais multimídia.", sort_order: 10, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-app-video", catalog_type: "application", name: "Players de vídeo", slug: "players-de-video", description: "Reprodutores de vídeo e centrais de mídia.", sort_order: 20, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-app-music", catalog_type: "application", name: "Música e áudio", slug: "musica-e-audio", description: "Players, streaming e ferramentas de áudio.", sort_order: 30, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-app-navigation", catalog_type: "application", name: "Mapas e navegação", slug: "mapas-e-navegacao", description: "Aplicativos de mapas, rotas e localização.", sort_order: 40, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-app-communication", catalog_type: "application", name: "Comunicação", slug: "comunicacao", description: "Mensagens, chamadas e conectividade.", sort_order: 50, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-app-games", catalog_type: "application", name: "Jogos", slug: "jogos", description: "Jogos para uso com o veículo parado.", sort_order: 60, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-app-utilities", catalog_type: "application", name: "Utilitários", slug: "utilitarios", description: "Ferramentas auxiliares e manutenção do sistema.", sort_order: 70, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-app-personalization", catalog_type: "application", name: "Personalização", slug: "personalizacao", description: "Temas, widgets e ajustes visuais.", sort_order: 80, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-app-multimedia", catalog_type: "application", name: "Multimídia", slug: "multimidia", description: "Aplicativos gerais para centrais multimídia.", sort_order: 90, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-app-other", catalog_type: "application", name: "Outros", slug: "outros", description: "Aplicativos ainda não classificados em outra categoria.", sort_order: 900, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-product-accessories", catalog_type: "product", name: "Acessórios", slug: "acessorios", description: "Acessórios automotivos e itens de uso diário.", sort_order: 10, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-product-charging", catalog_type: "product", name: "Energia e recarga", slug: "energia-e-recarga", description: "Carregadores, adaptadores V2L e itens de recarga.", sort_order: 20, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-product-multimedia", catalog_type: "product", name: "Multimídia", slug: "multimidia", description: "Boxes, dongles e acessórios para entretenimento.", sort_order: 30, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-product-cables", catalog_type: "product", name: "Cabos e adaptadores", slug: "cabos-e-adaptadores", description: "Cabos, conectores e adaptadores automotivos.", sort_order: 40, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-product-cleaning", catalog_type: "product", name: "Limpeza e cuidados", slug: "limpeza-e-cuidados", description: "Produtos para conservação e estética do veículo.", sort_order: 50, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-product-tools", catalog_type: "product", name: "Ferramentas", slug: "ferramentas", description: "Ferramentas e equipamentos de apoio.", sort_order: 60, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-product-security", catalog_type: "product", name: "Segurança", slug: "seguranca", description: "Câmeras, proteção e itens de segurança.", sort_order: 70, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-product-travel", catalog_type: "product", name: "Viagem", slug: "viagem", description: "Organização, conforto e acessórios para estrada.", sort_order: 80, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-product-tires", catalog_type: "product", name: "Pneus", slug: "pneus", description: "Pneus e itens relacionados às rodas.", sort_order: 90, is_active: true, created_at: "", updated_at: "" },
  { id: "fallback-product-other", catalog_type: "product", name: "Outros", slug: "outros", description: "Produtos ainda não classificados em outra categoria.", sort_order: 900, is_active: true, created_at: "", updated_at: "" },
];

export async function getCatalogCategories(type?: CatalogType, includeInactive = false): Promise<CatalogCategoryRow[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("catalog_categories")
      .select("id, catalog_type, name, slug, description, sort_order, is_active, created_at, updated_at")
      .order("catalog_type", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (type) query = query.eq("catalog_type", type);
    if (!includeInactive) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) {
      console.warn("Falha ao carregar categorias do catálogo:", error.message);
      return fallbackCatalogCategories.filter((item) => (!type || item.catalog_type === type) && (includeInactive || item.is_active));
    }

    return (data ?? []) as unknown as CatalogCategoryRow[];
  } catch (error) {
    console.warn("Falha inesperada ao carregar categorias do catálogo:", error);
    return fallbackCatalogCategories.filter((item) => (!type || item.catalog_type === type) && (includeInactive || item.is_active));
  }
}
