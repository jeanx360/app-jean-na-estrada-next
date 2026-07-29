import type { Metadata } from "next";
import { Crown, Download, ExternalLink, FileText, LockKeyhole, MessageCircle, ShieldAlert, Star } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import { getLegalAcceptanceStatus } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Área VIP",
  description: "Conteúdos exclusivos para membros VIP do JNE App.",
};

type VipContent = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content_type: "text" | "file" | "link";
  external_url: string | null;
  file_path: string | null;
  content: { body?: string } | null;
  is_featured: boolean;
  published_at: string;
};

export default async function VipPage() {
  const { userId, profile, supabase } = await getAuthContext();

  if (!userId) {
    redirect("/entrar?next=/vip");
  }

  const legal = await getLegalAcceptanceStatus(supabase, userId);
  if (!legal.complete) redirect("/aceite?next=/vip");

  const hasVipAccess =
    !profile?.is_blocked && (profile?.role === "vip" || profile?.role === "admin");

  if (!hasVipAccess) {
    return (
      <div className="page-stack">
        <PageHeader
          icon={<LockKeyhole size={24} />}
          eyebrow="ACESSO RESTRITO"
          title="Área VIP"
          description="Este espaço aparece somente para membros autorizados."
        />
        <section className="vip-locked-card">
          <ShieldAlert size={38} />
          <h2>{profile?.is_blocked ? "Sua conta está bloqueada" : "Seu perfil ainda não possui acesso VIP"}</h2>
          <p>
            {profile?.is_blocked
              ? "Entre em contato com a administração do JNE App."
              : "Sua conta continua ativa como membro gratuito. Assine o plano, use um convite ou aguarde a liberação administrativa."}
          </p>
          {!profile?.is_blocked ? <Link className="button button--primary" href="/assinar">Conhecer assinatura VIP</Link> : null}
        </section>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("vip_content")
    .select("id, title, description, category, content_type, external_url, file_path, content, is_featured, published_at")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false });

  const items = (data ?? []) as VipContent[];

  return (
    <div className="page-stack">
      <PageHeader
        icon={<Crown size={24} />}
        eyebrow="MEMBROS AUTORIZADOS"
        title="Área VIP"
        description="Tutoriais, arquivos, recados e benefícios exclusivos do JNE App."
      />

      <section className="vip-community-banner">
        <div>
          <MessageCircle size={25} />
          <div>
            <span>COMUNIDADE VIP</span>
            <h2>Converse com outros membros do JNE App</h2>
            <p>Publique dúvidas, experiências, imagens e enquetes em um espaço exclusivo e moderado.</p>
          </div>
        </div>
        <Link className="button button--primary" href="/comunidade">Entrar na comunidade</Link>
      </section>

      {error ? (
        <div className="member-warning">
          <ShieldAlert size={20} />
          <div>
            <strong>Conteúdo ainda não configurado</strong>
            <p>Execute a migração SQL da versão 0.7.0 no Supabase.</p>
          </div>
        </div>
      ) : null}

      <section className="vip-grid">
        {items.length ? (
          items.map((item) => (
            <article className={`vip-content-card ${item.is_featured ? "vip-content-card--featured" : ""}`} key={item.id}>
              <div className="vip-content-card__topline">
                <span>{item.category}</span>
                {item.is_featured ? <small><Star size={13} /> Destaque</small> : null}
              </div>
              <h2>{item.title}</h2>
              <p>{item.description || "Conteúdo exclusivo liberado para membros VIP."}</p>

              {item.content_type === "text" && item.content?.body ? (
                <div className="vip-content-card__body"><FileText size={17} /><p>{item.content.body}</p></div>
              ) : null}

              <div className="vip-content-card__footer">
                <small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(item.published_at))}</small>
                {item.content_type === "file" && item.file_path ? (
                  <a
                    className="button button--primary"
                    href={`/api/vip/download?id=${encodeURIComponent(item.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download size={17} /> Baixar arquivo
                  </a>
                ) : null}
                {item.content_type === "link" && item.external_url ? (
                  <a className="button button--primary" href={item.external_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={17} /> Abrir conteúdo
                  </a>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <article className="vip-content-card vip-content-card--empty">
            <Crown size={30} />
            <h2>A área VIP está funcionando</h2>
            <p>O acesso foi validado. Cadastre o primeiro conteúdo pelo painel administrativo.</p>
          </article>
        )}
      </section>
    </div>
  );
}
