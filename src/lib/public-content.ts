import {
  applications as fallbackApplications,
  partners as fallbackPartners,
  products as fallbackProducts,
  tutorials as fallbackTutorials,
  type ApplicationItem,
  type PartnerItem,
  type ProductItem,
  type TutorialItem,
  type TutorialResource,
} from "@/data/content";
import { createClient } from "@/lib/supabase/server";
import type { PublicContentRow, PublicContentType } from "@/types/public-content";

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

async function fetchPublished(type: PublicContentType) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("public_contents")
      .select(
        "id, content_type, title, slug, summary, category, image_url, image_path, external_url, metadata, is_published, is_featured, sort_order, published_at, created_at, updated_at",
      )
      .eq("content_type", type)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("published_at", { ascending: false });

    if (error) {
      console.warn(`Falha ao carregar ${type} do Supabase:`, error.message);
      return [] as PublicContentRow[];
    }

    return (data ?? []) as PublicContentRow[];
  } catch (error) {
    console.warn(`Falha inesperada ao carregar ${type}:`, error);
    return [] as PublicContentRow[];
  }
}

function mapResource(value: unknown): TutorialResource | null {
  if (!value || typeof value !== "object") return null;
  const resource = value as Record<string, unknown>;
  const href = text(resource.href);
  const label = text(resource.label);
  const kind = text(resource.kind) as TutorialResource["kind"];

  if (!href || !label || !["video", "pdf", "drive"].includes(kind)) return null;

  return {
    label,
    href,
    kind,
    description: text(resource.description, "Abrir recurso de apoio."),
  };
}

export async function getTutorials(): Promise<TutorialItem[]> {
  const rows = await fetchPublished("tutorial");
  if (!rows.length) return fallbackTutorials;

  return rows.map((row) => {
    const metadata = row.metadata ?? {};
    const rawResources = Array.isArray(metadata.resources) ? metadata.resources : [];
    const resources = rawResources.map(mapResource).filter((item): item is TutorialResource => Boolean(item));

    return {
      slug: row.slug,
      title: row.title,
      description: row.summary ?? "Tutorial publicado no JNE App.",
      vehicle: text(metadata.vehicle, row.category ?? "Geral"),
      level: ["Básico", "Intermediário", "Avançado"].includes(text(metadata.level))
        ? (text(metadata.level) as TutorialItem["level"])
        : "Básico",
      status: text(metadata.status) === "Em preparação" ? "Em preparação" : "Disponível",
      resources,
    };
  });
}

export async function getApplications(): Promise<ApplicationItem[]> {
  const rows = await fetchPublished("application");
  if (!rows.length) return fallbackApplications;

  return rows.map((row) => ({
    name: row.title,
    description: row.summary ?? "Aplicativo cadastrado no JNE App.",
    compatibility: text(row.metadata.compatibility, row.category ?? "Compatibilidade não informada"),
    status: text(row.metadata.status) === "Em validação" ? "Em validação" : "Disponível no Drive",
    href: row.external_url ?? "#",
  }));
}

export async function getPartners(): Promise<PartnerItem[]> {
  const rows = await fetchPublished("partner");
  if (!rows.length) return fallbackPartners;

  return rows.map((row) => ({
    name: row.title,
    description: row.summary ?? "Parceiro oficial do Jean na Estrada.",
    image: row.image_url ?? "/partners/banner-placeholder.svg",
    href: row.external_url ?? "#",
    actionLabel: text(row.metadata.actionLabel, "Conhecer parceiro"),
    services: stringList(row.metadata.services),
  }));
}

export async function getProducts(): Promise<ProductItem[]> {
  const rows = await fetchPublished("product");
  if (!rows.length) return fallbackProducts;

  return rows.map((row) => ({
    name: row.title,
    description: row.summary ?? "Produto recomendado pelo Jean na Estrada.",
    category: row.category ?? "Geral",
    retailer: ["Shopee", "Mercado Livre", "Amazon"].includes(text(row.metadata.retailer))
      ? (text(row.metadata.retailer) as ProductItem["retailer"])
      : "Mercado Livre",
    href: row.external_url ?? "#",
    highlight: text(row.metadata.highlight) || undefined,
  }));
}
