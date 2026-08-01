"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Settings, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AccountChip } from "@/components/AccountChip";
import { SidebarAccountAction } from "@/components/SidebarAccountAction";
import { BrandLogo } from "@/components/BrandLogo";
import { GlobalSearch } from "@/components/GlobalSearch";
import { NotificationBell } from "@/components/NotificationBell";
import { ReservationAlertWatcher } from "@/components/ReservationAlertWatcher";
import { SitePageViewTracker } from "@/components/SitePageViewTracker";
import { ThemePicker } from "@/components/ThemePicker";
import { navigationGroups, primaryNavigation } from "@/data/navigation";

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = normalizePath(usePathname());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const mobileItems = useMemo(() => {
    const mobileHrefs = ["/", "/videos", "/comunidade", "/membros"];
    return primaryNavigation.filter((item) => mobileHrefs.includes(item.href));
  }, []);

  if (pathname.startsWith("/admin")) {
    return <div className="admin-mode-root">{children}</div>;
  }

  if (pathname.startsWith("/m/")) {
    return <><SitePageViewTracker /><div className="public-driver-shell">{children}</div></>;
  }

  return (
    <div className="app-shell">
      <SitePageViewTracker />
      <header className="topbar">
        <button className="icon-button topbar__menu-button" type="button" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}><Menu size={22} /></button>
        <Link href="/" className="topbar__brand-link"><BrandLogo /></Link>
        <ThemePicker />
        <div className="topbar__search"><GlobalSearch /></div>
        <div className="topbar__actions"><Link className="icon-button topbar__settings-button" href="/configuracoes" aria-label="Configurações do aplicativo"><Settings size={20} /></Link><NotificationBell /><AccountChip /></div>
      </header>

      <div className={`sidebar-backdrop ${menuOpen ? "is-visible" : ""}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <aside className={`sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="sidebar__mobile-header"><BrandLogo /><button className="icon-button" type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}><X size={20} /></button></div>
        <nav className="sidebar__navigation" aria-label="Navegação principal">
          {navigationGroups.map((group) => (
            <section className="sidebar__group" key={group.label}>
              <p className="sidebar__eyebrow">{group.label}</p>
              <div className="sidebar__group-links">
                {group.items.map((item) => {
                  const active = pathname === normalizePath(item.href);
                  const Icon = item.icon;
                  return <Link key={item.href} href={item.href} className={`sidebar-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={20} strokeWidth={1.9} /><span>{item.label}</span>{item.badge ? <small>{item.badge}</small> : null}</Link>;
                })}
              </div>
            </section>
          ))}
        </nav>
        <SidebarAccountAction />
        <p className="sidebar__version" suppressHydrationWarning>Versão 1.7.4</p>
      </aside>

      <ReservationAlertWatcher />
      <main className="app-main">{children}<footer className="global-footer"><span>© 2026 Jean na Estrada</span><nav aria-label="Documentos e informações"><Link href="/sobre">Sobre</Link><Link href="/termos">Termos</Link><Link href="/privacidade">Privacidade</Link><Link href="/seguranca-apks">Segurança de APKs</Link></nav></footer></main>

      <nav className="bottom-navigation" aria-label="Navegação mobile">
        {mobileItems.map((item) => { const active = pathname === normalizePath(item.href); const Icon = item.icon; return <Link key={item.href} href={item.href} className={`bottom-navigation__item ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={21} strokeWidth={active ? 2.3 : 1.8} /><span>{item.shortLabel ?? item.label}</span></Link>; })}
        <button className="bottom-navigation__item" type="button" onClick={() => setMenuOpen(true)}><Menu size={21} /><span>Menu</span></button>
      </nav>
    </div>
  );
}
