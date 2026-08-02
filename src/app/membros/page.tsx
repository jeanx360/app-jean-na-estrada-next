import type { Metadata } from "next";
import { CalendarClock, Crown, KeyRound, Layers3, LogOut, Megaphone, ShieldAlert, ShieldCheck, UserRound, Wrench } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/auth/actions";
import { PageHeader } from "@/components/PageHeader";
import { RedeemInviteForm } from "@/components/RedeemInviteForm";
import { getAuthContext } from "@/lib/auth";
import { ACCOUNT_STATUS_LABELS, getAccountPlan } from "@/lib/account-plan";
import { getLegalAcceptanceStatus } from "@/lib/legal";
import { formatBrazilDate } from "@/lib/date-time";

export const metadata: Metadata = {
  title: "Área de membros",
  description: "Perfil, recados, assinatura e conteúdos liberados para membros do JNE App.",
};

const roleLabels = {
  member: "Membro",
  vip: "Membro VIP",
  admin: "Administrador",
} as const;

type Announcement = {
  id: string;
  title: string;
  message: string;
  audience: string;
  published_at: string;
};

type VipEntitlement = {
  source: "admin" | "invite" | "youtube" | "partner" | "subscription" | "legacy";
  label: string | null;
  expires_at: string | null;
};

const sourceLabels: Record<VipEntitlement["source"], string> = {
  admin: "Liberação manual",
  invite: "Convite VIP",
  youtube: "Membro do YouTube",
  partner: "Parceiro",
  subscription: "Assinatura direta",
  legacy: "Acesso anterior",
};

