import type { Metadata } from "next";
import { KeyRound, ShieldX } from "lucide-react";
import { revokeInviteAction } from "@/app/admin/actions";
import { AdminInviteForm } from "@/components/AdminInviteForm";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Convites VIP" };

type Invite = {
  id: string;
  code_hint: string;
  label: string;
  max_uses: number;
  use_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export default async function AdminInvitesPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("vip_invites")
    .select("id, code_hint, label, max_uses, use_count, expires_at, is_active, created_at")
    .order("created_at", { ascending: false });
  const invites = (data ?? []) as Invite[];

  return (
    <div className="admin-columns">
      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>NOVO ACESSO</span><h2><KeyRound size={22} /> Criar convite VIP</h2></div>
        </div>
        <AdminInviteForm />
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>CONTROLE</span><h2>Convites existentes</h2></div>
          <strong>{invites.length}</strong>
        </div>
        {error ? <p className="auth-message auth-message--error">{error.message}</p> : null}
        <div className="admin-list">
          {invites.map((invite) => {
            const expired = invite.expires_at ? new Date(invite.expires_at) <= new Date() : false;
            const exhausted = invite.use_count >= invite.max_uses;
            const active = invite.is_active && !expired && !exhausted;
            return (
              <article className="admin-list-card" key={invite.id}>
                <div>
                  <span className={`admin-status ${active ? "" : "admin-status--danger"}`}>{active ? "Ativo" : "Encerrado"}</span>
                  <h3>{invite.label}</h3>
                  <p>Código final •••{invite.code_hint}</p>
                  <small>{invite.use_count} de {invite.max_uses} usos · {invite.expires_at ? `expira ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(invite.expires_at))}` : "sem vencimento"}</small>
                </div>
                {invite.is_active ? (
                  <form action={revokeInviteAction}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <button className="button button--danger" type="submit"><ShieldX size={16} /> Revogar</button>
                  </form>
                ) : null}
              </article>
            );
          })}
          {!invites.length ? <p className="admin-empty">Nenhum convite criado.</p> : null}
        </div>
      </section>
    </div>
  );
}
