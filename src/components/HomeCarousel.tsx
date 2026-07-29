"use client";

import { ArrowLeft, ArrowRight, ExternalLink, Pause, Play, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { publicPath } from "@/lib/public-path";
import type { HomeCarouselSlide } from "@/types/home-carousel";
import type { LiveContentFeed } from "@/types/live-content";

type Props = { slides: HomeCarouselSlide[] };

function isExternal(value: string) {
  return /^https:\/\//i.test(value);
}

export function HomeCarousel({ slides }: Props) {
  const [feed, setFeed] = useState<LiveContentFeed | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);

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

  const resolvedSlides = useMemo(() => slides.map((slide) => {
    if (slide.sourceType === "latest_video" && feed?.videos?.[0]) {
      const video = feed.videos[0];
      return {
        ...slide,
        title: video.title,
        description: video.description || "Assista ao conteúdo mais recente publicado no canal Jean na Estrada.",
        actionUrl: video.href,
        actionLabel: "Assistir no YouTube",
        imageUrl: `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`,
        external: true,
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
    return slide;
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

  if (!total) return null;
  const current = resolvedSlides[index];

  function move(direction: number) {
    setIndex((currentIndex) => (currentIndex + direction + total) % total);
  }

  return (
    <section
      className={`home-carousel ${current.imageUrl ? "home-carousel--with-image" : ""}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const end = event.changedTouches[0]?.clientX ?? touchStart.current;
        const distance = end - touchStart.current;
        if (Math.abs(distance) > 45) move(distance > 0 ? -1 : 1);
        touchStart.current = null;
      }}
      aria-roledescription="carrossel"
      aria-label="Destaques do JNE App"
    >
      <div className="home-carousel__background" aria-hidden="true">
        {current.imageUrl ? <img src={current.imageUrl} alt="" /> : null}
        <span />
      </div>

      <div className="home-carousel__content" key={current.id}>
        <span className="eyebrow"><Sparkles size={15} /> {current.badge}</span>
        <h1>{current.title}</h1>
        <p>{current.description}</p>
        <a
          className="button button--primary"
          href={current.actionUrl}
          target={current.external || isExternal(current.actionUrl) ? "_blank" : undefined}
          rel={current.external || isExternal(current.actionUrl) ? "noreferrer" : undefined}
        >
          {current.actionLabel}
          {current.external || isExternal(current.actionUrl) ? <ExternalLink size={16} /> : <ArrowRight size={17} />}
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
    </section>
  );
}
