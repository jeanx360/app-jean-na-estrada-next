import { Heart, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { CommunityCommentForm } from "@/components/CommunityCommentForm";
import { CommunityReportForm } from "@/components/CommunityReportForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import {
  deleteOwnCommunityCommentAction,
  toggleCommunityCommentLikeAction,
} from "@/app/comunidade/actions";
import { formatCommunityDate } from "@/lib/community";
import type { CommunityCommentView } from "@/types/community";

function CommentItem({
  comment,
  postId,
  currentUserId,
  isAdmin,
  reply = false,
  canComment,
}: {
  comment: CommunityCommentView;
  postId: string;
  currentUserId: string;
  isAdmin: boolean;
  reply?: boolean;
  canComment: boolean;
}) {
  const canDelete = comment.author_id === currentUserId || isAdmin;

  return (
    <article className={`community-comment ${reply ? "community-comment--reply" : ""}`} id={`comentario-${comment.id}`}>
      <header>
        <div className="community-author__avatar">
          {comment.author?.avatar_url ? <img src={comment.author.avatar_url} alt="" /> : <UserRound size={18} />}
        </div>
        <div>
          <strong>{comment.author?.full_name || "Membro JNE"}</strong>
          <span>
            {comment.author?.role === "admin" ? <ShieldCheck size={12} /> : null}
            {formatCommunityDate(comment.created_at)}
          </span>
        </div>
      </header>

      {comment.is_hidden ? (
        <p className="community-comment__hidden">Comentário ocultado: {comment.hidden_reason || "ação da moderação"}</p>
      ) : (
        <p>{comment.body}</p>
      )}

      <div className="community-comment__actions">
        <form action={toggleCommunityCommentLikeAction}>
          <input type="hidden" name="commentId" value={comment.id} />
          <input type="hidden" name="postId" value={postId} />
          <button className={`text-link ${comment.likedByCurrentUser ? "is-active" : ""}`} type="submit">
            <Heart size={15} fill={comment.likedByCurrentUser ? "currentColor" : "none"} />
            {comment.likeCount}
          </button>
        </form>
        <CommunityReportForm targetType="comment" targetId={comment.id} postId={postId} />
        {canDelete ? (
          <form action={deleteOwnCommunityCommentAction}>
            <input type="hidden" name="commentId" value={comment.id} />
            <input type="hidden" name="postId" value={postId} />
            <ConfirmSubmitButton
              className="text-link text-link--danger"
              message="Excluir este comentário?"
            >
              <Trash2 size={14} /> Excluir
            </ConfirmSubmitButton>
          </form>
        ) : null}
      </div>

      {!reply && !comment.is_hidden && canComment ? (
        <details className="community-reply-box">
          <summary>Responder</summary>
          <CommunityCommentForm postId={postId} parentCommentId={comment.id} compact />
        </details>
      ) : null}

      {comment.replies.length ? (
        <div className="community-replies">
          {comment.replies.map((item) => (
            <CommentItem
              key={item.id}
              comment={item}
              postId={postId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              reply
              canComment={canComment}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function CommunityComments({
  comments,
  postId,
  currentUserId,
  isAdmin,
  canComment,
}: {
  comments: CommunityCommentView[];
  postId: string;
  currentUserId: string;
  isAdmin: boolean;
  canComment: boolean;
}) {
  return (
    <section className="community-comments" id="comentarios">
      <div className="community-section-heading">
        <div>
          <span>CONVERSA</span>
          <h2>Comentários</h2>
        </div>
        <small>{comments.reduce((total, comment) => total + 1 + comment.replies.length, 0)} mensagens</small>
      </div>
      {comments.length ? (
        <div className="community-comments__list">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              canComment={canComment}
            />
          ))}
        </div>
      ) : (
        <div className="community-empty-card">
          <h3>Comece a conversa</h3>
          <p>Ainda não existem comentários nesta publicação.</p>
        </div>
      )}
    </section>
  );
}
