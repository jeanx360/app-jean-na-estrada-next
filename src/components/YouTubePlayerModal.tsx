"use client";

import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  videoId: string;
  title: string;
  open: boolean;
  onClose: () => void;
  youtubeUrl?: string;
};

function normalizeVideoId(value: string) {
  const trimmed = value.trim();
  return /^[A-Za-z0-9_-]{11}$/.test(trimmed) ? trimmed : "";
}

export function YouTubePlayerModal({ videoId, title, open, onClose, youtubeUrl }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [embedUrl, setEmbedUrl] = useState("");

  useEffect(() => {
    if (!open) {
      setEmbedUrl("");
      return;
    }

    const safeVideoId = normalizeVideoId(videoId);
    if (!safeVideoId) {
      setEmbedUrl("");
      return;
    }

    const origin = window.location.origin;
    const pageUrl = window.location.href;
    const url = new URL(`https://www.youtube.com/embed/${safeVideoId}`);

    url.searchParams.set("autoplay", "1");
    url.searchParams.set("controls", "1");
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("rel", "0");
    url.searchParams.set("enablejsapi", "1");
    url.searchParams.set("origin", origin);
    url.searchParams.set("widget_referrer", pageUrl);

    setEmbedUrl(url.toString());
  }, [open, videoId]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const safeVideoId = normalizeVideoId(videoId);
  const watchUrl = youtubeUrl || (safeVideoId ? `https://www.youtube.com/watch?v=${safeVideoId}` : "https://www.youtube.com/");

  return (
    <div
      className="youtube-player-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="youtube-player-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Reproduzindo ${title}`}
      >
        <header className="youtube-player-dialog__header">
          <div>
            <span>ASSISTINDO NO JNE APP</span>
            <h2>{title}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Fechar vídeo"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </header>

        <div className="youtube-player-dialog__frame">
          {embedUrl ? (
            <iframe
              key={embedUrl}
              src={embedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <div className="youtube-player-dialog__fallback" role="alert">
              <AlertTriangle size={30} />
              <strong>Não foi possível preparar este vídeo.</strong>
              <p>O identificador recebido não é válido. Use o link abaixo para abrir no YouTube.</p>
            </div>
          )}
        </div>

        <footer className="youtube-player-dialog__footer">
          <p>O player informa ao YouTube a origem oficial do JNE App para permitir a reprodução incorporada.</p>
          <a href={watchUrl} target="_blank" rel="noopener" className="text-link">
            Abrir no YouTube
            <ExternalLink size={15} />
          </a>
        </footer>
      </section>
    </div>
  );
}
