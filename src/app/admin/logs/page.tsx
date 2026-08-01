import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Logs administrativos" };

const actionLabels: Record<string, string> = { INSERT: "Criação", UPDATE: "Alteração", DELETE: "Exclusão" };

export default async function AdminLogsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: logs, error }, { data: members }] = await Promise.all([
    supabase.from("admin_audit_logs").select("id, actor_user_id, action, entity_type, entity_id, old_data, new_data, created_at").order("created_at", { ascending: false }).limit(200),
    supabase.rpc("admin_list_members"),
  ]);
  const memberMap = new Map<string, string>(
    (members ?? []).map((member: { id: string; email: string; full_name: string | null }) =>
      [member.id, member.full_name || member.email] as [string, string],
    ),
  );

  return (
    <section className="admin-section">
      <div className="admin-section__heading"><div><span>AUDITORIA</span><h2><ScrollText size={22} /> Atividades administrativas</h2></div><strong>{logs?.length ?? 0}</strong></div>
      <p className="admin-section__intro">Últimas 200 alterações sensíveis registradas pelo banco.</p>
      {error ? <p className="auth-message auth-message--error">{error.message}</p> : null}
      <div className="audit-log-list">
        {(logs ?? []).map((log: { id: string; actor_user_id: string | null; action: string; entity_type: string; entity_id: string | null; created_at: string }) => (
          <article key={log.id}>
            <div><span>{actionLabels[log.action] ?? log.action}</span><small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(log.created_at))}</small></div>
            <h3>{log.entity_type}</h3>
            <p>Responsável: {log.actor_user_id ? memberMap.get(log.actor_user_id) ?? log.actor_user_id : "Sistema"}</p>
            {log.entity_id ? <small>Registro: {log.entity_id}</small> : null}
          </article>
        ))}
        {!logs?.length && !error ? <p className="admin-empty">Nenhuma atividade registrada ainda.</p> : null}
      </div>
    </section>
  );
}
