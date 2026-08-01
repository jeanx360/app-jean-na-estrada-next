"use client";

import Link from "next/link";
import { CalendarClock, ChevronDown, Crown, LogIn, LogOut, Settings, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { logoutAction } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";
import type { MemberRole } from "@/types/auth";

type AccountState = {
  email: string;
  name: string | null;
  avatar: string | null;
  role: MemberRole;
  isBlocked: boolean;
  vipExpiresAt: string | null;
};

const roleLabels: Record<MemberRole, string> = {
  member: "Plano gratuito",
  vip: "VIP",
  admin: "Administrador",
};

export function AccountChip() {
  const supabase = useMemo(() => createClient(), []);
  const menuRef = useRef<HTMLDivElement>(null);
  const [account, setAccount] = useState<AccountState | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!mounted) return;
      if (!user?.email) {
        setAccount(null);
        setLoading(false);
        setMenuOpen(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, role, is_blocked")
        .eq("id", user.id)
        .maybeSingle();
      if (!mounted) return;

      const role = (profile?.role ?? "member") as MemberRole;
      let vipExpiresAt: string | null = null;

      if (role === "vip") {
        const { data: entitlement } = await supabase
          .from("vip_entitlements")
          .select("expires_at")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        vipExpiresAt = entitlement?.expires_at ?? null;
      }

      if (!mounted) return;
      setAccount({
        email: user.email,
        name: profile?.full_name ?? null,
        avatar: profile?.avatar_url ?? null,
        role,
        isBlocked: Boolean(profile?.is_blocked),
        vipExpiresAt,
      });
      setLoading(false);
    }

    void load();
    const { data: listener } = supabase.auth.onAuthStateChange(() => void load());
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  if (loading) return <span className="profile-chip profile-chip--loading" aria-label="Verificando conta" />;
  if (!account) {
    return (
      <Link className="profile-chip profile-chip--guest" href="/entrar" aria-label="Entrar na conta">
        <LogIn size={18} /><div><strong>Entrar</strong><small>Plano gratuito</small></div>
      </Link>
    );
  }

  const initials = (account.name || account.email).slice(0, 2).toUpperCase();
  const statusLabel = account.isBlocked ? "Conta bloqueada" : roleLabels[account.role];
  const formattedExpiry = account.vipExpiresAt
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(account.vipExpiresAt))
    : null;

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        className="profile-chip profile-chip--button"
        type="button"
        aria-label={`Abrir menu da conta. Status: ${statusLabel}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <span className={account.avatar ? "profile-chip__avatar profile-chip__avatar--image" : "profile-chip__avatar"}>
          {account.avatar ? <img src={account.avatar} alt="" /> : initials}
        </span>
        <div><strong>{account.name || "Minha conta"}</strong><small className={`account-status account-status--${account.role}`}>{account.role === "vip" ? "👑 " : ""}{statusLabel}</small></div>
        <ChevronDown className={`profile-chip__chevron ${menuOpen ? "is-open" : ""}`} size={15} />
      </button>

      {menuOpen ? (
        <div className="profile-menu__dropdown" role="menu">
          <div className="profile-menu__identity">
            <strong>{account.name || "Minha conta"}</strong>
            <small>{account.email}</small>
            <span className={`profile-menu__status profile-menu__status--${account.role}`}>
              {account.role === "vip" ? <Crown size={13} /> : null}{statusLabel}
            </span>
            {account.role === "vip" ? (
              <small className="profile-menu__validity"><CalendarClock size={13} /> {formattedExpiry ? `Válido até ${formattedExpiry}` : "Sem data de expiração"}</small>
            ) : null}
          </div>
          <Link href="/perfil" role="menuitem" onClick={() => setMenuOpen(false)}>
            <UserRound size={17} /><span>Perfil</span>
          </Link>
          <Link href="/configuracoes" role="menuitem" onClick={() => setMenuOpen(false)}>
            <Settings size={17} /><span>Configurações</span>
          </Link>
          <Link href="/vip" role="menuitem" onClick={() => setMenuOpen(false)}>
            <Crown size={17} /><span>{account.role === "member" ? "Conhecer o VIP" : "Área VIP e assinatura"}</span>
          </Link>
          <form action={logoutAction}>
            <button type="submit" role="menuitem">
              <LogOut size={17} /><span>Sair da conta</span>
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
