import Link from "next/link";
import {
  BarChart3,
  Crown,
  Heart,
  LockKeyhole,
  MessageCircle,
  MoreHorizontal,
  Pin,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CommunityReportForm } from "@/components/CommunityReportForm";
import { CommunityShareButton } from "@/components/CommunityShareButton";
import { deleteOwnCommunityPostAction, toggleCommunityPostLikeAction, voteCommunityPollAction } from "@/app/comunidade/actions";
import { formatCommunityDate } from "@/lib/community";
import type { CommunityFeedPost } from "@/types/community";

function authorName(post: CommunityFeedPost) {
  return post.author?.full_name || "Membro JNE";
}

export function CommunityPostCard({ post, currentUserId, isAdmin, detail = false }: { post: CommunityFeedPost; currentUserId: string; isAdmin: boolean; detail?: boolean }) {
  const totalVotes = post.pollOptions.reduce((total, option) => total + option.voteCount, 0);
  const canDelete = post.author_id === currentUserId || isAdmin;
  const content = detail || post.body.length <= 620 ? post.body : `${post.body.slice(0, 620).trim()}…`;

  return (
    <article className={`community-post-card community-post-card--minimal ${post.is_pinned ? "community-post-card--pinned" : ""}`}>
      <header className="community-post-card__header">
        <div className="community-author">
          <div className="community-author__avatar">{post.author?.avatar_url ? <img src={post.author.avatar_url} alt="" /> : <UserRound size={20} />}</div>
          <div>
            <strong>{authorName(post)}</strong>
            <span>
              {post.author?.role === "admin" ? <ShieldCheck size={13} /> : <Crown size={13} />}
              {post.author?.role === "admin" ? "Administrador" : "VIP"}
              <i>•</i>
              {formatCommunityDate(post.created_at)}
              {post.category ? <><i>•</i><Link href={`/comunidade?categoria=${post.category.slug}`}>{post.category.name}</Link></> : null}
            </span>
          </div>
        </div>

        <div className="community-post-card__top-actions">
          {post.is_pinned ? <span title="Publicação fixada"><Pin size={15} /></span> : null}
          {post.is_locked ? <span title="Comentários bloqueados"><LockKeyhole size={15} /></span> : null}
          <details className="community-more-menu">
            <summary aria-label="Mais opções"><MoreHorizontal size={20} /></summary>
            <div className="community-more-menu__panel">
              <CommunityReportForm targetType="post" targetId={post.id} postId={post.id} />
              {canDelete ? (
                <form action={deleteOwnCommunityPostAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <ConfirmSubmitButton className="community-menu-danger" message="Excluir esta publicação e todos os comentários?">
                    <Trash2 size={15} /> Excluir publicação
                  </ConfirmSubmitButton>
                </form>
              ) : null}
            </div>
          </details>
        </div>
      </header>

      <div className="community-post-card__content">
        <p>{content}</p>
        {!detail && post.body.length > 620 ? <Link className="text-link" href={`/comunidade/${post.id}`}>Continuar lendo</Link> : null}
      </div>

      {post.imageUrl ? <Link href={`/comunidade/${post.id}`} className="community-post-card__image"><img src={post.imageUrl} alt={`Imagem da publicação de ${authorName(post)}`} /></Link> : null}

      {post.poll_question && post.pollOptions.length ? (
        <section className="community-poll">
          <div className="community-poll__title"><BarChart3 size={19} /><div><strong>{post.poll_question}</strong><span>{totalVotes} {totalVotes === 1 ? "voto" : "votos"}</span></div></div>
          <div className="community-poll__options">
            {post.pollOptions.map((option) => {
              const percentage = totalVotes ? Math.round((option.voteCount / totalVotes) * 100) : 0;
              return (
                <form action={voteCommunityPollAction} key={option.id}>
                  <input type="hidden" name="postId" value={post.id} />
                  <input type="hidden" name="optionId" value={option.id} />
                  <button type="submit" className={`community-poll-option ${option.selectedByCurrentUser ? "is-selected" : ""}`} disabled={post.is_locked}>
                    <span className="community-poll-option__fill" style={{ width: `${percentage}%` }} />
                    <span className="community-poll-option__label">{option.label}</span><small>{percentage}%</small>
                  </button>
                </form>
              );
            })}
          </div>
        </section>
      ) : null}

      <footer className="community-post-card__footer">
        <form action={toggleCommunityPostLikeAction}>
          <input type="hidden" name="postId" value={post.id} />
          <button className={`community-action-button ${post.likedByCurrentUser ? "is-active" : ""}`} type="submit" aria-label="Curtir">
            <Heart size={18} fill={post.likedByCurrentUser ? "currentColor" : "none"} /><span>{post.likeCount || "Curtir"}</span>
          </button>
        </form>
        <Link className="community-action-button" href={`/comunidade/${post.id}#comentarios`}>
          <MessageCircle size={18} /><span>{post.commentCount || "Comentar"}</span>
        </Link>
        <CommunityShareButton path={`/comunidade/${post.id}`} title={post.title} text={post.body.slice(0, 180)} />
      </footer>
    </article>
  );
}
