"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu, Search, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ThemePicker } from "@/components/ThemePicker";
import { SmartBackButton } from "@/components/SmartBackButton";
import {
  adminNavigationGroups,
  getAdminNavigationItem,
} from "@/data/admin-navigation";
import { APP_VERSION } from "@/lib/app-version";

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = normalizePath(usePathname());
  const activeItem = getAdminNavigationItem(pathname);
  const ActiveIcon = activeItem.icon;
  const [menuOpen, setMenuOpen] = useState(false);
  const [navigationQuery, setNavigationQuery] = useState("");

  const visibleGroups = useMemo(() => {
    const query = normalizeSearch(navigationQuery);
    if (!query) return adminNavigationGroups;

    return adminNavigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => normalizeSearch([
          item.label,
          item.shortLabel,
          item.description,
          ...(item.keywords ?? []),
        ].join(" ")).includes(query)),
      }))
      .filter((group) => group.items.length > 0);
  }, [navigationQuery]);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <div className="admin-shell">
      <div
        className={`admin-shell__backdrop ${menuOpen ? "is-visible" : ""}`}
        aria-hidden="true"
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`admin-sidebar ${menuOpen ? "is-open" : ""}`}>
        <header className="admin-sidebar__header">
          <Link href="/admin" className="admin-sidebar__brand" aria-label="Painel executivo da administração">
            <span><ShieldCheck size={24} /></span>
            <div>
              <strong>JNE Admin</strong>
              <small>Central de controle</small>
            </div>
          </Link>
          <button className="admin-sidebar__close" type="button" aria-label="Fechar menu administrativo" onClick={() => setMenuOpen(false)}>
            <X size={20} />
          </button>
        </header>

        <div className="admin-sidebar__finder">
          <Search size={17} />
          <input
            type="search"
            value={navigationQuery}
            onChange={(event) => setNavigationQuery(event.target.value)}
            placeholder="Buscar recurso"
            aria-label="Buscar recurso administrativo"
          />
          {navigationQuery ? (
            <button type="button" aria-label="Limpar busca" onClick={() => setNavigationQuery("")}><X size={15} /></button>
          ) : null}
        </div>

        <nav className="admin-sidebar__navigation" aria-label="Navegação administrativa">
          {visibleGroups.map((group) => (
            <section className="admin-sidebar__group" key={group.label}>
              <p>{group.label}</p>
              <div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
                  return (
                    <Link
                      className={`admin-sidebar__link ${active ? "is-active" : ""}`}
                      href={item.href}
                      key={item.href}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon size={20} strokeWidth={active ? 2.25 : 1.8} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

          {!visibleGroups.length ? (
            <div className="admin-sidebar__empty">
              <Search size={22} />
              <strong>Nenhum recurso encontrado</strong>
              <small>Tente outro termo.</small>
            </div>
          ) : null}
        </nav>

        <footer className="admin-sidebar__footer">
          <Link href="/">
            <ArrowLeft size={18} />
            <span>Voltar ao JNE App</span>
          </Link>
          <small>Modo administrador · v{APP_VERSION}</small>
        </footer>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar__start">
            <button className="admin-topbar__menu" type="button" aria-label="Abrir menu administrativo" onClick={() => setMenuOpen(true)}>
              <Menu size={21} />
            </button>
            <SmartBackButton
              className="admin-topbar__back"
              fallbackHref="/"
              label="Voltar"
            />
            <div className="admin-topbar__title">
              <small>ADMINISTRAÇÃO JNE</small>
              <strong>{activeItem.shortLabel}</strong>
            </div>
          </div>
          <div className="admin-topbar__end">
            <ThemePicker />
            <span className="admin-topbar__status"><ShieldCheck size={15} /> Administrador</span>
          </div>
        </header>

        <main className="admin-workspace__main">
          <header className="admin-page-intro">
            <div className="admin-page-intro__icon"><ActiveIcon size={25} /></div>
            <div>
              <span>{activeItem.label}</span>
              <h1>{activeItem.shortLabel}</h1>
              <p>{activeItem.description}</p>
            </div>
          </header>
          <div className="admin-workspace__content">{children}</div>
        </main>
      </section>
    </div>
  );
}
