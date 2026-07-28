"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search, Settings, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemePicker } from "@/components/ThemePicker";
import { primaryNavigation } from "@/data/navigation";

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = normalizePath(usePathname());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const mobileItems = useMemo(() => {
    const mobileHrefs = ["/", "/videos", "/aplicativos", "/membros"];
    return primaryNavigation.filter((item) => mobileHrefs.includes(item.href));
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="icon-button topbar__menu-button"
          type="button"
          aria-label="Abrir menu"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={22} />
        </button>

        <Link href="/" className="topbar__brand-link">
          <BrandLogo />
        </Link>

        <ThemePicker />

        <div className="topbar__actions">
          <label className="search-box" title="A busca será ativada em uma próxima etapa">
            <Search size={18} />
            <input
              type="search"
              placeholder="Busca em breve"
              aria-label="Busca em desenvolvimento"
              disabled
            />
          </label>

          <Link className="icon-button" href="/configuracoes" aria-label="Configurações do aplicativo">
            <Settings size={20} />
          </Link>

          <button className="icon-button" type="button" aria-label="Notificações em desenvolvimento" disabled>
            <Bell size={20} />
            <span className="notification-dot" />
          </button>

          <Link className="profile-chip" href="/membros" aria-label="Área de membros">
            <span>JV</span>
            <div>
              <strong>Jean</strong>
              <small>Administrador</small>
            </div>
          </Link>
        </div>
      </header>

      <div
        className={`sidebar-backdrop ${menuOpen ? "is-visible" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="sidebar__mobile-header">
          <BrandLogo />
          <button
            className="icon-button"
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar__navigation" aria-label="Navegação principal">
          <p className="sidebar__eyebrow">Explorar</p>
          {primaryNavigation.map((item) => {
            const active = pathname === normalizePath(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${active ? "is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={20} strokeWidth={1.9} />
                <span>{item.label}</span>
                {item.badge ? <small>{item.badge}</small> : null}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar__card">
          <span className="sidebar__card-badge">JNE APP 2.0</span>
          <strong>Uma plataforma feita para crescer.</strong>
          <p>Vídeos, tutoriais, aplicativos, parceiros e área VIP em um só lugar.</p>
        </div>

        <p className="sidebar__version">Versão de desenvolvimento 0.4.0</p>
      </aside>

      <main className="app-main">{children}</main>

      <nav className="bottom-navigation" aria-label="Navegação mobile">
        {mobileItems.map((item) => {
          const active = pathname === normalizePath(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-navigation__item ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={21} strokeWidth={active ? 2.3 : 1.8} />
              <span>{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}

        <button
          className="bottom-navigation__item"
          type="button"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={21} />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}
