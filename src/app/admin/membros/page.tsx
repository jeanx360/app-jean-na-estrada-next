import type { Metadata } from "next";
import { Ban, CheckCircle2, Save, UsersRound } from "lucide-react";
import { setMemberBlockedAction, updateMemberRoleAction } from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { requireAdmin } from "@/lib/admin";
import type { MemberRole } from "@/types/auth";

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
  user_id: string;
  source: "admin" | "invite" | "youtube" | "partner" | "subscription" | "legacy";
  source_key: string;
  label: string | null;
  expires_at: string | null;
  is_active: boolean;
};

const roleLabels: Record<MemberRole, string> = {
  member: "Membro",
  vip: "VIP",
  admin: "Administrador",
};

export default async function AdminMembersPage() {
  const { supabase, userId } = await requireAdmin();
  const [{ data, error }, { data: entitlementData, error: entitlementError }] = await Promise.all([
    supabase.rpc("admin_list_members"),
    supabase
      .from("vip_entitlements")
      .select("user_id, source, source_key, label, expires_at, is_active")
      .eq("is_active", true),
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
          <span>CONTAS</span>
          <h2><UsersRound size={22} /> Membros cadastrados</h2>
        </div>
        <strong>{members.length}</strong>
      </div>

      {error ? <p className="auth-message auth-message--error">{error.message}</p> : null}
      {entitlementError ? <p className="auth-message auth-message--error">{entitlementError.message}</p> : null}

      <div className="admin-member-list">
        {members.map((member) => {
          const isSelf = member.id === userId;
          const initials = (member.full_name || member.email).slice(0, 2).toUpperCase();
          const sources = entitlementsByUser.get(member.id) ?? [];
          const sourceLabels: Record<VipEntitlement["source"], string> = {
            admin: "Manual",
            invite: "Convite",
            youtube: "YouTube",
            partner: "Parceiro",
            subscription: "Assinatura direta",
            legacy: "Legado",
          };
          return (
            <article className={`admin-member-card ${member.is_blocked ? "is-blocked" : ""}`} key={member.id}>
              <div className="admin-member-card__identity">
                <span className="admin-member-card__avatar">{initials}</span>
                <div>
                  <h3>{member.full_name || "Nome não informado"}</h3>
                  <p>{member.email}</p>
                  <small>
                    Cadastro em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(member.created_at))}
                  </small>
                </div>
              </div>

              <div className="admin-member-card__controls">
                <form action={updateMemberRoleAction}>
                  <input type="hidden" name="userId" value={member.id} />
                  <label>
                    <span>Nível</span>
                    <select name="role" defaultValue={member.role} disabled={isSelf}>
                      {(Object.keys(roleLabels) as MemberRole[]).map((role) => (
                        <option value={role} key={role}>{roleLabels[role]}</option>
                      ))}
                    </select>
                  </label>
                  <button className="button button--secondary" type="submit" disabled={isSelf}>
                    <Save size={16} /> Salvar nível
                  </button>
                </form>

                <form action={setMemberBlockedAction}>
                  <input type="hidden" name="userId" value={member.id} />
                  <input type="hidden" name="blocked" value={member.is_blocked ? "false" : "true"} />
                  {!member.is_blocked ? (
                    <input name="reason" placeholder="Motivo opcional do bloqueio" disabled={isSelf} />
                  ) : null}
                  <ConfirmSubmitButton
                    className={`button ${member.is_blocked ? "button--primary" : "button--danger"}`}
                    disabled={isSelf}
                    message={member.is_blocked ? "Reativar esta conta?" : "Bloquear esta conta e impedir novos acessos?"}
                  >
                    {member.is_blocked ? <CheckCircle2 size={16} /> : <Ban size={16} />}
                    {member.is_blocked ? "Reativar conta" : "Bloquear conta"}
                  </ConfirmSubmitButton>
                </form>
              </div>

              <div className="admin-member-card__status">
                <span className={`role-badge role-badge--${member.role}`}>{roleLabels[member.role]}</span>
                {member.is_blocked ? <span className="admin-status admin-status--danger">Bloqueado</span> : <span className="admin-status">Ativo</span>}
                {sources.map((source) => (
                  <span className={`vip-source-badge vip-source-badge--${source.source}`} key={`${source.source}-${source.source_key}`}>
                    {sourceLabels[source.source]}
                  </span>
                ))}
                {isSelf ? <small>Sua conta</small> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
