"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AccountChip() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setEmail(session?.user.email ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) {
    return <span className="profile-chip profile-chip--loading" aria-label="Verificando conta" />;
  }

  if (!email) {
    return (
      <Link className="profile-chip profile-chip--guest" href="/entrar" aria-label="Entrar na conta">
        <LogIn size={18} />
        <div>
          <strong>Entrar</strong>
          <small>Área de membros</small>
        </div>
      </Link>
    );
  }

  const initials = email.slice(0, 2).toUpperCase();

  return (
    <Link className="profile-chip" href="/membros" aria-label="Abrir área de membros">
      <span>{initials}</span>
      <div>
        <strong>Minha conta</strong>
        <small>Conta ativa</small>
      </div>
    </Link>
  );
}
