import type { Metadata } from "next";
import { Crown, LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/auth/actions";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Área de membros",
  description: "Perfil e conteúdos liberados para membros do JNE App.",
};

const roleLabels = {
  member: "Membro",
  vip: "Membro VIP",
  admin: "Administrador",
} as const;

export default async function MembersPage() {
  const { userId, email, profile } = await getAuthContext();

  if (!userId) {
    redirect("/entrar?next=/membros");
  }

  const role = profile?.role ?? "member";
  const displayName = profile?.full_name || email?.split("@")[0] || "Membro";

  return (
    <div className="page-stack">
      <PageHeader
        icon={<UserRound size={24} />}
        eyebrow="CONTA JNE"
        title={`Olá, ${displayName}`}
        description="Aqui você acompanha sua conta e acessa os conteúdos liberados para seu perfil."
      />

      {!profile ? (
        <div className="member-warning">
          <ShieldCheck size={20} />
          <div>
            <strong>Perfil ainda não sincronizado</strong>
            <p>Execute o arquivo SQL da versão 0.6.0 no Supabase para criar a tabela de perfis.</p>
          </div>
        </div>
      ) : null}

      <section className="member-dashboard">
        <article className="member-profile-card">
          <div className="member-avatar">{displayName.slice(0, 2).toUpperCase()}</div>
          <div>
            <span className={`role-badge role-badge--${role}`}>{roleLabels[role]}</span>
            <h2>{displayName}</h2>
            <p>{email}</p>
          </div>
        </article>

        <article className="member-action-card">
          <Crown size={24} />
          <div>
            <h2>Área VIP</h2>
            <p>
              {role === "vip" || role === "admin"
                ? "Seu perfil possui acesso aos conteúdos exclusivos."
                : "O acesso VIP depende de convite ou liberação administrativa."}
            </p>
          </div>
          <Link className="button button--primary" href="/vip">
            Abrir área VIP
          </Link>
        </article>

        <article className="member-action-card">
          <ShieldCheck size={24} />
          <div>
            <h2>Conta protegida</h2>
            <p>Sua sessão é mantida por cookies seguros e validada pelo servidor.</p>
          </div>
          <Link className="button button--secondary" href="/atualizar-senha">
            Alterar senha
          </Link>
        </article>
      </section>

      <form action={logoutAction}>
        <button className="button button--secondary" type="submit">
          <LogOut size={18} />
          Sair da conta
        </button>
      </form>
    </div>
  );
}
