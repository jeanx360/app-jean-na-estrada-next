"use client";

import { Play, PlayCircle } from "lucide-react";
import { useState } from "react";
import type { VideoItem } from "@/data/content";
import { YouTubePlayerModal } from "@/components/YouTubePlayerModal";

export function VideoCard({ video }: { video: VideoItem }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="video-card video-card--button"
        onClick={() => setOpen(true)}
        aria-label={`Assistir ${video.title} no JNE App`}
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
            Assistir no JNE App <PlayCircle size={14} />
          </span>
        </div>
      </button>

      <YouTubePlayerModal
        videoId={video.videoId}
        title={video.title}
        youtubeUrl={video.href}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
