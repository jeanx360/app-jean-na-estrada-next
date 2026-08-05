import type { Metadata } from "next";
import Link from "next/link";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  Megaphone,
  RefreshCw,
  Rocket,
  Send,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  cancelReleaseScheduleAction,
  deleteReleaseAction,
  publishReleaseAction,
} from "@/app/admin/atualizacoes/actions";
import { AdminReleaseForm } from "@/components/AdminReleaseForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { requireAdmin } from "@/lib/admin";
import { formatBrazilDateTime } from "@/lib/date-time";
import type { AppReleaseRow, AppReleaseStatus } from "@/types/release-center";

export const metadata: Metadata = { title: "Central de Atualizações" };
export const dynamic = "force-dynamic";

const statusLabels: Record<AppReleaseStatus, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  publishing: "Publicando",
  published: "Publicada",
  partial: "Parcial",
  failed: "Falhou",
};

const audienceLabels: Record<AppReleaseRow["audience"], string> = {
  all: "Todos",
  member: "Membros",
  vip: "VIP",
  admin: "Administradores",
};

const releaseSelect = [
  "id",
  "version",
  "title",
  "notification_title",
  "notification_message",
  "community_title",
  "community_body",
  "highlights",
  "audience",
  "action_url",
  "image_url",
  "publish_notification",
  "feature_notification",
  "send_push",
  "publish_community",
  "pin_community",
  "pin_days",
  "status",
  "scheduled_at",
  "published_at",
  "last_attempt_at",
  "community_pin_until",
  "community_unpinned_at",
  "notification_id",
  "community_post_id",
  "push_success_count",
  "push_failure_count",
  "error_message",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
].join(", ");

