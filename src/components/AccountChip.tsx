"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AccountChip() {
  const supabase = useMemo(() => createClient(), []);
  const [account, setAccount] = useState<{ email: string; name: string | null; avatar: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!mounted) return;
      if (!user?.email) {
        setAccount(null);
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (!mounted) return;
      setAccount({ email: user.email, name: profile?.full_name ?? null, avatar: profile?.avatar_url ?? null });
      setLoading(false);
    }

    void load();
    const { data: listener } = supabase.auth.onAuthStateChange(() => void load());
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [supabase]);

  if (loading) return <span className="profile-chip profile-chip--loading" aria-label="Verificando conta" />;
  if (!account) {
    return (
      <Link className="profile-chip profile-chip--guest" href="/entrar" aria-label="Entrar na conta">
        <LogIn size={18} /><div><strong>Entrar</strong><small>Área de membros</small></div>
      </Link>
    );
  }

  const initials = (account.name || account.email).slice(0, 2).toUpperCase();
  return (
    <Link className="profile-chip" href="/perfil" aria-label="Abrir perfil">
      <span className={account.avatar ? "profile-chip__avatar profile-chip__avatar--image" : "profile-chip__avatar"}>
        {account.avatar ? <img src={account.avatar} alt="" /> : initials}
      </span>
      <div><strong>{account.name || "Minha conta"}</strong><small>Perfil e segurança</small></div>
    </Link>
  );
}
