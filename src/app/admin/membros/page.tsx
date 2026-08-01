import type { Metadata } from "next";
import { Ban, CalendarClock, CheckCircle2, Crown, ShieldCheck, Trash2, UserCog, UsersRound, XCircle } from "lucide-react";
import {
  deleteMemberAccountAction,
  grantVipAccessAction,
  revokeVipAccessAction,
  setMemberAdminAction,
  setMemberBlockedAction,
} from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { requireAdmin } from "@/lib/admin";
import type { MemberRole } from "@/types/auth";
import { formatBrazilDate } from "@/lib/date-time";

export const metadata: Metadata = { title: "Gerenciar membros" };

type AdminMember = {
  id: string;
  email: string;
  full_name: string | null;
  role: MemberRole;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  created_at: string;
};

type VipEntitlement = {
  id: string;
  user_id: string;
  source: "admin" | "invite" | "youtube" | "partner" | "subscription" | "legacy";
  source_key: string;
  label: string | null;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
};

const sourceLabels: Record<VipEntitlement["source"], string> = {
  admin: "Cortesia/manual",
  invite: "Convite",
  youtube: "Membro do YouTube",
  partner: "Parceiro",
  subscription: "Assinatura direta",
  legacy: "Legado",
};

function dateInputAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function AdminMembersPage() {
  const { supabase, userId } = await requireAdmin();
  await supabase.rpc("admin_refresh_all_vip_roles");

  const [{ data, error }, { data: entitlementData, error: entitlementError }] = await Promise.all([
    supabase.rpc("admin_list_members"),
    supabase
      .from("vip_entitlements")
      .select("id, user_id, source, source_key, label, starts_at, expires_at, is_active")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false }),
  ]);

  const members = (data ?? []) as AdminMember[];
  const entitlements = (entitlementData ?? []) as VipEntitlement[];
  const entitlementsByUser = new Map<string, VipEntitlement[]>();
  entitlements.forEach((item) => {
    const current = entitlementsByUser.get(item.user_id) ?? [];
    current.push(item);
    entitlementsByUser.set(item.user_id, current);
  });

  return (
    <section className="admin-section">
      <div className="admin-section__heading">
        <div>
          <span>CONTAS E ACESSOS</span>
          <h2><UsersRound size={22} /> Membros cadastrados</h2>
          <p>Cadastre membros do YouTube manualmente, defina validade e controle exclusões sem depender da API do Google.</p>
        </div>
        <strong>{members.length}</strong>
      </div>

      {error ? <p className="auth-message auth-message--error">{error.message}</p> : null}
      {entitlementError ? <p className="auth-message auth-message--error">{entitlementError.message}</p> : null}

      <div className="admin-member-list admin-member-list--expanded">
        {members.map((member) => {
          const isSelf = member.id === userId;
          const initials = (member.full_name || member.email).slice(0, 2).toUpperCase();
          const sources = entitlementsByUser.get(member.id) ?? [];
          return (
            <article className={`admin-member-card admin-member-card--expanded ${member.is_blocked ? "is-blocked" : ""}`} key={member.id}>
              <div className="admin-member-card__identity">
                <span className="admin-member-card__avatar">{initials}</span>
                <div>
                  <h3>{member.full_name || "Nome não informado"}</h3>
                  <p>{member.email}</p>
                  <small>Cadastro em {formatBrazilDate(member.created_at)}</small>
                </div>
              </div>

              <div className="admin-member-card__status">
                <span className={`role-badge role-badge--${member.role}`}>{member.role === "admin" ? "Administrador" : member.role === "vip" ? "VIP" : "Membro"}</span>
                {member.is_blocked ? <span className="admin-status admin-status--danger">Bloqueado</span> : <span className="admin-status">Ativo</span>}
                {isSelf ? <small>Sua conta</small> : null}
              </div>

              <div className="admin-member-access-list">
                <div className="admin-member-access-list__heading"><Crown size={18} /><strong>Acessos VIP ativos</strong></div>
                {sources.length ? sources.map((source) => (
                  <div className="admin-member-access-item" key={source.id}>
                    <div>
                      <span className={`vip-source-badge vip-source-badge--${source.source}`}>{sourceLabels[source.source]}</span>
                      <strong>{source.label || sourceLabels[source.source]}</strong>
                      <small>
                        {source.expires_at
                          ? `Válido até ${formatBrazilDate(source.expires_at)}`
                          : "Sem validade definida"}
                      </small>
                    </div>
                    {!isSelf ? (
                      <form action={revokeVipAccessAction}>
                        <input type="hidden" name="entitlementId" value={source.id} />
                        <ConfirmSubmitButton className="button button--danger button--compact" message="Revogar este acesso VIP?">
                          <XCircle size={15} /> Revogar
                        </ConfirmSubmitButton>
                      </form>
                    ) : null}
                  </div>
                )) : <p>Nenhum acesso VIP ativo.</p>}
              </div>

              {!isSelf ? (
                <details className="admin-member-tools">
                  <summary><UserCog size={18} /> Gerenciar conta e VIP</summary>

                  <div className="admin-member-tools__grid">
                    <form className="admin-member-vip-form" action={grantVipAccessAction}>
                      <input type="hidden" name="userId" value={member.id} />
                      <h4><Crown size={17} /> Conceder ou renovar VIP</h4>
                      <label>
                        <span>Origem</span>
                        <select name="source" defaultValue="youtube">
                          <option value="youtube">Membro do YouTube</option>
                          <option value="subscription">Assinatura direta</option>
                          <option value="admin">Cortesia/manual</option>
                          <option value="partner">Parceiro</option>
                        </select>
                      </label>
                      <label>
                        <span>Identificação</span>
                        <input name="label" placeholder="Ex.: Membro YouTube — julho/2026" maxLength={120} />
                      </label>
                      <label>
                        <span>Validade (dd/mm/aaaa)</span>
                        <input name="expiresAt" type="date" lang="pt-BR" defaultValue={dateInputAfter(30)} />
                      </label>
                      <label className="admin-checkbox-row">
                        <input name="noExpiry" type="checkbox" />
                        <span>Sem validade</span>
                      </label>
                      <button className="button button--primary" type="submit"><CalendarClock size={16} /> Salvar acesso VIP</button>
                    </form>

                    <div className="admin-member-account-actions">
                      <h4><ShieldCheck size={17} /> Administração e segurança</h4>

                      <form action={setMemberAdminAction}>
                        <input type="hidden" name="userId" value={member.id} />
                        <input type="hidden" name="makeAdmin" value={member.role === "admin" ? "false" : "true"} />
                        <ConfirmSubmitButton
                          className="button button--secondary"
                          message={member.role === "admin" ? "Remover o nível administrativo desta conta?" : "Tornar esta conta administradora?"}
                        >
                          <UserCog size={16} /> {member.role === "admin" ? "Remover administrador" : "Tornar administrador"}
                        </ConfirmSubmitButton>
                      </form>

                      <form action={setMemberBlockedAction}>
                        <input type="hidden" name="userId" value={member.id} />
                        <input type="hidden" name="blocked" value={member.is_blocked ? "false" : "true"} />
                        {!member.is_blocked ? <input name="reason" placeholder="Motivo opcional do bloqueio" /> : null}
                        <ConfirmSubmitButton
                          className={`button ${member.is_blocked ? "button--primary" : "button--danger"}`}
                          message={member.is_blocked ? "Reativar esta conta?" : "Bloquear esta conta e impedir novos acessos?"}
                        >
                          {member.is_blocked ? <CheckCircle2 size={16} /> : <Ban size={16} />}
                          {member.is_blocked ? "Reativar conta" : "Bloquear conta"}
                        </ConfirmSubmitButton>
                      </form>

                      <form action={deleteMemberAccountAction}>
                        <input type="hidden" name="userId" value={member.id} />
                        <ConfirmSubmitButton
                          className="button button--danger"
                          disabled={member.role === "admin"}
                          message="Excluir definitivamente esta conta, seus dados e acessos? Esta ação não pode ser desfeita."
                        >
                          <Trash2 size={16} /> Excluir conta
                        </ConfirmSubmitButton>
                        {member.role === "admin" ? <small>Remova o nível administrativo antes da exclusão.</small> : null}
                      </form>
                    </div>
                  </div>
                </details>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
