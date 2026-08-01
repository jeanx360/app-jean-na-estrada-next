import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const OUTPUT_FILE = resolve("public/data/content-feed.json");
const CHANNEL_ID = "UCFwFlCooeFKHSLXxkRTA70g";
const VIDEO_LIMIT = 12;
const NEWS_LIMIT = 24;

const NEWS_FEEDS = [
  { name: "InsideEVs Brasil", url: "https://insideevs.uol.com.br/rss/news/all/" },
  { name: "Motor1.com", url: "https://motor1.uol.com.br/rss/news/all/" },
];

const KEYWORDS = [
  "byd", "tesla", "volvo", "bmw", "mercedes", "audi", "porsche", "volkswagen", "renault",
  "nissan", "hyundai", "kia", "ford", "chevrolet", "fiat", "peugeot", "honda", "toyota",
  "gwm", "ora", "geely", "leapmotor", "jetour", "elétrico", "eletrico", "eletrificado",
  "híbrido", "hibrido", "phev", "bev", "ev", "bateria", "autonomia", "recarga",
  "carregamento", "eletroposto", "mobilidade", "multimídia", "multimidia", "tecnologia",
  "lançamento", "lancamento", "review", "teste", "comparativo", "mercado automotivo",
];

function decodeEntities(value = "") {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

function stripHtml(value = "") {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block, tag) {
  const escaped = tag.replace(":", "\\:");
  const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? decodeEntities(match[1]).trim() : "";
}

function extractAttribute(block, element, attribute) {
  const escaped = element.replace(":", "\\:");
  const elementMatch = block.match(new RegExp(`<${escaped}\\b[^>]*>`, "i"));
  if (!elementMatch) return "";
  const attributeMatch = elementMatch[0].match(new RegExp(`${attribute}=["']([^"']+)["']`, "i"));
  return attributeMatch ? decodeEntities(attributeMatch[1]).trim() : "";
}

function toIsoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function extractImage(block) {
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

function isRelevant(title, description) {
  const text = `${title} ${description}`.toLocaleLowerCase("pt-BR");
  return KEYWORDS.some((keyword) => text.includes(keyword));
}

async function fetchXml(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
      "User-Agent": "JNE-App-Content-Sync/1.0 (+https://jneapp.app)",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}


async function fetchRss2Json(url) {
  const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
  const response = await fetch(endpoint, {
    headers: { "User-Agent": "JNE-App-Content-Sync/1.0 (+https://jneapp.app)" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error(`rss2json HTTP ${response.status}`);
  const data = await response.json();
  if (data.status !== "ok" || !Array.isArray(data.items)) {
    throw new Error("rss2json retornou uma resposta inválida");
  }
  return data.items;
}

function imageFromJsonItem(item) {
  if (item.enclosure?.link) return item.enclosure.link;
  if (item.thumbnail) return item.thumbnail;
  const html = item.content || item.description || "";
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? "";
}

async function syncVideos() {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

  try {
    const xml = await fetchXml(feedUrl);
    const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];

    return entries.slice(0, VIDEO_LIMIT).map((entry) => {
      const videoId = extractTag(entry, "yt:videoId");
      const title = stripHtml(extractTag(entry, "title"));
      const href = extractAttribute(entry, "link", "href") || `https://www.youtube.com/watch?v=${videoId}`;

      return {
        title,
        description: "Novo conteúdo publicado no canal Jean na Estrada.",
        videoId,
        href,
        publishedAt: toIsoDate(extractTag(entry, "published")),
        tag: "NOVO VÍDEO",
      };
    }).filter((item) => item.videoId && item.title);
  } catch {
    const items = await fetchRss2Json(feedUrl);
    return items.slice(0, VIDEO_LIMIT).map((item) => {
      const href = item.link || "";
      const videoId = href ? (new URL(href).searchParams.get("v") || href.split("/").pop() || "") : "";
      return {
        title: stripHtml(item.title || ""),
        description: "Novo conteúdo publicado no canal Jean na Estrada.",
        videoId,
        href,
        publishedAt: toIsoDate(item.pubDate),
        tag: "NOVO VÍDEO",
      };
    }).filter((item) => item.videoId && item.title);
  }
}

function parseNews(xml, source) {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];

  return blocks.slice(0, 25).map((block) => {
    const title = stripHtml(extractTag(block, "title"));
    const rawDescription = extractTag(block, "description") || extractTag(block, "summary") || extractTag(block, "content:encoded");
    const description = stripHtml(rawDescription).slice(0, 260);
    const href = stripHtml(extractTag(block, "link")) || extractAttribute(block, "link", "href") || extractTag(block, "guid");
    const publishedAt = toIsoDate(extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated"));
    const image = extractImage(block);

    return { title, description, href, publishedAt, source, image };
  }).filter((item) => item.title && item.href && isRelevant(item.title, item.description));
}

async function readFallback() {
  try {
    return JSON.parse(await readFile(OUTPUT_FILE, "utf8"));
  } catch {
    return { generatedAt: new Date().toISOString(), videos: [], news: [], sources: [] };
  }
}

async function main() {
  const fallback = await readFallback();
  const statuses = [];
  let videos = fallback.videos ?? [];
  let news = [];

  try {
    videos = await syncVideos();
    statuses.push({ name: "YouTube", ok: true, items: videos.length });
    console.log(`✓ YouTube: ${videos.length} vídeos`);
  } catch (error) {
    statuses.push({ name: "YouTube", ok: false, items: 0 });
    console.warn(`! YouTube indisponível: ${error.message}`);
  }

  for (const feed of NEWS_FEEDS) {
    try {
      let items;
      try {
        const xml = await fetchXml(feed.url);
        items = parseNews(xml, feed.name);
      } catch {
        const jsonItems = await fetchRss2Json(feed.url);
        items = jsonItems.map((item) => {
          const title = stripHtml(item.title || "");
          const description = stripHtml(item.description || item.content || "").slice(0, 260);
          return {
            title,
            description,
            href: item.link || "",
            publishedAt: toIsoDate(item.pubDate),
            source: feed.name,
            image: imageFromJsonItem(item),
          };
        }).filter((item) => item.title && item.href && isRelevant(item.title, item.description));
      }
      news.push(...items);
      statuses.push({ name: feed.name, ok: true, items: items.length });
      console.log(`✓ ${feed.name}: ${items.length} notícias relevantes`);
    } catch (error) {
      statuses.push({ name: feed.name, ok: false, items: 0 });
      console.warn(`! ${feed.name} indisponível: ${error.message}`);
    }
  }

  const dedupedNews = Array.from(new Map(news.map((item) => [item.href, item])).values())
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, NEWS_LIMIT);

  const successfulSource = statuses.some((status) => status.ok);
  const output = {
    generatedAt: successfulSource ? new Date().toISOString() : fallback.generatedAt ?? new Date().toISOString(),
    videos: videos.length ? videos : fallback.videos ?? [],
    news: dedupedNews.length ? dedupedNews : fallback.news ?? [],
    sources: statuses,
  };

  await mkdir(dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Conteúdo salvo em ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error("Falha inesperada ao sincronizar conteúdo:", error);
  process.exitCode = 0;
});
