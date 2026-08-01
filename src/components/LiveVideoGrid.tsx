"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { VideoCard } from "@/components/VideoCard";
import type { VideoItem } from "@/data/content";
import { publicPath } from "@/lib/public-path";
import type { LiveContentFeed } from "@/types/live-content";
import { formatBrazilDateTime } from "@/lib/date-time";

type LiveVideoGridProps = {
  fallback: VideoItem[];
  limit?: number;
  showStatus?: boolean;
};

function formatUpdate(value: string) {
  return formatBrazilDateTime(value, { fallback: "Atualização pendente" });
}

export function LiveVideoGrid({ fallback, limit, showStatus = false }: LiveVideoGridProps) {
  const [feed, setFeed] = useState<LiveContentFeed | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void fetch(publicPath("/data/content-feed.json"), { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<LiveContentFeed>;
      })
      .then((data) => {
        if (active) setFeed(data);
      })
      .catch(() => {
        if (active) setFeed(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const items = useMemo<VideoItem[]>(() => {
    const synced = feed?.videos?.length
      ? feed.videos.map((video) => ({
          title: video.title,
          description: video.description || "Novo conteúdo publicado no canal Jean na Estrada.",
          tag: video.tag || "NOVO VÍDEO",
          videoId: video.videoId,
          href: video.href,
        }))
      : fallback;

    return typeof limit === "number" ? synced.slice(0, limit) : synced;
  }, [fallback, feed, limit]);

  return (
    <div className="live-content-block">
      {showStatus ? (
        <div className="content-sync-status" aria-live="polite">
          <RefreshCw size={15} className={loading ? "is-spinning" : undefined} />
          <span>
            {loading
              ? "Buscando os vídeos mais recentes..."
              : feed
                ? `Atualizado automaticamente em ${formatUpdate(feed.generatedAt)}`
                : "Exibindo os destaques salvos no aplicativo"}
          </span>
        </div>
      ) : null}

      <div className="video-grid" aria-label="Vídeos do canal">
        {items.map((video) => (
          <VideoCard video={video} key={video.videoId} />
        ))}
      </div>
    </div>
  );
}
