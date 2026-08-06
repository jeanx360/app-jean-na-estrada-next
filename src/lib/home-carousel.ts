import { createClient } from "@/lib/supabase/server";
import type { HomeCarouselRow, HomeCarouselSlide } from "@/types/home-carousel";

const defaultSlides: HomeCarouselSlide[] = [
  {
    id: "default-welcome",
    sourceType: "custom",
    badge: "JNE APP",
    title: "O universo do Jean na Estrada em um só lugar.",
    description:
      "Vídeos, tutoriais, manuais, aplicativos automotivos, parceiros e benefícios organizados em uma plataforma preparada para crescer.",
    actionLabel: "Explorar o aplicativo",
    actionUrl: "/tutoriais",
  },
  {
    id: "default-video",
    sourceType: "latest_video",
    badge: "ÚLTIMO VÍDEO",
    title: "Conteúdo novo no canal",
    description: "Acompanhe o vídeo mais recente do Jean na Estrada.",
    actionLabel: "Assistir agora",
    actionUrl: "/videos",
  },
  {
    id: "default-news",
    sourceType: "latest_news",
    badge: "NOTÍCIA EM DESTAQUE",
    title: "Informação automotiva atualizada",
    description: "Veja uma das notícias mais recentes selecionadas pelo JNE App.",
    actionLabel: "Ler notícia",
    actionUrl: "/noticias",
  },
];

function contentPath(content: NonNullable<HomeCarouselRow["public_contents"]>) {
  if (content.content_type === "partner") return content.external_url ?? "/parceiros";
  if (content.content_type === "application") return "/catalogo?tipo=aplicativos";
  if (content.content_type === "product") return "/catalogo?tipo=produtos";
  return "/tutoriais";
}

export async function getHomeCarouselSlides(): Promise<HomeCarouselSlide[]> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("home_carousel_slides")
      .select(
        "id, source_type, public_content_id, badge, title, description, action_label, action_url, image_url, image_path, sort_order, is_published, starts_at, ends_at, created_at, updated_at, public_contents(id, content_type, title, summary, image_url, external_url, slug)",
      )
      .eq("is_published", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error || !data?.length) {
      if (error) console.warn("Falha ao carregar carrossel:", error.message);
      return defaultSlides;
    }

    return (data as unknown as HomeCarouselRow[]).map((row) => {
      const content = row.public_contents ?? null;
      const sourceType = row.source_type;
      const fallbackTitle = sourceType === "latest_video"
        ? "Conteúdo novo no canal"
        : sourceType === "latest_news"
          ? "Notícia em destaque"
          : content?.title ?? "JNE App";
      const fallbackDescription = content?.summary ?? "Conteúdo selecionado para a comunidade Jean na Estrada.";
      const resolvedUrl = row.action_url ?? (content ? contentPath(content) : sourceType === "latest_video" ? "/videos" : sourceType === "latest_news" ? "/noticias" : "/");

      return {
        id: row.id,
        sourceType,
        badge: row.badge ?? (sourceType === "latest_video" ? "ÚLTIMO VÍDEO" : sourceType === "latest_news" ? "NOTÍCIA" : "DESTAQUE JNE"),
        title: row.title ?? fallbackTitle,
        description: row.description ?? fallbackDescription,
        actionLabel: row.action_label ?? (sourceType === "latest_video" ? "Assistir agora" : sourceType === "latest_news" ? "Ler notícia" : "Abrir destaque"),
        actionUrl: resolvedUrl,
        imageUrl: row.image_url ?? content?.image_url ?? undefined,
        external: /^https:\/\//i.test(resolvedUrl),
      };
    });
  } catch (error) {
    console.warn("Falha inesperada ao carregar carrossel:", error);
    return defaultSlides;
  }
}
