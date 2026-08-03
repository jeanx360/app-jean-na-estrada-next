import type { Metadata } from "next";
import { MessageCircle, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SmartBackButton } from "@/components/SmartBackButton";
import { CommunityPostForm } from "@/components/CommunityPostForm";
import { requireCommunityAccess } from "@/lib/community";
import type { CommunityCategory } from "@/types/community";

export const metadata: Metadata = {
  title: "Nova publicação",
  description: "Crie uma publicação na Comunidade VIP do JNE App.",
};

export default async function NewCommunityPostPage() {
  const { supabase, userId } = await requireCommunityAccess("/comunidade/novo");
  const [{ data: categoriesData }, { data: canPost }] = await Promise.all([
    supabase
      .from("community_categories")
      .select("id, slug, name, description, icon, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.rpc("community_can_post"),
  ]);
  const categories = (categoriesData ?? []) as CommunityCategory[];

  return (
    <div className="page-stack community-page">
      <SmartBackButton className="text-link community-back-link" fallbackHref="/comunidade" label="Voltar à comunidade" />
      <PageHeader
        icon={<MessageCircle size={24} />}
        eyebrow="COMUNIDADE VIP"
        title="Nova publicação"
        description="Compartilhe algo útil, faça uma pergunta ou crie uma enquete para os membros."
      />

      {!canPost ? (
        <article className="vip-locked-card">
          <ShieldAlert size={36} />
          <h2>Sua conta não pode publicar neste momento</h2>
          <p>Você ainda pode acompanhar as conversas. Consulte a administração caso precise revisar a restrição.</p>
        </article>
      ) : (
        <CommunityPostForm userId={userId} categories={categories} />
      )}
    </div>
  );
}
