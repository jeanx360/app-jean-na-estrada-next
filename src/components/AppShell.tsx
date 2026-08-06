"use client";

import { APP_VERSION } from "@/lib/app-version";

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
import { SmartBackButton } from "@/components/SmartBackButton";
import { ThemePicker } from "@/components/ThemePicker";
import { navigationGroups, primaryNavigation } from "@/data/navigation";


const CONTEXT_BACK_FALLBACKS: Record<string, { href: string; label?: string }> = {
  "/comecar": { href: "/", label: "Voltar" },
  "/perfil": { href: "/membros", label: "Voltar para a conta" },
  "/atualizar-senha": { href: "/perfil", label: "Voltar ao perfil" },
  "/configuracoes": { href: "/membros", label: "Voltar" },
  "/instalar": { href: "/comecar", label: "Voltar" },
  "/suporte": { href: "/", label: "Voltar" },
  "/aceite": { href: "/membros", label: "Voltar" },
  "/notificacoes": { href: "/membros", label: "Voltar" },
  "/vip": { href: "/membros", label: "Voltar" },
  "/assinar": { href: "/planos", label: "Voltar aos planos" },
  "/contato": { href: "/", label: "Voltar" },
  "/diagnostico": { href: "/configuracoes", label: "Voltar" },
  "/seguranca-apks": { href: "/catalogo?tipo=aplicativos", label: "Voltar aos aplicativos" },
  "/termos": { href: "/", label: "Voltar" },
  "/privacidade": { href: "/", label: "Voltar" },
  "/sobre": { href: "/", label: "Voltar" },
  "/planos": { href: "/", label: "Voltar" },
  "/catalogo": { href: "/", label: "Voltar" },
  "/aplicativos": { href: "/catalogo", label: "Voltar ao catálogo" },
  "/produtos": { href: "/catalogo", label: "Voltar ao catálogo" },
  "/calculadora": { href: "/", label: "Voltar" },
  "/motorista/calculadora": { href: "/motorista", label: "Voltar ao painel" },
  "/motorista/configuracoes": { href: "/motorista", label: "Voltar ao painel" },
  "/motorista/financeiro": { href: "/motorista", label: "Voltar ao painel" },
  "/motorista/financeiro/nova": { href: "/motorista/financeiro", label: "Voltar ao financeiro" },
  "/motorista/notificacoes": { href: "/motorista", label: "Voltar ao painel" },
  "/motorista/orcamentos": { href: "/motorista", label: "Voltar ao painel" },
};

const CURRENT_PATH_KEY = "jne-current-path";
const PREVIOUS_PATH_KEY = "jne-previous-path";

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = normalizePath(usePathname());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    try {
      const currentPath = window.sessionStorage.getItem(CURRENT_PATH_KEY);
      if (currentPath && currentPath !== pathname) {
        window.sessionStorage.setItem(PREVIOUS_PATH_KEY, currentPath);
      }
      window.sessionStorage.setItem(CURRENT_PATH_KEY, pathname);
    } catch {
      // A navegação continua com o fallback mesmo quando o storage está bloqueado.
    }
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const contextBack = CONTEXT_BACK_FALLBACKS[pathname];

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
        <p className="sidebar__version" suppressHydrationWarning>Versão {APP_VERSION}</p>
      </aside>

      <ReservationAlertWatcher />
      <main className="app-main">
        {contextBack ? (
          <div className="context-back-row">
            <SmartBackButton fallbackHref={contextBack.href} label={contextBack.label} />
          </div>
        ) : null}
        {children}
        <footer className="global-footer">
          <div>
            <strong>JNE App</strong>
            <span>© 2026 Jean na Estrada · Versão {APP_VERSION}</span>
          </div>
          <nav aria-label="Documentos, suporte e informações">
            <Link href="/comecar">Comece aqui</Link>
            <Link href="/planos">Planos</Link>
            <Link href="/motoristas">Motoristas</Link>
            <Link href="/instalar">Instalar</Link>
            <Link href="/suporte">Ajuda</Link>
            <Link href="/sobre">Sobre</Link>
            <Link href="/termos">Termos</Link>
            <Link href="/privacidade">Privacidade</Link>
          </nav>
        </footer>
      </main>

      <nav className="bottom-navigation" aria-label="Navegação mobile">
        {mobileItems.map((item) => { const active = pathname === normalizePath(item.href); const Icon = item.icon; return <Link key={item.href} href={item.href} className={`bottom-navigation__item ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={21} strokeWidth={active ? 2.3 : 1.8} /><span>{item.shortLabel ?? item.label}</span></Link>; })}
        <button className="bottom-navigation__item" type="button" onClick={() => setMenuOpen(true)}><Menu size={21} /><span>Menu</span></button>
      </nav>
    </div>
  );
}
