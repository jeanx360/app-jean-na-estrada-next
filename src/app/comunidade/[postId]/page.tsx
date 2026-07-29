import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { CommunityCommentForm } from "@/components/CommunityCommentForm";
import { CommunityComments } from "@/components/CommunityComments";
import { CommunityPostCard } from "@/components/CommunityPostCard";
import { requireCommunityAccess } from "@/lib/community";
import { loadCommunityComments, loadCommunityPost } from "@/lib/community-data";

type Props = { params: Promise<{ postId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;
  return {
    title: `Conversa ${postId.slice(0, 8)}`,
    description: "Publicação da Comunidade VIP do JNE App.",
  };
}

export default async function CommunityPostPage({ params }: Props) {
  const { postId } = await params;
  const { supabase, userId, profile } = await requireCommunityAccess(`/comunidade/${postId}`);
  const [post, comments, { data: canComment }] = await Promise.all([
    loadCommunityPost(supabase, userId, postId),
    loadCommunityComments(supabase, userId, postId),
    supabase.rpc("community_can_comment"),
  ]);

  if (!post) notFound();

  return (
    <div className="page-stack community-page community-detail-page">
      <Link className="text-link community-back-link" href="/comunidade"><ArrowLeft size={17} /> Voltar ao feed</Link>
      <CommunityPostCard
        post={post}
        currentUserId={userId}
        isAdmin={profile?.role === "admin"}
        detail
      />

      {post.is_locked ? (
        <div className="community-locked-message">
          <LockKeyhole size={20} />
          <div><strong>Conversa bloqueada</strong><p>A publicação continua disponível, mas não aceita novos comentários.</p></div>
        </div>
      ) : canComment ? (
        <section className="community-new-comment">
          <div className="community-section-heading">
            <div><span>PARTICIPE</span><h2>Deixe seu comentário</h2></div>
            <MessageCircle size={23} />
          </div>
          <CommunityCommentForm postId={postId} />
        </section>
      ) : (
        <div className="community-locked-message">
          <LockKeyhole size={20} />
          <div><strong>Comentários temporariamente limitados</strong><p>Sua conta pode acompanhar a conversa, mas não pode comentar agora.</p></div>
        </div>
      )}

      <CommunityComments
        comments={comments}
        postId={postId}
        currentUserId={userId}
        isAdmin={profile?.role === "admin"}
        canComment={Boolean(canComment) && !post.is_locked}
      />
    </div>
  );
}
