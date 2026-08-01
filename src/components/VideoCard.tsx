import { ExternalLink, Play } from "lucide-react";
import type { VideoItem } from "@/data/content";

function getYouTubeUrl(video: VideoItem) {
  const videoId = video.videoId.trim();
  return videoId
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
    : video.href;
}

export function VideoCard({ video }: { video: VideoItem }) {
  const youtubeUrl = getYouTubeUrl(video);

  return (
    <a
      className="video-card"
      href={youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Assistir ${video.title} no YouTube`}
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
        <h3>{video.title}</h3>
        <p>{video.description}</p>
        <span>
          Assistir no YouTube <ExternalLink size={14} />
        </span>
      </div>
    </a>
  );
}
