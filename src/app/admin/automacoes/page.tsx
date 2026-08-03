import type { Metadata } from "next";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  Gauge,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { runDriverAutomationsNowAction } from "@/app/admin/automacoes/actions";
import { requireAdmin } from "@/lib/admin";
import { formatBrazilDateTime } from "@/lib/date-time";
import type { DriverAutomationRun } from "@/types/notification";

export const metadata: Metadata = { title: "Automações" };
export const dynamic = "force-dynamic";

const statusLabels: Record<DriverAutomationRun["status"], string> = {
  running: "Executando",
  completed: "Concluída",
  partial: "Parcial",
  failed: "Falhou",
};

const sourceLabels: Record<DriverAutomationRun["run_source"], string> = {
  cron: "Agendada",
  admin: "Administrador",
  manual: "Manual",
  test: "Teste",
};

function duration(run: DriverAutomationRun) {
  if (!run.completed_at) return "Em andamento";
  const milliseconds = Date.parse(run.completed_at) - Date.parse(run.started_at);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "—";
  if (milliseconds < 1000) return `${milliseconds} ms`;
  return `${(milliseconds / 1000).toFixed(milliseconds < 10000 ? 1 : 0)} s`;
}

export default async function AdminAutomationsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("driver_automation_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(60);

  const runs = (data ?? []) as DriverAutomationRun[];
  const lastRun = runs[0] ?? null;
  const completed = runs.filter((item) => item.status === "completed").length;
  const failed = runs.filter((item) => item.status === "failed").length;
  const created = runs.reduce((total, item) => total + Number(item.created_count || 0), 0);

  return (
    <div className="admin-columns admin-automation-page">
      <section className="admin-section admin-automation-control">
        <div className="admin-section__heading">
          <div><span>AUTOMAÇÕES INTERNAS</span><h2><Gauge size={22} /> Operação e segurança</h2></div>
        </div>

        <div className="admin-automation-safety">
          <ShieldCheck size={24} />
          <div>
            <strong>Execução protegida e idempotente</strong>
            <p>O endpoint exige segredo do servidor e a chave de origem impede notificações duplicadas. Nenhuma mensagem externa ou cobrança é disparada.</p>
          </div>
        </div>

        <div className="admin-automation-status-grid">
          <article><RefreshCw size={20} /><span>Última execução</span><strong>{lastRun ? formatBrazilDateTime(lastRun.started_at) : "Ainda não executada"}</strong></article>
          <article><BellRing size={20} /><span>Alertas criados</span><strong>{created}</strong></article>
          <article><CheckCircle2 size={20} /><span>Execuções concluídas</span><strong>{completed}</strong></article>
          <article><TriangleAlert size={20} /><span>Falhas registradas</span><strong>{failed}</strong></article>
        </div>

        <form action={runDriverAutomationsNowAction}>
          <button className="button button--primary" type="submit"><PlayCircle size={18} /> Executar automações agora</button>
        </form>

        <p className="admin-form-note">A execução manual usa a mesma rotina protegida do cron e serve para validação ou atualização imediata dos alertas.</p>
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>HISTÓRICO TÉCNICO</span><h2>Execuções recentes</h2></div>
          <strong>{runs.length}</strong>
        </div>

        {error ? <p className="auth-message auth-message--error">{error.message}</p> : null}

        <div className="admin-automation-run-list">
          {runs.map((run) => (
            <article className={`admin-automation-run status-${run.status}`} key={run.id}>
              <header>
                <div>
                  <span className={`admin-status ${run.status === "failed" ? "admin-status--warning" : ""}`}>{statusLabels[run.status]}</span>
                  <span>{sourceLabels[run.run_source]}</span>
                </div>
                <time dateTime={run.started_at}>{formatBrazilDateTime(run.started_at)}</time>
              </header>
              <div className="admin-automation-run__metrics">
                <span><strong>{run.scanned_count}</strong> analisados</span>
                <span><strong>{run.created_count}</strong> criados</span>
                <span><strong>{run.skipped_count}</strong> ignorados</span>
                <span><Clock3 size={15} /> {duration(run)}</span>
              </div>
              {run.error_message ? <p className="admin-automation-run__error">{run.error_message}</p> : null}
              <small>ID: {run.request_id}</small>
            </article>
          ))}

          {!runs.length ? (
            <article className="admin-empty">
              <RefreshCw size={28} />
              <p>Nenhuma execução registrada. Use o botão acima ou aguarde o agendamento.</p>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
