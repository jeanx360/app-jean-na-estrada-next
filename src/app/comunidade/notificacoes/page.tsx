import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CheckCheck, MessageCircle, ShieldAlert, UserRound } from "lucide-react";
import { markCommunityNotificationsReadAction } from "@/app/comunidade/actions";
import { PageHeader } from "@/components/PageHeader";
import { SmartBackButton } from "@/components/SmartBackButton";
import { requireCommunityAccess, formatCommunityDate } from "@/lib/community";

type NotificationRow = {
  id: string;
  actor_id: string | null;
  notification_type: "comment" | "reply" | "moderation";
  post_id: string | null;
  comment_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
};

type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null };

export const metadata: Metadata = {
  title: "Interações da comunidade",
  description: "Comentários, respostas e avisos de moderação da Comunidade VIP.",
};

export default async function CommunityNotificationsPage() {
  const { supabase, userId } = await requireCommunityAccess("/comunidade/notificacoes");
  const { data } = await supabase
    .from("community_notifications")
    .select("id, actor_id, notification_type, post_id, comment_id, message, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  const items = (data ?? []) as NotificationRow[];
  const actorIds = Array.from(new Set(items.map((item) => item.actor_id).filter((id): id is string => Boolean(id))));
  const { data: profilesData } = actorIds.length
    ? await supabase.rpc("community_list_profiles", { target_ids: actorIds })
    : { data: [] as ProfileRow[] };
  const profiles = (profilesData ?? []) as ProfileRow[];
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const unread = items.filter((item) => !item.is_read).length;

  return (
    <div className="page-stack community-page">
      <SmartBackButton className="text-link community-back-link" fallbackHref="/comunidade" label="Voltar à comunidade" />
      <PageHeader
        icon={<BellRing size={24} />}
        eyebrow="COMUNIDADE VIP"
        title="Suas interações"
        description="Comentários, respostas e avisos relacionados à sua participação na comunidade."
      />

      <section className="community-notification-toolbar">
        <strong>{unread} {unread === 1 ? "interação não lida" : "interações não lidas"}</strong>
        {unread ? (
          <form action={markCommunityNotificationsReadAction}>
            <button className="button button--secondary" type="submit"><CheckCheck size={17} /> Marcar todas como lidas</button>
          </form>
        ) : null}
      </section>

      <section className="community-notification-list">
        {items.map((item) => {
          const actor = item.actor_id ? profileMap.get(item.actor_id) : null;
          const Icon = item.notification_type === "moderation" ? ShieldAlert : MessageCircle;
          return (
            <article className={`community-notification-card ${item.is_read ? "is-read" : "is-unread"}`} key={item.id}>
              <div className="community-notification-card__avatar">
                {actor?.avatar_url ? <img src={actor.avatar_url} alt="" /> : <UserRound size={20} />}
              </div>
              <div>
                <span><Icon size={15} /> {actor?.full_name || (item.notification_type === "moderation" ? "Moderação JNE" : "Membro JNE")}</span>
                <p>{item.message}</p>
                <small>{formatCommunityDate(item.created_at)}</small>
              </div>
              <div className="community-notification-card__actions">
                {item.post_id ? <Link className="button button--primary" href={`/comunidade/${item.post_id}`}>Abrir</Link> : null}
                {!item.is_read ? (
                  <form action={markCommunityNotificationsReadAction}>
                    <input type="hidden" name="notificationId" value={item.id} />
                    <button className="text-link" type="submit"><CheckCheck size={15} /> Lida</button>
                  </form>
                ) : null}
              </div>
            </article>
          );
        })}
        {!items.length ? (
          <article className="community-empty-card">
            <BellRing size={32} />
            <h2>Nenhuma interação por enquanto</h2>
            <p>Quando alguém comentar ou responder uma publicação sua, o aviso aparecerá aqui.</p>
          </article>
        ) : null}
      </section>
    </div>
  );
}
