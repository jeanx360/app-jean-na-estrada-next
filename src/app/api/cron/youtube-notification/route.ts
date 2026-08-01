import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const CHANNEL_ID = "UCFwFlCooeFKHSLXxkRTA70g";

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function extractTag(block: string, tag: string) {
  const escaped = tag.replace(":", "\\:");
  const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

async function latestVideo() {
  const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, {
    cache: "no-store",
    headers: {
      Accept: "application/atom+xml, application/xml, text/xml",
      "User-Agent": "JNE-App-Notification-Cron/1.0 (+https://jneapp.app)",
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) throw new Error(`YouTube respondeu HTTP ${response.status}`);
  const xml = await response.text();
  const entry = xml.match(/<entry\b[\s\S]*?<\/entry>/i)?.[0];
  if (!entry) throw new Error("Nenhum vídeo encontrado no feed.");

  const videoId = extractTag(entry, "yt:videoId");
  const title = extractTag(entry, "title");
  const publishedAt = extractTag(entry, "published");
  if (!videoId || !title) throw new Error("Feed do YouTube incompleto.");

  return {
    videoId,
    title,
    publishedAt: publishedAt || new Date().toISOString(),
    href: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const video = await latestVideo();
    const sourceKey = `youtube:${video.videoId}`;
    const supabase = createAdminClient();

    const { data: existing, error: existingError } = await supabase
      .from("notifications")
      .select("id")
      .eq("source_key", sourceKey)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (existing) {
      return Response.json({ ok: true, created: false, reason: "already-notified", videoId: video.videoId });
    }

    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        title: `Novo vídeo: ${video.title}`,
        message: "Acabou de sair conteúdo novo no canal Jean na Estrada.",
        audience: "all",
        category: "videos",
        action_url: video.href,
        is_published: true,
        is_featured: false,
        published_at: video.publishedAt,
        push_requested: true,
        source_key: sourceKey,
      })
      .select("id, title, message, audience, category, action_url, image_url")
      .single();

    if (error || !notification) throw new Error(error?.message || "Falha ao criar notificação.");

    const pushResult = await sendPushNotification({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      audience: notification.audience,
      category: notification.category,
      actionUrl: notification.action_url,
      imageUrl: notification.image_url,
    });

    await supabase
      .from("notifications")
      .update({
        push_sent_at: pushResult.configured ? new Date().toISOString() : null,
        push_success_count: pushResult.successCount,
        push_failure_count: pushResult.failureCount,
      })
      .eq("id", notification.id);

    return Response.json({
      ok: true,
      created: true,
      videoId: video.videoId,
      push: pushResult,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}
