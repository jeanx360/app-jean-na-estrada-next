import type { Metadata } from "next";
import Link from "next/link";
import {
  BellRing,
  Crown,
  MessageCircle,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CommunityPostCard } from "@/components/CommunityPostCard";
import { requireCommunityAccess } from "@/lib/community";
import { loadCommunityFeed } from "@/lib/community-data";
import type { CommunityCategory } from "@/types/community";

export const metadata: Metadata = {
  title: "Comunidade VIP",
  description: "Comunidade exclusiva dos membros VIP do JNE App.",
};

type Props = {
  searchParams: Promise<{ categoria?: string }>;
};

export default async function CommunityPage({ searchParams }: Props) {
  const { categoria } = await searchParams;
  const { supabase, userId, profile } = await requireCommunityAccess("/comunidade");

  const [{ data: categoriesData }, postsResult, { count: unreadCount }, { data: restriction }] = await Promise.all([
    supabase
      .from("community_categories")
      .select("id, slug, name, description, icon, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    loadCommunityFeed(supabase, userId, categoria),
    supabase
      .from("community_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false),
    supabase
      .from("community_member_restrictions")
      .select("can_post, can_comment, restricted_until, reason")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const categories = (categoriesData ?? []) as CommunityCategory[];
  const posts = postsResult;
  const postRestricted = restriction?.can_post === false && (
    !restriction.restricted_until || new Date(restriction.restricted_until) > new Date()
  );

  return (
    <div className="page-stack community-page">
      <PageHeader
        icon={<MessageCircle size={24} />}
        eyebrow="MEMBROS VIP"
        title="Comunidade JNE"
        description="Troque experiências, faça perguntas e converse com quem vive o universo dos carros elétricos."
      />

      <section className="community-hero-actions">
        <div>
          <Crown size={22} />
          <div>
            <strong>Espaço exclusivo e moderado</strong>
            <span>Somente membros VIP e administradores podem participar.</span>
          </div>
        </div>
        <nav>
          <Link className="button button--secondary" href="/comunidade/notificacoes">
            <BellRing size={17} /> Interações
            {unreadCount ? <small>{unreadCount}</small> : null}
          </Link>
          {!postRestricted ? (
            <Link className="button button--primary" href="/comunidade/novo">
              <Plus size={17} /> Nova publicação
            </Link>
          ) : null}
        </nav>
      </section>

      {postRestricted ? (
        <div className="member-warning">
          <ShieldCheck size={20} />
          <div>
            <strong>Publicações temporariamente limitadas</strong>
            <p>{restriction?.reason || "Sua conta pode acompanhar e interagir conforme as regras definidas pela moderação."}</p>
          </div>
        </div>
      ) : null}

      <section className="community-rules-strip">
        <Sparkles size={19} />
        <p><strong>Regra principal:</strong> discorde das ideias sem atacar as pessoas. Spam, pirataria, golpes e exposição de dados pessoais serão removidos.</p>
      </section>

      <nav className="community-category-tabs" aria-label="Categorias da comunidade">
        <Link href="/comunidade" className={!categoria ? "is-active" : ""}>Todas</Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/comunidade?categoria=${category.slug}`}
            className={categoria === category.slug ? "is-active" : ""}
          >
            {category.name}
          </Link>
        ))}
      </nav>

      <section className="community-feed">
        {posts.length ? (
          posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              currentUserId={userId}
              isAdmin={profile?.role === "admin"}
            />
          ))
        ) : (
          <article className="community-empty-card">
            <MessageCircle size={34} />
            <h2>Nenhuma publicação nesta categoria</h2>
            <p>Seja o primeiro membro a iniciar uma conversa útil para a comunidade.</p>
            {!postRestricted ? <Link className="button button--primary" href="/comunidade/novo">Criar publicação</Link> : null}
          </article>
        )}
      </section>
    </div>
  );
}
