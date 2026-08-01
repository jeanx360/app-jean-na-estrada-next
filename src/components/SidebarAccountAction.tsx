"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { logoutAction } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";

export function SidebarAccountAction() {
  const supabase = useMemo(() => createClient(), []);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase.auth.getUser();
      if (mounted) setAuthenticated(Boolean(data.user));
    }

    void load();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setAuthenticated(Boolean(session?.user));
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  if (authenticated === null) return <div className="sidebar__account-zone sidebar__account-zone--loading" aria-hidden="true" />;

  if (!authenticated) {
    return (
      <div className="sidebar__account-zone">
        <Link className="sidebar-link sidebar-link--account" href="/entrar">
          <LogIn size={20} strokeWidth={1.9} /><span>Entrar</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="sidebar__account-zone">
      <form action={logoutAction}>
        <button className="sidebar-link sidebar-link--logout" type="submit">
          <LogOut size={20} strokeWidth={1.9} /><span>Sair</span>
        </button>
      </form>
    </div>
  );
}