export default async function AdminReleaseCenterPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("app_releases")
    .select(releaseSelect)
    .order("created_at", { ascending: false })
    .limit(80);

  const releases = (data ?? []) as unknown as AppReleaseRow[];
  const published = releases.filter((item) => item.status === "published").length;
  const scheduled = releases.filter((item) => item.status === "scheduled").length;
  const problems = releases.filter((item) => item.status === "partial" || item.status === "failed").length;
  const pushes = releases.reduce((total, item) => total + Number(item.push_success_count || 0), 0);
  const tableMissing = error?.code === "42P01" || error?.code === "PGRST205";

  return (
    <div className="admin-section-stack release-center-page">
      <section className="admin-summary-grid release-center-summary">
        <article><CheckCircle2 size={22} /><span>Atualizações publicadas</span><strong>{published}</strong></article>
        <article><CalendarClock size={22} /><span>Agendamentos</span><strong>{scheduled}</strong></article>
        <article><Send size={22} /><span>Push entregues</span><strong>{pushes}</strong></article>
        <article><TriangleAlert size={22} /><span>Pendências</span><strong>{problems}</strong></article>
      </section>

      {tableMissing ? (
        <section className="admin-section release-center-migration-warning">
          <TriangleAlert size={26} />
          <div>
            <strong>A Central de Atualizações ainda não existe no banco.</strong>
            <p>Execute a migration <code>2.2.2_release_center.sql</code> no Supabase depois dos testes locais.</p>
          </div>
        </section>
      ) : null}

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>NOVA VERSÃO</span><h2><Rocket size={22} /> Preparar atualização</h2></div>
        </div>
        <div className="release-center-safety">
          <CheckCircle2 size={22} />
          <div>
            <strong>Um único comando, com confirmação</strong>
            <p>A central salva o histórico, evita duplicidade e só dispara quando você publica ou agenda pelo painel.</p>
          </div>
        </div>
        <AdminReleaseForm />
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>HISTÓRICO E MÉTRICAS</span><h2>Atualizações cadastradas</h2></div>
          <strong>{releases.length}</strong>
        </div>

        {error && !tableMissing ? <p className="auth-message auth-message--error">{error.message}</p> : null}

        <div className="release-center-list">
          {releases.map((release) => {
            const canEdit = !["published", "publishing"].includes(release.status);
            const canDelete = ["draft", "scheduled", "failed"].includes(release.status)
              && !release.notification_id
              && !release.community_post_id;
            const needsRetry = release.status === "partial" || release.status === "failed";

            return (
              <article className={`release-center-card status-${release.status}`} key={release.id}>
                <header>
                  <div>
                    <span className={`admin-status ${["partial", "failed"].includes(release.status) ? "admin-status--warning" : ""}`}>
                      {statusLabels[release.status]}
                    </span>
                    <span>v{release.version}</span>
                    <span>{audienceLabels[release.audience]}</span>
                  </div>
                  <time dateTime={release.created_at}>{formatBrazilDateTime(release.created_at)}</time>
                </header>

                <h3>{release.title}</h3>
                <p>{release.notification_message}</p>

                <div className="release-center-card__channels">
                  {release.publish_notification ? <span><BellRing size={15} /> Notificação</span> : null}
                  {release.send_push ? <span><Send size={15} /> Push</span> : null}
                  {release.publish_community ? <span><Megaphone size={15} /> Comunidade VIP</span> : null}
                  {release.pin_community ? <span><Clock3 size={15} /> Fixada por {release.pin_days} dia(s)</span> : null}
                </div>

                {release.status === "scheduled" && release.scheduled_at ? (
                  <p className="release-center-card__schedule"><CalendarClock size={16} /> Programada para {formatBrazilDateTime(release.scheduled_at)}</p>
                ) : null}

                {release.published_at ? (
                  <div className="release-center-card__metrics">
                    <span><strong>{release.push_success_count}</strong> push entregues</span>
                    <span><strong>{release.push_failure_count}</strong> falhas</span>
                    <span>Publicada em {formatBrazilDateTime(release.published_at)}</span>
                  </div>
                ) : null}

                {release.error_message ? (
                  <p className="release-center-card__error"><TriangleAlert size={16} /> {release.error_message}</p>
                ) : null}

                <div className="admin-inline-actions release-center-card__actions">
                  {canEdit ? (
                    <Link className="button button--secondary" href={`/admin/atualizacoes/${release.id}/editar`}>
                      <Edit3 size={16} /> Editar
                    </Link>
                  ) : null}

                  {release.status !== "published" && release.status !== "publishing" ? (
                    <form action={publishReleaseAction}>
                      <input type="hidden" name="releaseId" value={release.id} />
                      <button className="button button--primary" type="submit">
                        {needsRetry ? <RefreshCw size={16} /> : <Send size={16} />}
                        {needsRetry ? "Tentar etapa pendente" : "Publicar agora"}
                      </button>
                    </form>
                  ) : null}

                  {release.status === "scheduled" ? (
                    <form action={cancelReleaseScheduleAction}>
                      <input type="hidden" name="releaseId" value={release.id} />
                      <button className="button button--secondary" type="submit"><Clock3 size={16} /> Cancelar agendamento</button>
                    </form>
                  ) : null}

                  {release.notification_id ? (
                    <Link className="button button--secondary" href="/admin/notificacoes"><ExternalLink size={16} /> Notificação</Link>
                  ) : null}
                  {release.community_post_id ? (
                    <Link className="button button--secondary" href={`/comunidade/${release.community_post_id}`}><ExternalLink size={16} /> Publicação VIP</Link>
                  ) : null}

                  {canDelete ? (
                    <form action={deleteReleaseAction}>
                      <input type="hidden" name="releaseId" value={release.id} />
                      <ConfirmSubmitButton className="button button--danger" message="Excluir definitivamente este rascunho?">
                        <Trash2 size={16} /> Excluir
                      </ConfirmSubmitButton>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}

          {!releases.length && !error ? (
            <div className="admin-empty-state"><Rocket size={30} /><strong>Nenhuma atualização cadastrada</strong><p>Prepare a primeira comunicação oficial acima.</p></div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
