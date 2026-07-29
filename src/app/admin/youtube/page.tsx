import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  ExternalLink,
  Link2,
  RefreshCw,
  ShieldCheck,
  Unlink,
  UsersRound,
  Video,
} from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { requireAdmin } from "@/lib/admin";
import { googleOAuthConfigured } from "@/lib/google-oauth";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  YouTubeCreatorConnection,
  YouTubeMember,
  YouTubeMembershipLevel,
} from "@/types/youtube-membership";

export const metadata: Metadata = {
  title: "Membros do YouTube",
  description: "Conexão, sincronização e liberação VIP dos membros do canal Jean na Estrada.",
};

type PageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

function formatDate(value: string | null) {
  if (!value) return "Ainda não realizada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminYouTubePage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const supabase = createAdminClient();

  const [connectionResult, levelsResult, membersResult, activeCountResult, linksCountResult] =
    await Promise.all([
      supabase
        .from("youtube_creator_connections")
        .select(
          "connection_key, creator_channel_id, creator_channel_title, status, connected_at, last_synced_at, last_sync_status, last_sync_error, last_member_count, last_unidentifiable_count, updated_at",
        )
        .eq("connection_key", "primary")
        .maybeSingle(),
      supabase
        .from("youtube_membership_levels")
        .select("id, creator_channel_id, display_name, synced_at")
        .order("display_name"),
      supabase
        .from("youtube_members")
        .select(
          "member_channel_id, creator_channel_id, display_name, profile_image_url, channel_url, highest_level_id, highest_level_name, accessible_level_ids, member_since, total_duration_months, is_active, last_seen_at",
        )
        .eq("is_active", true)
        .order("last_seen_at", { ascending: false })
        .limit(100),
      supabase.from("youtube_members").select("member_channel_id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("vip_entitlements").select("id", { count: "exact", head: true }).eq("source", "youtube").eq("is_active", true),
    ]);

  const connection = connectionResult.data as YouTubeCreatorConnection | null;
  const levels = (levelsResult.data ?? []) as YouTubeMembershipLevel[];
  const members = (membersResult.data ?? []) as YouTubeMember[];
  const activeCount = activeCountResult.count ?? 0;
  const linkedCount = linksCountResult.count ?? 0;
  const configurationReady = googleOAuthConfigured();
  const firstError =
    connectionResult.error || levelsResult.error || membersResult.error || activeCountResult.error || linksCountResult.error;

  return (
    <section className="admin-section youtube-admin-page">
      <div className="admin-section__heading">
        <div>
          <span>MONETIZAÇÃO E ACESSO</span>
          <h2><Video size={22} /> Membros do YouTube</h2>
        </div>
        <strong>{activeCount}</strong>
      </div>

      {params.success ? <p className="auth-message auth-message--success">{params.success}</p> : null}
      {params.error ? <p className="auth-message auth-message--error">{params.error}</p> : null}
      {firstError ? <p className="auth-message auth-message--error">{firstError.message}</p> : null}

      {!configurationReady ? (
        <div className="youtube-callout youtube-callout--warning">
          <AlertTriangle size={24} />
          <div>
            <strong>Credenciais Google ainda não configuradas</strong>
            <p>Cadastre as três variáveis Google na Vercel antes de conectar o canal.</p>
          </div>
        </div>
      ) : null}

      <div className="youtube-admin-grid">
        <article className="youtube-connection-card">
          <div className="youtube-connection-card__heading">
            <span className="youtube-icon"><Video size={24} /></span>
            <div>
              <small>CANAL DO CRIADOR</small>
              <h3>{connection?.creator_channel_title || "Canal ainda não conectado"}</h3>
              <p>{connection?.creator_channel_id || "Autorize a conta proprietária do canal Jean na Estrada."}</p>
            </div>
          </div>

          <div className="youtube-connection-status">
            <span className={connection?.status === "connected" ? "is-success" : connection?.status === "error" ? "is-error" : ""}>
              {connection?.status === "connected" ? <BadgeCheck size={16} /> : <AlertTriangle size={16} />}
              {connection?.status === "connected" ? "Conectado" : connection?.status === "error" ? "Atenção" : "Desconectado"}
            </span>
            <small>Última sincronização: {formatDate(connection?.last_synced_at ?? null)}</small>
          </div>

          {connection?.last_sync_error ? (
            <p className="auth-message auth-message--error">{connection.last_sync_error}</p>
          ) : null}

          <div className="youtube-action-row">
            {!connection ? (
              <Link
                className={`button button--primary ${!configurationReady ? "is-disabled" : ""}`}
                href={configurationReady ? "/api/youtube/admin/connect" : "#"}
                aria-disabled={!configurationReady}
              >
                <Link2 size={17} /> Conectar canal
              </Link>
            ) : (
              <>
                <form action="/api/youtube/admin/sync" method="post">
                  <button className="button button--primary" type="submit">
                    <RefreshCw size={17} /> Sincronizar agora
                  </button>
                </form>
                <Link className="button button--secondary" href="/api/youtube/admin/connect">
                  <Link2 size={17} /> Reconectar
                </Link>
                <form action="/api/youtube/admin/disconnect" method="post">
                  <ConfirmSubmitButton
                    className="button button--danger"
                    message="Desconectar a conta proprietária do YouTube? Os acessos já verificados serão preservados, mas não haverá novas sincronizações."
                  >
                    <Unlink size={17} /> Desconectar
                  </ConfirmSubmitButton>
                </form>
              </>
            )}
          </div>
        </article>

        <article className="youtube-metric-panel">
          <div><UsersRound size={21} /><span>Membros atuais</span><strong>{activeCount}</strong></div>
          <div><BadgeCheck size={21} /><span>VIPs vinculados</span><strong>{linkedCount}</strong></div>
          <div><Link2 size={21} /><span>Aguardando vínculo</span><strong>{Math.max(0, activeCount - linkedCount)}</strong></div>
          <div><ShieldCheck size={21} /><span>Níveis encontrados</span><strong>{levels.length}</strong></div>
        </article>
      </div>

      <div className="youtube-callout">
        <ShieldCheck size={24} />
        <div>
          <strong>A API de membros exige autorização especial do YouTube</strong>
          <p>
            O código está preparado para o endpoint oficial, mas a sincronização só funcionará depois que o projeto Google receber acesso ao serviço de membros. A liberação manual e os convites continuam funcionando como contingência.
          </p>
        </div>
      </div>

      <section className="youtube-level-section">
        <div className="admin-subheading"><div><span>NÍVEIS</span><h3>Planos encontrados no canal</h3></div></div>
        <div className="youtube-level-list">
          {levels.map((level) => <span key={level.id}>{level.display_name}</span>)}
          {!levels.length ? <p>Nenhum nível sincronizado até agora.</p> : null}
        </div>
      </section>

      <section className="youtube-members-section">
        <div className="admin-subheading">
          <div><span>ASSINANTES ATUAIS</span><h3>Últimos membros sincronizados</h3></div>
          <small>Exibindo até 100 registros</small>
        </div>

        <div className="youtube-member-list">
          {members.map((member) => (
            <article key={member.member_channel_id}>
              {member.profile_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.profile_image_url} alt="" referrerPolicy="no-referrer" />
              ) : <span className="youtube-member-avatar">{(member.display_name || "YT").slice(0, 2).toUpperCase()}</span>}
              <div>
                <h4>{member.display_name || "Perfil indisponível"}</h4>
                <p>{member.highest_level_name || "Nível não informado"}</p>
                <small>{member.total_duration_months ?? 0} meses completos · verificado em {formatDate(member.last_seen_at)}</small>
              </div>
              {member.channel_url ? (
                <a href={member.channel_url} target="_blank" rel="noreferrer" aria-label="Abrir canal">
                  <ExternalLink size={17} />
                </a>
              ) : null}
            </article>
          ))}
          {!members.length ? <div className="youtube-empty"><UsersRound size={28} /><strong>Nenhum membro sincronizado</strong><p>Conecte o canal e execute a primeira sincronização.</p></div> : null}
        </div>
      </section>
    </section>
  );
}
