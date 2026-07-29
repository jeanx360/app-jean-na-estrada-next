import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Crown, Link2, ShieldCheck, Unlink, Video } from "lucide-react";
import { redirect } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import { getLegalAcceptanceStatus } from "@/lib/legal";
import type { YouTubeMemberLink } from "@/types/youtube-membership";

export const metadata: Metadata = {
  title: "Vincular assinatura do YouTube",
  description: "Confirme sua assinatura do canal Jean na Estrada para liberar o acesso VIP.",
};

type PageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function MemberYouTubePage({ searchParams }: PageProps) {
  const { userId, profile, supabase } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/membros/youtube");

  const legal = await getLegalAcceptanceStatus(supabase, userId);
  if (!legal.complete) redirect("/aceite?next=/membros/youtube");

  const params = await searchParams;
  const [{ data: linkData }, { data: entitlementData }] = await Promise.all([
    supabase
      .from("youtube_member_links")
      .select("user_id, member_channel_id, display_name, profile_image_url, linked_at, last_verified_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("vip_entitlements")
      .select("label, is_active, starts_at, updated_at")
      .eq("user_id", userId)
      .eq("source", "youtube")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const link = linkData as YouTubeMemberLink | null;
  const youtubeVipActive = Boolean(entitlementData?.is_active);

  return (
    <div className="page-stack youtube-member-page">
      <PageHeader
        icon={<Video size={24} />}
        eyebrow="BENEFÍCIO DO CANAL"
        title="Vincular assinatura do YouTube"
        description="Confirme que o canal da sua conta Google é membro do Jean na Estrada e libere o benefício VIP no JNE App."
      />

      {params.success ? <p className="auth-message auth-message--success">{params.success}</p> : null}
      {params.error ? <p className="auth-message auth-message--error">{params.error}</p> : null}

      <section className={`youtube-link-card ${link ? "is-linked" : ""}`}>
        <div className="youtube-link-card__icon">
          {link?.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={link.profile_image_url} alt="" referrerPolicy="no-referrer" />
          ) : <Video size={34} />}
        </div>
        <div className="youtube-link-card__body">
          <span>{link ? "CONTA VINCULADA" : "VALIDAÇÃO DO BENEFÍCIO"}</span>
          <h2>{link?.display_name || "Use a mesma conta Google da sua assinatura"}</h2>
          <p>
            {link
              ? `Última verificação em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(link.last_verified_at))}.`
              : "O JNE App consultará somente os canais associados à conta escolhida para localizar sua assinatura ativa."}
          </p>
          {link ? <small>ID do canal: {link.member_channel_id}</small> : null}
        </div>
        <div className="youtube-link-card__status">
          {youtubeVipActive ? <><BadgeCheck size={18} /><strong>VIP ativo</strong></> : link ? <><ShieldCheck size={18} /><strong>Aguardando nova verificação</strong></> : <><Link2 size={18} /><strong>Não vinculado</strong></>}
        </div>
      </section>

      <section className="youtube-member-actions">
        {!link ? (
          <a className="button button--primary" href="/api/youtube/member/connect">
            <Link2 size={18} /> Vincular minha conta do YouTube
          </a>
        ) : (
          <>
            <Link className="button button--primary" href="/vip"><Crown size={18} /> Abrir área VIP</Link>
            <a className="button button--secondary" href="/api/youtube/member/connect"><ShieldCheck size={18} /> Verificar novamente</a>
            <form action="/api/youtube/member/unlink" method="post">
              <ConfirmSubmitButton
                className="button button--danger"
                message="Desvincular a conta do YouTube? O acesso VIP fornecido por essa assinatura será removido."
              >
                <Unlink size={18} /> Desvincular
              </ConfirmSubmitButton>
            </form>
          </>
        )}
      </section>

      <section className="youtube-privacy-card">
        <ShieldCheck size={24} />
        <div>
          <h3>O que será utilizado</h3>
          <p>O JNE App guarda o ID, nome e imagem pública do canal, o nível da assinatura e a data da última verificação. Senha, dados de pagamento e histórico de vídeos não são armazenados.</p>
          <Link href="/privacidade">Ler a Política de Privacidade</Link>
        </div>
      </section>

      {profile?.role === "admin" ? <Link className="button button--secondary" href="/admin/youtube">Abrir gestão do canal</Link> : null}
    </div>
  );
}
