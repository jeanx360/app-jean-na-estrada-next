"use client";

import { ArrowLeft, ArrowRight, ExternalLink, Pause, Play, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { publicPath } from "@/lib/public-path";
import type { HomeCarouselSlide } from "@/types/home-carousel";
import type { LiveContentFeed } from "@/types/live-content";

type Props = { slides: HomeCarouselSlide[] };
type ResolvedSlide = HomeCarouselSlide & { videoId?: string };

function isExternal(value: string) {
  return /^https:\/\//i.test(value);
}

function getYouTubeId(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || null;
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0] || "")) return parts[1] || null;
    }
  } catch {
    return null;
  }
  return null;
}

function getYouTubeUrl(videoId: string, fallback: string) {
  const normalizedId = videoId.trim();
  return normalizedId
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(normalizedId)}`
    : fallback;
}

export function HomeCarousel({ slides }: Props) {
  const [feed, setFeed] = useState<LiveContentFeed | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const touchStart = useRef<number | null>(null);
  const didSwipe = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch(publicPath("/data/content-feed.json"), { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<LiveContentFeed>;
      })
      .then((data) => { if (active) setFeed(data); })
      .catch(() => { if (active) setFeed(null); });
    return () => { active = false; };
  }, []);

  const resolvedSlides = useMemo<ResolvedSlide[]>(() => slides.map((slide) => {
    if (slide.sourceType === "latest_video" && feed?.videos?.[0]) {
      const video = feed.videos[0];
      return {
        ...slide,
        title: video.title,
        description: video.description || "Assista ao conteúdo mais recente publicado no canal Jean na Estrada.",
        actionUrl: getYouTubeUrl(video.videoId, video.href),
        actionLabel: "Assistir no YouTube",
        imageUrl: `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`,
        external: true,
        videoId: video.videoId,
      };
    }
    if (slide.sourceType === "latest_news" && feed?.news?.[0]) {
      const news = feed.news[0];
      return {
        ...slide,
        badge: slide.badge || news.source,
        title: news.title,
        description: news.description || "Leia a notícia completa na fonte original.",
        actionUrl: news.href,
        actionLabel: "Ler notícia completa",
        imageUrl: news.image,
        external: true,
      };
    }

    const videoId = getYouTubeId(slide.actionUrl) || undefined;
    return {
      ...slide,
      actionUrl: videoId ? getYouTubeUrl(videoId, slide.actionUrl) : slide.actionUrl,
      external: videoId ? true : slide.external,
      videoId,
    };
  }), [feed, slides]);

  const total = resolvedSlides.length;
  useEffect(() => {
    if (paused || total < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % total), 7500);
    return () => window.clearInterval(timer);
  }, [paused, total]);

  useEffect(() => {
    if (index >= total) setIndex(0);
  }, [index, total]);

  const move = useCallback((direction: number) => {
    setIndex((currentIndex) => (currentIndex + direction + total) % total);
  }, [total]);

  if (!total) return null;
  const current = resolvedSlides[index];
  const titleLength = current.title.trim().length;
  const titleSizeClass =
    titleLength > 100
      ? "home-carousel__title--extra-long"
      : titleLength > 68
        ? "home-carousel__title--long"
        : "home-carousel__title--standard";

  function openCurrent() {
    if (current.external || isExternal(current.actionUrl)) {
      window.open(current.actionUrl, "_blank", "noopener,noreferrer");
      return;
    }
    window.location.assign(current.actionUrl);
  }

  return (
    <section
      className={`home-carousel ${current.imageUrl ? "home-carousel--with-image" : ""} ${isMobile ? "home-carousel--mobile-actionable" : ""}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onClick={(event) => {
        if (!isMobile) return;
        if (didSwipe.current) {
          didSwipe.current = false;
          return;
        }
        const target = event.target as HTMLElement;
        if (target.closest("button, a")) return;
        openCurrent();
      }}
      onKeyDown={(event) => {
        if (!isMobile || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        openCurrent();
      }}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
        didSwipe.current = false;
      }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const end = event.changedTouches[0]?.clientX ?? touchStart.current;
        const distance = end - touchStart.current;
        if (Math.abs(distance) > 45) {
          didSwipe.current = true;
          move(distance > 0 ? -1 : 1);
        }
        touchStart.current = null;
      }}
      tabIndex={isMobile ? 0 : undefined}
      role={isMobile ? "link" : undefined}
      aria-roledescription="carrossel"
      aria-label={isMobile ? `${current.title}. Toque para abrir ou deslize para trocar.` : "Destaques do JNE App"}
    >
      <div className="home-carousel__background" aria-hidden="true">
        {current.imageUrl ? <img src={current.imageUrl} alt="" /> : null}
        <span />
      </div>

      <div className="home-carousel__content" key={current.id}>
        <span className="eyebrow"><Sparkles size={15} /> {current.badge}</span>
        <h1 className={`home-carousel__title ${titleSizeClass}`}>{current.title}</h1>
        <p>{current.description}</p>
        <a
          className="button button--primary"
          href={current.actionUrl}
          target={current.external || isExternal(current.actionUrl) ? "_blank" : undefined}
          rel={current.external || isExternal(current.actionUrl) ? "noopener noreferrer" : undefined}
        >
          {current.actionLabel}
          {current.videoId || current.external || isExternal(current.actionUrl) ? <ExternalLink size={16} /> : <ArrowRight size={17} />}
        </a>
      </div>

      <div className="home-carousel__controls">
        <button type="button" onClick={() => move(-1)} aria-label="Destaque anterior"><ArrowLeft size={18} /></button>
        <div className="home-carousel__dots" role="tablist" aria-label="Escolher destaque">
          {resolvedSlides.map((slide, slideIndex) => (
            <button
              type="button"
              className={slideIndex === index ? "is-active" : ""}
              onClick={() => setIndex(slideIndex)}
              aria-label={`Abrir destaque ${slideIndex + 1}: ${slide.title}`}
              aria-selected={slideIndex === index}
              role="tab"
              key={slide.id}
            />
          ))}
        </div>
        <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Retomar rotação" : "Pausar rotação"}>
          {paused ? <Play size={17} /> : <Pause size={17} />}
        </button>
        <button type="button" onClick={() => move(1)} aria-label="Próximo destaque"><ArrowRight size={18} /></button>
      </div>

      <div className="home-carousel__mobile-indicators" aria-hidden="true">
        {resolvedSlides.map((slide, slideIndex) => (
          <span className={slideIndex === index ? "is-active" : ""} key={slide.id} />
        ))}
      </div>
    </section>
  );
}
