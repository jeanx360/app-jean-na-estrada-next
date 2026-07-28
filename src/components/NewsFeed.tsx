"use client";

import { CalendarDays, ExternalLink, Newspaper, RefreshCw, SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { publicPath } from "@/lib/public-path";
import type { LiveContentFeed, SyncedNewsItem } from "@/types/live-content";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function NewsFeed() {
  const [feed, setFeed] = useState<LiveContentFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("Todas");

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

  const sources = useMemo(() => {
    const values = new Set((feed?.news ?? []).map((item) => item.source));
    return ["Todas", ...Array.from(values)];
  }, [feed]);

  const items = useMemo<SyncedNewsItem[]>(() => {
    const news = feed?.news ?? [];
    return source === "Todas" ? news : news.filter((item) => item.source === source);
  }, [feed, source]);

  if (loading) {
    return (
      <div className="feed-state">
        <RefreshCw size={25} className="is-spinning" />
        <strong>Atualizando notícias...</strong>
        <p>Consultando as fontes selecionadas pelo JNE App.</p>
      </div>
    );
  }

  if (!feed || feed.news.length === 0) {
    return (
      <div className="feed-state">
        <SearchX size={27} />
        <strong>A sincronização ainda não trouxe notícias.</strong>
        <p>O aplicativo continuará funcionando e tentará novamente no próximo ciclo automático.</p>
      </div>
    );
  }

  return (
    <div className="news-feed">
      <div className="news-feed__toolbar">
        <div>
          <Newspaper size={19} />
          <span><strong>{feed.news.length}</strong> notícias recentes</span>
        </div>
        <label>
          <span>Fonte</span>
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            {sources.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="news-grid">
        {items.map((item) => (
          <a className="news-card" href={item.href} target="_blank" rel="noreferrer" key={item.href}>
            <div className="news-card__media">
              {item.image ? (
                <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" />
              ) : (
                <span><Newspaper size={30} /></span>
              )}
            </div>
            <div className="news-card__body">
              <div className="news-card__meta">
                <span>{item.source}</span>
                <small><CalendarDays size={13} /> {formatDate(item.publishedAt)}</small>
              </div>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <strong>Ler notícia completa <ExternalLink size={14} /></strong>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
