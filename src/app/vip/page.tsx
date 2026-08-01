import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgePercent,
  BarChart3,
  BellRing,
  CarFront,
  CheckCircle2,
  CreditCard,
  Crown,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  LockKeyhole,
  MessageCircle,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Star,
  Target,
} from "lucide-react";
import { redirect } from "next/navigation";
import { CopyPixButton } from "@/components/CopyPixButton";
import { PageHeader } from "@/components/PageHeader";
import { SubscriptionRequestForm } from "@/components/SubscriptionRequestForm";
import { getAuthContext } from "@/lib/auth";
import { getLegalAcceptanceStatus } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Área VIP",
  description: "Assinatura, benefícios, comunidade e conteúdos exclusivos do JNE App.",
};

export const dynamic = "force-dynamic";

type Plan = {
  plan_name: string;
  description: string;
  price_cents: number;
  billing_days: number;
  recurring_payment_link: string | null;
  pix_enabled: boolean;
  pix_key_type: string | null;
  pix_key: string | null;
  pix_holder_name: string | null;
  pix_instructions: string | null;
  is_active: boolean;
};

type RequestItem = {
  id: string;
  payment_method: "payment_link" | "pix";
  amount_cents: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  admin_notes: string | null;
  created_at: string;
};

type VipEntitlement = {
  source: string;
  label: string | null;
  expires_at: string | null;
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

const statusLabels = {
  pending: "Aguardando análise",
  approved: "Aprovado",
  rejected: "Não aprovado",
  cancelled: "Cancelado",
};

const benefits = [
  { icon: BarChart3, title: "Inteligência financeira", text: "Comparações, gráficos e análises para entender onde seu trabalho rende mais." },
  { icon: Target, title: "Metas e alertas", text: "Acompanhamento de objetivos mensais e avisos sobre valores pendentes e desempenho." },
  { icon: FileDown, title: "Relatórios", text: "Exportações em PDF e CSV para organizar e compartilhar seus resultados." },
  { icon: CarFront, title: "Mais veículos", text: "Controle de múltiplos veículos e rentabilidade individual nas próximas etapas." },
  { icon: MessageCircle, title: "Comunidade VIP", text: "Publicações, comentários, enquetes e troca de experiências entre membros." },
  { icon: Download, title: "Conteúdos e arquivos", text: "Materiais, downloads, tutoriais e documentos exclusivos." },
  { icon: BadgePercent, title: "Benefícios de parceiros", text: "Descontos, vantagens e ofertas direcionadas para membros." },
  { icon: BellRing, title: "Avisos exclusivos", text: "Notificações segmentadas sobre materiais, benefícios e novidades do plano." },
];

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

type Props = { searchParams: Promise<{ recurso?: string }> };

export default async function VipPage({ searchParams }: Props) {
  const { recurso } = await searchParams;
  const { userId, profile, supabase } = await getAuthContext();

  if (userId) {
    const legal = await getLegalAcceptanceStatus(supabase, userId);
    if (!legal.complete) redirect("/aceite?next=/vip");
  }

  const hasVipAccess = Boolean(
    userId && !profile?.is_blocked && (profile?.role === "vip" || profile?.role === "admin"),
  );

  const [{ data: planData }, requestResult, entitlementResult, contentResult] = await Promise.all([
    supabase.from("vip_plan_settings").select("*").eq("id", 1).maybeSingle(),
    userId
      ? supabase
          .from("vip_subscription_requests")
          .select("id, payment_method, amount_cents, status, admin_notes, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),
    userId
      ? supabase
          .from("vip_entitlements")
          .select("source, label, expires_at")
          .eq("user_id", userId)
          .eq("is_active", true)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    hasVipAccess
      ? supabase
          .from("vip_content")
          .select("id, title, description, category, content_type, external_url, file_path, content, is_featured, published_at")
          .eq("is_published", true)
          .order("is_featured", { ascending: false })
          .order("published_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const plan = planData as Plan | null;
  const requests = (requestResult.data ?? []) as RequestItem[];
  const entitlement = entitlementResult.data as VipEntitlement | null;
  const items = (contentResult.data ?? []) as VipContent[];

  if (profile?.is_blocked) {
    return (
      <div className="page-stack">
        <PageHeader icon={<ShieldAlert size={24} />} eyebrow="CONTA RESTRITA" title="Área VIP" description="O status da sua conta precisa ser regularizado antes de acessar ou solicitar o plano." />
        <section className="vip-locked-card">
          <ShieldAlert size={38} />
          <h2>Sua conta está bloqueada</h2>
          <p>{profile.blocked_reason || "Entre em contato com a administração do JNE App."}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack subscription-page vip-unified-page">
      <PageHeader
        icon={<Crown size={24} />}
        eyebrow={hasVipAccess ? "SEU PLANO ESTÁ ATIVO" : "JNE APP VIP"}
        title="Área VIP"
        description={hasVipAccess
          ? "Acesse seus conteúdos, comunidade, benefícios e acompanhe o status do plano."
          : "Conheça todos os benefícios, veja as prévias e faça a solicitação de acesso em uma única página."}
      />

      {recurso === "comunidade" && !hasVipAccess ? (
        <div className="member-warning member-warning--vip">
          <LockKeyhole size={20} />
          <div><strong>A Comunidade VIP faz parte deste plano</strong><p>Você pode conhecer o benefício abaixo. A participação é liberada automaticamente quando o VIP estiver ativo.</p></div>
        </div>
      ) : null}

      <section className="vip-benefits-section">
        <div className="section-heading"><span className="eyebrow">VANTAGENS DO VIP</span><h2>Mais inteligência, comunidade e benefícios</h2><p>O plano gratuito continua registrando e organizando sua rotina. O VIP acrescenta análise, automação e recursos avançados.</p></div>
        <div className="vip-benefits-grid">
          {benefits.map(({ icon: Icon, title, text }) => (
            <article key={title}><span><Crown size={13} /> VIP</span><Icon size={25} /><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      {hasVipAccess ? (
        <>
          <section className="subscription-access-status subscription-access-status--active">
            <Crown size={28} />
            <div>
              <strong>{profile?.role === "admin" ? "Acesso de administrador" : "Seu acesso VIP está ativo"}</strong>
              <p>{profile?.role === "admin"
                ? "Todos os recursos VIP estão liberados automaticamente para esta conta."
                : entitlement?.expires_at
                  ? `Validade atual: ${formatDate(entitlement.expires_at)}.`
                  : "Acesso sem data de expiração cadastrada."}</p>
              {entitlement?.label ? <small>{entitlement.label}</small> : null}
            </div>
            <Link className="button button--secondary" href="/membros">Gerenciar conta</Link>
          </section>

          <section className="vip-access-grid">
            <Link href="/comunidade"><MessageCircle size={25} /><div><strong>Comunidade VIP</strong><span>Publicações, comentários e enquetes.</span></div></Link>
            <Link href="/motorista"><BarChart3 size={25} /><div><strong>Ferramentas do motorista</strong><span>Controle profissional e evolução financeira.</span></div></Link>
            <Link href="/parceiros"><BadgePercent size={25} /><div><strong>Parceiros e benefícios</strong><span>Vantagens disponíveis para sua conta.</span></div></Link>
            <Link href="/membros"><ShieldCheck size={25} /><div><strong>Conta e validade</strong><span>Perfil, convites e status de acesso.</span></div></Link>
          </section>

          {contentResult.error ? (
            <div className="member-warning"><ShieldAlert size={20} /><div><strong>Conteúdo ainda não configurado</strong><p>Verifique a configuração da biblioteca VIP no Supabase.</p></div></div>
          ) : null}

          <section className="vip-content-section">
            <div className="section-heading"><span className="eyebrow">CONTEÚDOS EXCLUSIVOS</span><h2>Materiais liberados para você</h2></div>
            <div className="vip-grid">
              {items.length ? items.map((item) => (
                <article className={`vip-content-card ${item.is_featured ? "vip-content-card--featured" : ""}`} key={item.id}>
                  <div className="vip-content-card__topline"><span>{item.category}</span>{item.is_featured ? <small><Star size={13} /> Destaque</small> : null}</div>
                  <h2>{item.title}</h2>
                  <p>{item.description || "Conteúdo exclusivo liberado para membros VIP."}</p>
                  {item.content_type === "text" && item.content?.body ? <div className="vip-content-card__body"><FileText size={17} /><p>{item.content.body}</p></div> : null}
                  <div className="vip-content-card__footer">
                    <small>{formatDate(item.published_at)}</small>
                    {item.content_type === "file" && item.file_path ? <a className="button button--primary" href={`/api/vip/download?id=${encodeURIComponent(item.id)}`} target="_blank" rel="noopener noreferrer"><Download size={17} /> Baixar arquivo</a> : null}
                    {item.content_type === "link" && item.external_url ? <a className="button button--primary" href={item.external_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={17} /> Abrir conteúdo</a> : null}
                  </div>
                </article>
              )) : <article className="vip-content-card vip-content-card--empty"><Crown size={30} /><h2>Acesso validado</h2><p>Os próximos conteúdos exclusivos aparecerão aqui.</p></article>}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="vip-preview-section">
            <div className="section-heading"><span className="eyebrow">PRÉVIA TRANSPARENTE</span><h2>Veja o que o VIP acrescenta</h2><p>Os recursos permanecem visíveis. As ações avançadas são liberadas quando o plano estiver ativo.</p></div>
            <div className="vip-preview-grid">
              <article><span><Crown size={14} /> VIP</span><BarChart3 size={27} /><h3>Comparação entre meses</h3><div className="vip-preview-bars"><i /><i /><i /></div><p>Compare faturamento, despesas e lucro ao longo do tempo.</p></article>
              <article><span><Crown size={14} /> VIP</span><Target size={27} /><h3>Metas mensais</h3><div className="vip-preview-progress"><i /></div><p>Defina objetivos e acompanhe o progresso do mês.</p></article>
              <article><span><Crown size={14} /> VIP</span><FileDown size={27} /><h3>PDF e CSV</h3><div className="vip-preview-document" /><p>Gere relatórios organizados para guardar ou compartilhar.</p></article>
            </div>
          </section>

          {!plan?.is_active ? (
            <section className="vip-locked-card"><ShieldCheck size={38} /><h2>Assinaturas temporariamente indisponíveis</h2><p>A administração ainda está configurando o plano. Sua conta gratuita continua funcionando normalmente.</p></section>
          ) : (
            <>
              <section className="subscription-plan-card" id="assinar">
                <div className="subscription-plan-card__main">
                  <span>PLANO VIP</span><h2>{plan.plan_name}</h2><p>{plan.description}</p><strong>{money(plan.price_cents)}<small> por período</small></strong><small>Validade padrão de {plan.billing_days} dias após a confirmação.</small>
                </div>
                <ul>
                  <li><CheckCircle2 size={17} /> Plano gratuito sem limite de viagens ou lançamentos</li>
                  <li><CheckCircle2 size={17} /> Conteúdos, arquivos e Comunidade VIP</li>
                  <li><CheckCircle2 size={17} /> Ferramentas avançadas do motorista</li>
                  <li><CheckCircle2 size={17} /> Benefícios e materiais para membros</li>
                </ul>
              </section>

              {!userId ? (
                <section className="vip-login-cta"><LockKeyhole size={28} /><div><h2>Entre para solicitar o VIP</h2><p>O plano fica vinculado à sua conta e é liberado após a confirmação do pagamento.</p></div><Link className="button button--primary" href="/entrar?next=/vip">Entrar ou criar conta</Link></section>
              ) : (
                <>
                  <section className="subscription-payment-grid">
                    {plan.recurring_payment_link ? <article className="subscription-payment-card"><CreditCard size={28} /><span>RECOMENDADO</span><h2>Link de assinatura</h2><p>Faça o pagamento no provedor externo. O JNE App não armazena os dados do seu cartão.</p><a className="button button--primary" href={plan.recurring_payment_link} target="_blank" rel="noopener noreferrer"><ExternalLink size={17} /> Abrir pagamento</a></article> : null}
                    {plan.pix_enabled && plan.pix_key ? <article className="subscription-payment-card"><QrCode size={28} /><span>ALTERNATIVA MANUAL</span><h2>Pix</h2><p>Faça um Pix no valor de <strong>{money(plan.price_cents)}</strong> e envie o comprovante.</p><div className="subscription-pix-box"><small>{plan.pix_key_type?.toUpperCase()} · {plan.pix_holder_name}</small><code>{plan.pix_key}</code><CopyPixButton value={plan.pix_key} /></div>{plan.pix_instructions ? <p className="subscription-payment-note">{plan.pix_instructions}</p> : null}</article> : null}
                  </section>

                  <section className="subscription-request-section"><div><span>CONFIRMAÇÃO</span><h2>Já realizou o pagamento?</h2><p>Envie uma referência ou comprovante. A liberação é vinculada à sua conta.</p></div><SubscriptionRequestForm userId={userId} paymentLinkEnabled={Boolean(plan.recurring_payment_link)} pixEnabled={plan.pix_enabled} /></section>
                </>
              )}
            </>
          )}
        </>
      )}

      {userId && requests.length ? (
        <section className="subscription-history"><div><span>HISTÓRICO DA ASSINATURA</span><h2>Seus pedidos</h2></div>{requests.map((item) => <article key={item.id}><div><strong>{item.payment_method === "pix" ? "Pix" : "Link de assinatura"}</strong><small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</small></div><span className={`subscription-status subscription-status--${item.status}`}>{statusLabels[item.status]}</span><strong>{money(item.amount_cents)}</strong>{item.admin_notes ? <p>{item.admin_notes}</p> : null}</article>)}</section>
      ) : null}
    </div>
  );
}
