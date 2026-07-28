import type { Metadata } from "next";
import { Crown, LockKeyhole, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Área VIP",
  description: "Conteúdos exclusivos para membros VIP do JNE App.",
};

type VipContent = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  published_at: string;
};

export default async function VipPage() {
  const { userId, profile, supabase } = await getAuthContext();

  if (!userId) {
    redirect("/entrar?next=/vip");
  }

  const hasVipAccess = profile?.role === "vip" || profile?.role === "admin";

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
          <h2>Seu perfil ainda não possui acesso VIP</h2>
          <p>
            Sua conta continua ativa como membro gratuito. A liberação VIP será feita por convite,
            benefício ou autorização administrativa.
          </p>
        </section>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("vip_content")
    .select("id, title, description, category, published_at")
    .eq("is_published", true)
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

      {error ? (
        <div className="member-warning">
          <ShieldAlert size={20} />
          <div>
            <strong>Conteúdo ainda não configurado</strong>
            <p>Execute o SQL da versão 0.6.0 no Supabase antes de publicar conteúdos VIP.</p>
          </div>
        </div>
      ) : null}

      <section className="vip-grid">
        {items.length ? (
          items.map((item) => (
            <article className="vip-content-card" key={item.id}>
              <span>{item.category}</span>
              <h2>{item.title}</h2>
              <p>{item.description || "Conteúdo exclusivo liberado para membros VIP."}</p>
              <small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(item.published_at))}</small>
            </article>
          ))
        ) : (
          <article className="vip-content-card vip-content-card--empty">
            <Crown size={30} />
            <h2>A área VIP está funcionando</h2>
            <p>O acesso foi validado. Agora podemos cadastrar os primeiros conteúdos exclusivos.</p>
          </article>
        )}
      </section>
    </div>
  );
}
