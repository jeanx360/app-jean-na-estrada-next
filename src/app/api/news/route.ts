import { NextResponse } from "next/server";
import type { FeedSourceStatus, LiveContentFeed, SyncedNewsItem } from "@/types/live-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NEWS_LIMIT = 24;
const REQUEST_TIMEOUT_MS = 10_000;

const NEWS_FEEDS = [
  { name: "InsideEVs Brasil", url: "https://insideevs.uol.com.br/rss/news/all/" },
  { name: "Motor1.com", url: "https://motor1.uol.com.br/rss/news/all/" },
] as const;

const KEYWORDS = [
  "byd", "tesla", "volvo", "bmw", "mercedes", "audi", "porsche", "volkswagen", "renault",
  "nissan", "hyundai", "kia", "ford", "chevrolet", "fiat", "peugeot", "honda", "toyota",
  "gwm", "ora", "geely", "leapmotor", "jetour", "elétrico", "eletrico", "eletrificado",
  "híbrido", "hibrido", "phev", "bev", "bateria", "autonomia", "recarga", "carregamento",
  "eletroposto", "mobilidade", "multimídia", "multimidia", "tecnologia", "lançamento",
  "lancamento", "review", "teste", "comparativo", "mercado automotivo",
];

function decodeEntities(value = "") {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name: string) => named[name.toLowerCase()] ?? match);
}

function stripHtml(value = "") {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block: string, tag: string) {
  const escaped = tag.replace(":", "\\:");
  const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? decodeEntities(match[1]).trim() : "";
}

function extractAttribute(block: string, element: string, attribute: string) {
  const escaped = element.replace(":", "\\:");
  const elementMatch = block.match(new RegExp(`<${escaped}\\b[^>]*>`, "i"));
  if (!elementMatch) return "";
  const attributeMatch = elementMatch[0].match(new RegExp(`${attribute}=["']([^"']+)["']`, "i"));
  return attributeMatch ? decodeEntities(attributeMatch[1]).trim() : "";
}

function toIsoDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function extractImage(block: string) {
  const enclosure = extractAttribute(block, "enclosure", "url");
  if (enclosure) return enclosure;

  const mediaContent = extractAttribute(block, "media:content", "url");
  if (mediaContent) return mediaContent;

  const mediaThumbnail = extractAttribute(block, "media:thumbnail", "url");
  if (mediaThumbnail) return mediaThumbnail;

  const html = extractTag(block, "content:encoded") || extractTag(block, "description");
  const imageMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imageMatch?.[1] ? decodeEntities(imageMatch[1]) : "";
}

function isRelevant(title: string, description: string) {
  const text = `${title} ${description}`.toLocaleLowerCase("pt-BR");
  return KEYWORDS.some((keyword) => text.includes(keyword));
}

function parseNews(xml: string, source: string): SyncedNewsItem[] {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];

  return blocks
    .slice(0, 35)
    .map((block) => {
      const title = stripHtml(extractTag(block, "title"));
      const rawDescription =
        extractTag(block, "description") ||
        extractTag(block, "summary") ||
        extractTag(block, "content:encoded");
      const description = stripHtml(rawDescription).slice(0, 260);
      const href =
        stripHtml(extractTag(block, "link")) ||
        extractAttribute(block, "link", "href") ||
        extractTag(block, "guid");
      const publishedAt = toIsoDate(
        extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated"),
      );
      const image = extractImage(block);

      return { title, description, href, publishedAt, source, image };
    })
    .filter((item) => item.title && item.href && isRelevant(item.title, item.description));
}

async function fetchXml(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
      "User-Agent": "JNE-App-News/1.7 (+https://jneapp.app)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchRss2Json(url: string, source: string): Promise<SyncedNewsItem[]> {
  const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
  const response = await fetch(endpoint, {
    headers: { "User-Agent": "JNE-App-News/1.7 (+https://jneapp.app)" },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`rss2json HTTP ${response.status}`);

  const data = (await response.json()) as {
    status?: string;
    items?: Array<{
      title?: string;
      description?: string;
      content?: string;
      link?: string;
      pubDate?: string;
      thumbnail?: string;
      enclosure?: { link?: string };
    }>;
  };

  if (data.status !== "ok" || !Array.isArray(data.items)) {
    throw new Error("rss2json retornou uma resposta inválida");
  }

  return data.items
    .map((item) => {
      const title = stripHtml(item.title ?? "");
      const description = stripHtml(item.description ?? item.content ?? "").slice(0, 260);
      const html = item.content ?? item.description ?? "";
      const imageMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      const image = item.enclosure?.link || item.thumbnail || imageMatch?.[1] || "";

      return {
        title,
        description,
        href: item.link ?? "",
        publishedAt: toIsoDate(item.pubDate ?? ""),
        source,
        image,
      };
    })
    .filter((item) => item.title && item.href && isRelevant(item.title, item.description));
}

async function loadSource(feed: (typeof NEWS_FEEDS)[number]) {
  try {
    const xml = await fetchXml(feed.url);
    return parseNews(xml, feed.name);
  } catch {
    return fetchRss2Json(feed.url, feed.name);
  }
}

export async function GET() {
  const settled = await Promise.allSettled(NEWS_FEEDS.map((feed) => loadSource(feed)));
  const sources: FeedSourceStatus[] = [];
  const news: SyncedNewsItem[] = [];

  settled.forEach((result, index) => {
    const feed = NEWS_FEEDS[index];
    if (result.status === "fulfilled") {
      news.push(...result.value);
      sources.push({ name: feed.name, ok: true, items: result.value.length });
    } else {
      sources.push({ name: feed.name, ok: false, items: 0 });
    }
  });

  const dedupedNews = Array.from(new Map(news.map((item) => [item.href, item])).values())
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, NEWS_LIMIT);

  const payload: LiveContentFeed = {
    generatedAt: new Date().toISOString(),
    videos: [],
    news: dedupedNews,
    sources,
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
      "X-JNE-News-Count": String(dedupedNews.length),
    },
  });
}
