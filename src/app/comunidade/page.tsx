import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, MessageCircle, ShieldCheck } from "lucide-react";
import { CommunityPostCard } from "@/components/CommunityPostCard";
import { CommunityPostForm } from "@/components/CommunityPostForm";
import { requireCommunityAccess } from "@/lib/community";
import { loadCommunityFeed } from "@/lib/community-data";
import type { CommunityCategory } from "@/types/community";

export const metadata: Metadata = {
  title: "Comunidade VIP",
  description: "Comunidade exclusiva dos membros VIP do JNE App.",
};

type Props = { searchParams: Promise<{ categoria?: string }> };

export default async function CommunityPage({ searchParams }: Props) {
  const { categoria } = await searchParams;
  const { supabase, userId, profile } = await requireCommunityAccess("/comunidade");

  const [{ data: categoriesData }, posts, { count: unreadCount }, { data: restriction }] = await Promise.all([
    supabase.from("community_categories").select("id, slug, name, description, icon, sort_order, is_active").eq("is_active", true).order("sort_order", { ascending: true }),
    loadCommunityFeed(supabase, userId, categoria),
    supabase.from("community_notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false),
    supabase.from("community_member_restrictions").select("can_post, can_comment, restricted_until, reason").eq("user_id", userId).maybeSingle(),
  ]);

  const categories = (categoriesData ?? []) as CommunityCategory[];
  const postRestricted = restriction?.can_post === false && (!restriction.restricted_until || new Date(restriction.restricted_until) > new Date());

  return (
    <div className="page-stack community-page community-page--minimal">
      <header className="community-feed-heading">
        <div><span>MEMBROS VIP</span><h1>Comunidade</h1><p>Compartilhe experiências, dúvidas e novidades com os membros do JNE App.</p></div>
        <Link className="community-icon-link" href="/comunidade/notificacoes" aria-label="Abrir interações">
          <BellRing size={20} />{unreadCount ? <small>{unreadCount}</small> : null}
        </Link>
      </header>

      {postRestricted ? (
        <div className="member-warning"><ShieldCheck size={20} /><div><strong>Publicações temporariamente limitadas</strong><p>{restriction?.reason || "Sua conta pode acompanhar as conversas, mas não publicar neste momento."}</p></div></div>
      ) : (
        <CommunityPostForm userId={userId} categories={categories} compact avatarUrl={profile?.avatar_url} />
      )}

      <nav className="community-category-tabs" aria-label="Categorias da comunidade">
        <Link href="/comunidade" className={!categoria ? "is-active" : ""}>Para você</Link>
        {categories.map((category) => <Link key={category.id} href={`/comunidade?categoria=${category.slug}`} className={categoria === category.slug ? "is-active" : ""}>{category.name}</Link>)}
      </nav>

      <section className="community-feed">
        {posts.length ? posts.map((post) => <CommunityPostCard key={post.id} post={post} currentUserId={userId} isAdmin={profile?.role === "admin"} />) : (
          <article className="community-empty"><MessageCircle size={34} /><h2>Nenhuma publicação por aqui</h2><p>Seja a primeira pessoa a compartilhar algo com a comunidade.</p></article>
        )}
      </section>
    </div>
  );
}
