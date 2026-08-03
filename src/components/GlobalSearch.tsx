"use client";

import { ExternalLink, Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  applications,
  beginnerGuide,
  partners,
  products,
  tutorials,
  videos,
} from "@/data/content";
import { primaryNavigation } from "@/data/navigation";
import { publicPath } from "@/lib/public-path";
import type { LiveContentFeed } from "@/types/live-content";

type SearchItem = {
  title: string;
  description: string;
  href: string;
  category: string;
  external?: boolean;
  keywords?: string;
};

type SearchApiResponse = {
  items?: SearchItem[];
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function queryTokens(value: string) {
  return normalize(value).split(" ").filter(Boolean);
}

const staticItems: SearchItem[] = [
  ...primaryNavigation.map((item) => ({
    title: item.label,
    description: `Abrir a área ${item.label} do JNE App.`,
    href: item.href,
    category: "Página",
  })),
  ...tutorials.map((item) => ({
    title: item.title,
    description: item.description,
    href: "/tutoriais",
    category: "Tutorial",
  })),
  ...applications.map((item) => ({
    title: item.name,
    description: `${item.description} ${item.compatibility}`,
    href: `/aplicativos?busca=${encodeURIComponent(item.name)}`,
    category: "Aplicativo",
  })),
  ...products.map((item) => ({
    title: item.name,
    description: `${item.description} ${item.category}`,
    href: item.href,
    category: "Produto",
    external: true,
  })),
  ...partners.map((item) => ({
    title: item.name,
    description: `${item.description} ${item.services.join(" ")}`,
    href: "/parceiros",
    category: "Parceiro",
  })),
  ...beginnerGuide.map((item) => ({
    title: item.title,
    description: `${item.description} ${item.points.join(" ")}`,
    href: "/guia",
    category: "Guia",
  })),
  ...videos.map((item) => ({
    title: item.title,
    description: item.description,
    href: item.href,
    category: "Vídeo",
    external: true,
  })),
];

export function GlobalSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [feed, setFeed] = useState<LiveContentFeed | null>(null);
  const [catalogItems, setCatalogItems] = useState<SearchItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pathname]);

  useEffect(() => {
    if (!open || feed) return;

    void fetch(publicPath("/data/content-feed.json"), { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<LiveContentFeed>;
      })
      .then(setFeed)
      .catch(() => setFeed(null));
  }, [feed, open]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setCatalogLoading(true);

    void fetch(`/api/search?refresh=${Date.now()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<SearchApiResponse>;
      })
      .then((data) => setCatalogItems(Array.isArray(data.items) ? data.items : []))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCatalogItems([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false);
      });

    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const timeout = window.setTimeout(() => inputRef.current?.focus(), 40);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timeout);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const results = useMemo(() => {
    const liveItems: SearchItem[] = [
      ...(feed?.videos ?? []).map((item) => ({
        title: item.title,
        description: item.description,
        href: item.href,
        category: "Vídeo recente",
        external: true,
      })),
      ...(feed?.news ?? []).map((item) => ({
        title: item.title,
        description: `${item.source} — ${item.description}`,
        href: item.href,
        category: "Notícia",
        external: true,
      })),
    ];

    const deduped = new Map<string, SearchItem>();
    [...catalogItems, ...liveItems, ...staticItems].forEach((item) => {
      deduped.set(`${item.category}:${item.title}:${item.href}`, item);
    });

    const normalizedQuery = normalize(query.trim());
    const tokens = queryTokens(query);
    const all = Array.from(deduped.values());

    if (!normalizedQuery) {
      return all
        .filter((item) => ["Página", "Manual", "Aplicativo", "Tutorial"].includes(item.category))
        .slice(0, 9);
    }

    return all
      .map((item) => {
        const title = normalize(item.title);
        const description = normalize(item.description);
        const category = normalize(item.category);
        const keywords = normalize(item.keywords ?? "");
        const haystack = `${title} ${description} ${category} ${keywords}`;
        const matchesAllTokens = tokens.every((token) => haystack.includes(token));
        let score = matchesAllTokens ? 1 : 0;
        if (title === normalizedQuery) score += 12;
        if (title.startsWith(normalizedQuery)) score += 7;
        if (title.includes(normalizedQuery)) score += 5;
        if (keywords.includes(normalizedQuery)) score += 4;
        if (category.includes(normalizedQuery)) score += 2;
        if (description.includes(normalizedQuery)) score += 1;
        score += tokens.filter((token) => title.includes(token)).length * 2;
        score += tokens.filter((token) => keywords.includes(token)).length;
        return { item, score };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, "pt-BR"))
      .slice(0, 20)
      .map((result) => result.item);
  }, [catalogItems, feed, query]);

  function openSearch() {
    setOpen(true);
  }

  function selectItem(item: SearchItem) {
    setOpen(false);

    if (item.external) {
      window.open(item.href, "_blank", "noopener,noreferrer");
      return;
    }

    router.push(item.href);
  }

  return (
    <>
      <button className="search-box global-search__desktop-trigger" type="button" onClick={openSearch} aria-label="Pesquisar no JNE App">
        <Search size={18} />
        <span>Pesquisar no JNE App</span>
        <kbd>Ctrl K</kbd>
      </button>

      <button
        className="global-search__mobile-trigger"
        type="button"
        onClick={openSearch}
        aria-label="Pesquisar no JNE App"
        aria-expanded={open}
      >
        <Search size={17} />
        <span>Pesquisar no JNE App</span>
      </button>

      {portalReady && open
        ? createPortal(
            <div
              className="search-overlay"
              role="presentation"
              onPointerDown={() => setOpen(false)}
            >
              <section
                className="search-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Pesquisa global"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <div className="search-dialog__input">
                  <Search size={20} />
                  <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Veículo, manual, aplicativo, vídeo..."
                    aria-label="Digite sua pesquisa"
                  />
                  <button type="button" onClick={() => setOpen(false)} aria-label="Fechar pesquisa">
                    <X size={19} />
                  </button>
                </div>

                <div className="search-dialog__heading" aria-live="polite">
                  <span>{query.trim() ? `Resultados para “${query.trim()}”` : "Acessos rápidos"}</span>
                  <small>{catalogLoading ? "Atualizando…" : `${results.length} encontrados`}</small>
                </div>

                <div className="search-results">
                  {results.length ? results.map((item) => (
                    <button type="button" className="search-result" onClick={() => selectItem(item)} key={`${item.category}-${item.title}-${item.href}`}>
                      <span>{item.category}</span>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                      </div>
                      {item.external ? <ExternalLink size={16} /> : null}
                    </button>
                  )) : (
                    <div className="search-empty">
                      <Search size={25} />
                      <strong>Nenhum resultado encontrado.</strong>
                      <p>Tente pesquisar por veículo, manual, aplicativo, tutorial ou parceiro.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
