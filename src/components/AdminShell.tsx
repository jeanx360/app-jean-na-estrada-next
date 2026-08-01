"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemePicker } from "@/components/ThemePicker";
import {
  adminNavigationGroups,
  getAdminNavigationItem,
} from "@/data/admin-navigation";

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = normalizePath(usePathname());
  const activeItem = getAdminNavigationItem(pathname);
  const ActiveIcon = activeItem.icon;
  const [menuOpen, setMenuOpen] = useState(false);

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
          <Link href="/admin" className="admin-sidebar__brand" aria-label="Página inicial da administração">
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

        <nav className="admin-sidebar__navigation" aria-label="Navegação administrativa">
          {adminNavigationGroups.map((group) => (
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
        </nav>

        <footer className="admin-sidebar__footer">
          <Link href="/">
            <ArrowLeft size={18} />
            <span>Voltar ao JNE App</span>
          </Link>
          <small>Modo administrador · v1.7.3</small>
        </footer>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar__start">
            <button className="admin-topbar__menu" type="button" aria-label="Abrir menu administrativo" onClick={() => setMenuOpen(true)}>
              <Menu size={21} />
            </button>
            <Link className="admin-topbar__back" href="/" aria-label="Voltar ao JNE App">
              <ArrowLeft size={19} />
              <span>Voltar</span>
            </Link>
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