export default async function MembersPage() {
  const { userId, email, profile, supabase } = await getAuthContext();

  if (!userId) redirect("/entrar?next=/membros");

  const legal = await getLegalAcceptanceStatus(supabase, userId);
  if (!legal.complete) redirect("/aceite?next=/membros");

  const role = profile?.role ?? "member";
  const displayName = profile?.full_name || email?.split("@")[0] || "Membro";

  if (profile?.is_blocked) {
    return (
      <div className="page-stack">
        <PageHeader icon={<ShieldAlert size={24} />} eyebrow="CONTA RESTRITA" title="Acesso bloqueado" description="Sua conta está autenticada, mas o acesso às áreas de membros foi suspenso." />
        <section className="vip-locked-card">
          <ShieldAlert size={38} />
          <h2>Esta conta foi bloqueada</h2>
          <p>{profile.blocked_reason || "Entre em contato com a administração do JNE App para verificar a situação."}</p>
          <form action={logoutAction}><button className="button button--secondary" type="submit"><LogOut size={18} /> Sair da conta</button></form>
        </section>
      </div>
    );
  }

  const [{ data: announcementsData }, { data: entitlementData }] = await Promise.all([
    supabase.from("announcements").select("id, title, message, audience, published_at").order("published_at", { ascending: false }).limit(10),
    supabase
      .from("vip_entitlements")
      .select("source, label, expires_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const announcements = (announcementsData ?? []) as Announcement[];
  const entitlement = entitlementData as VipEntitlement | null;
  const accountPlan = await getAccountPlan(supabase, userId as string, role);

  return (
    <div className="page-stack">
      <PageHeader icon={<UserRound size={24} />} eyebrow="CONTA JNE" title={`Olá, ${displayName}`} description="Acompanhe sua conta, validade do VIP, pagamentos e comunicados da comunidade." />

      {!profile ? (
        <div className="member-warning"><ShieldCheck size={20} /><div><strong>Perfil ainda não sincronizado</strong><p>Execute os arquivos SQL do Supabase para criar e atualizar a tabela de perfis.</p></div></div>
      ) : null}

      <section className="member-dashboard">
        <article className="member-profile-card">
          <div className="member-avatar">{displayName.slice(0, 2).toUpperCase()}</div>
          <div><span className={`role-badge role-badge--${role}`}>{roleLabels[role]}</span><h2>{displayName}</h2><p>{email}</p></div>
        </article>

        <article className={`member-action-card member-plan-card member-plan-card--${accountPlan.code}`}>
          <Layers3 size={24} />
          <div>
            <h2>Plano {accountPlan.name}</h2>
            <p>{accountPlan.status in ACCOUNT_STATUS_LABELS ? ACCOUNT_STATUS_LABELS[accountPlan.status as keyof typeof ACCOUNT_STATUS_LABELS] : "Ativo"} · {accountPlan.features.length} recursos liberados.</p>
            {accountPlan.trialEndsAt ? <small className="member-vip-validity"><CalendarClock size={14} /> Teste até {formatBrazilDate(accountPlan.trialEndsAt)}</small> : null}
            {!accountPlan.trialEndsAt && accountPlan.expiresAt ? <small className="member-vip-validity"><CalendarClock size={14} /> Válido até {formatBrazilDate(accountPlan.expiresAt)}</small> : null}
          </div>
          <Link className="button button--primary" href="/planos">Comparar planos</Link>
        </article>

        <article className="member-action-card">
          <Crown size={24} />
          <div>
            <h2>Área VIP</h2>
            <p>{role === "vip" || role === "admin" ? "Seu perfil possui acesso aos conteúdos exclusivos." : "Assine o plano, use um convite ou aguarde a liberação administrativa."}</p>
            {entitlement ? (
              <small className="member-vip-validity"><CalendarClock size={14} /> {sourceLabels[entitlement.source]} · {entitlement.expires_at ? `até ${formatBrazilDate(entitlement.expires_at)}` : "sem validade"}</small>
            ) : null}
          </div>
          <Link className="button button--primary" href="/vip">{role === "member" ? "Conhecer e assinar" : "Abrir área VIP"}</Link>
        </article>


        <article className="member-action-card">
          <ShieldCheck size={24} />
          <div><h2>Conta protegida</h2><p>Sua sessão é mantida por cookies seguros e validada pelo servidor.</p></div>
          <div className="member-button-row"><Link className="button button--secondary" href="/perfil">Editar perfil</Link><Link className="button button--secondary" href="/atualizar-senha">Alterar senha</Link></div>
        </article>

        {role === "admin" ? (
          <article className="member-action-card member-action-card--admin">
            <Wrench size={24} />
            <div><h2>Painel administrativo</h2><p>Gerencie membros, validade do VIP, pagamentos, conteúdos e arquivos privados.</p></div>
            <Link className="button button--primary" href="/admin">Abrir painel</Link>
          </article>
        ) : null}
      </section>

      {role === "member" ? (
        <section className="member-invite-card">
          <div><KeyRound size={24} /><div><span>CONVITE VIP</span><h2>Recebeu um código de acesso?</h2><p>Digite o convite exatamente como recebeu para liberar sua conta.</p></div></div>
          <RedeemInviteForm />
        </section>
      ) : null}

      <section className="member-announcements">
        <div className="member-announcements__heading"><Megaphone size={22} /><div><span>COMUNICADOS</span><h2>Recados para você</h2></div></div>
        <div className="member-announcements__list">
          {announcements.map((item) => (
            <article key={item.id}>
              <div><span>{item.audience === "vip" ? "VIP" : item.audience === "admin" ? "ADMIN" : "JNE APP"}</span><small>{formatBrazilDate(item.published_at)}</small></div>
              <h3>{item.title}</h3><p>{item.message}</p>
            </article>
          ))}
          {!announcements.length ? <article className="member-announcements__empty"><Megaphone size={26} /><h3>Nenhum recado novo</h3><p>Os comunicados publicados aparecerão aqui.</p></article> : null}
        </div>
      </section>

      <form action={logoutAction}><button className="button button--secondary" type="submit"><LogOut size={18} /> Sair da conta</button></form>
    </div>
  );
}
