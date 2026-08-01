import { getAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

type SearchItem = {
  title: string;
  description: string;
  href: string;
  category: string;
  keywords?: string;
};

type PublicContentRow = {
  content_type: "tutorial" | "application" | "partner" | "product";
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  metadata: Record<string, unknown> | null;
};

type VehicleBrandRow = { id: string; name: string; slug: string };
type VehicleModelRow = { id: string; brand_id: string; name: string; slug: string };
type CommunitySearchRow = {
  id: string;
  title: string;
  body: string;
};

type VehicleDocumentRow = {
  id: string;
  model_id: string;
  title: string;
  description: string | null;
  document_type: string;
  years: number[] | null;
  language: string | null;
  source_name: string | null;
  access_level: "public" | "vip";
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function contentHref(item: PublicContentRow) {
  if (item.content_type === "application") {
    return `/aplicativos?busca=${encodeURIComponent(item.title)}`;
  }
  if (item.content_type === "tutorial") return "/tutoriais";
  if (item.content_type === "partner") return "/parceiros";
  return "/produtos";
}

function contentCategory(type: PublicContentRow["content_type"]) {
  if (type === "application") return "Aplicativo";
  if (type === "tutorial") return "Tutorial";
  if (type === "partner") return "Parceiro";
  return "Produto";
}

export async function GET() {
  const { supabase, profile } = await getAuthContext();
  const canAccessVip = !profile?.is_blocked && (profile?.role === "vip" || profile?.role === "admin");
  const now = new Date().toISOString();

  const [contentsResult, brandsResult, modelsResult, documentsResult, communityResult] = await Promise.all([
    supabase
      .from("public_contents")
      .select("content_type, title, slug, summary, category, metadata")
      .eq("is_published", true)
      .or(`published_at.is.null,published_at.lte.${now}`)
      .order("sort_order", { ascending: true })
      .limit(300),
    supabase
      .from("vehicle_brands")
      .select("id, name, slug")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .limit(100),
    supabase
      .from("vehicle_models")
      .select("id, brand_id, name, slug")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .limit(300),
    supabase
      .from("vehicle_documents")
      .select("id, model_id, title, description, document_type, years, language, source_name, access_level")
      .eq("is_published", true)
      .or(`published_at.is.null,published_at.lte.${now}`)
      .order("sort_order", { ascending: true })
      .limit(500),
    canAccessVip
      ? supabase
          .from("community_posts")
          .select("id, title, body")
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as CommunitySearchRow[] }),
  ]);

  const contents = (contentsResult.data ?? []) as PublicContentRow[];
  const brands = (brandsResult.data ?? []) as VehicleBrandRow[];
  const models = (modelsResult.data ?? []) as VehicleModelRow[];
  const documents = (documentsResult.data ?? []) as VehicleDocumentRow[];
  const communityPosts = (communityResult.data ?? []) as CommunitySearchRow[];

  const brandById = new Map(brands.map((brand) => [brand.id, brand]));
  const modelById = new Map(models.map((model) => [model.id, model]));
  const items: SearchItem[] = [];

  for (const item of contents) {
    const metadata = item.metadata ?? {};
    const accessLevel = text(metadata.accessLevel) === "vip" ? "vip" : "public";
    if (accessLevel === "vip" && !canAccessVip) continue;

    const compatibility = text(metadata.compatibility);
    const origin = text(metadata.origin);
    const version = text(metadata.version);
    items.push({
      title: item.title,
      description: item.summary || `${contentCategory(item.content_type)} disponível no JNE App.`,
      href: contentHref(item),
      category: contentCategory(item.content_type),
      keywords: [item.category, compatibility, origin, version, item.slug].filter(Boolean).join(" "),
    });
  }

  for (const post of communityPosts) {
    items.push({
      title: post.title,
      description: post.body.length > 160 ? `${post.body.slice(0, 160).trim()}…` : post.body,
      href: `/comunidade/${post.id}`,
      category: "Comunidade",
      keywords: `comunidade vip membros conversa ${post.body}`,
    });
  }

  for (const document of documents) {
    if (document.access_level === "vip" && !canAccessVip) continue;
    const model = modelById.get(document.model_id);
    const brand = model ? brandById.get(model.brand_id) : null;
    if (!model || !brand) continue;

    const firstYear = Array.isArray(document.years) ? [...document.years].sort((a, b) => b - a)[0] : undefined;
    const params = new URLSearchParams({ marca: brand.slug, modelo: model.slug });
    if (firstYear) params.set("ano", String(firstYear));

    items.push({
      title: document.title,
      description: document.description || `${brand.name} ${model.name} — documento disponível na biblioteca do veículo.`,
      href: `/guia?${params.toString()}#manuais`,
      category: "Manual",
      keywords: [brand.name, model.name, ...(document.years ?? []), document.document_type, document.language, document.source_name]
        .filter(Boolean)
        .join(" "),
    });
  }

  return Response.json({ items }, { headers: NO_STORE_HEADERS });
}
