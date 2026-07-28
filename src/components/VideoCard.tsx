import { ExternalLink, Play } from "lucide-react";
import type { VideoItem } from "@/data/content";

export function VideoCard({ video }: { video: VideoItem }) {
  return (
    <a
      className="video-card"
      href={video.href}
      target="_blank"
      rel="noreferrer"
    >
      <div className="video-card__media">
        <img
          src={`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`}
          alt={`Thumbnail do vídeo ${video.title}`}
          loading="lazy"
        />
        <span className="video-card__play">
          <Play size={20} fill="currentColor" />
        </span>
        <span className="video-card__tag">{video.tag}</span>
      </div>
      <div className="video-card__body">
        <h2>{video.title}</h2>
        <p>{video.description}</p>
        <span>
          Assistir no YouTube <ExternalLink size={14} />
        </span>
      </div>
    </a>
  );
}
