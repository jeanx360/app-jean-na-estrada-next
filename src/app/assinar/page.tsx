import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CreditCard, Crown, ExternalLink, QrCode, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { SubscriptionRequestForm } from "@/components/SubscriptionRequestForm";
import { CopyPixButton } from "@/components/CopyPixButton";
import { getAuthContext } from "@/lib/auth";
import { getLegalAcceptanceStatus } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Assinar VIP",
  description: "Assine o JNE App VIP e envie seu pagamento para liberação do acesso.",
};

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

const statusLabels = {
  pending: "Aguardando análise",
  approved: "Aprovado",
  rejected: "Não aprovado",
  cancelled: "Cancelado",
};

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default async function SubscribePage() {
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/assinar");

  const legal = await getLegalAcceptanceStatus(supabase, userId);
  if (!legal.complete) redirect("/aceite?next=/assinar");

  const [{ data: planData }, { data: requestData }, { data: entitlementData }] = await Promise.all([
    supabase.from("vip_plan_settings").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("vip_subscription_requests")
      .select("id, payment_method, amount_cents, status, admin_notes, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("vip_entitlements")
      .select("id, source, label, expires_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const plan = planData as Plan | null;
  const requests = (requestData ?? []) as RequestItem[];
  const hasVip = profile?.role === "vip" || profile?.role === "admin";

  return (
    <div className="page-stack subscription-page">
      <PageHeader
        icon={<Crown size={24} />}
        eyebrow="JNE APP VIP"
        title="Assine e libere a área VIP"
        description="Escolha a forma de pagamento, envie a identificação e aguarde a conferência administrativa."
      />

      {!plan?.is_active ? (
        <section className="vip-locked-card">
          <ShieldCheck size={38} />
          <h2>Assinaturas temporariamente indisponíveis</h2>
          <p>A administração ainda está configurando o plano. Sua conta gratuita continua funcionando normalmente.</p>
        </section>
      ) : (
        <>
          <section className="subscription-plan-card">
            <div className="subscription-plan-card__main">
              <span>PLANO MENSAL</span>
              <h2>{plan.plan_name}</h2>
              <p>{plan.description}</p>
              <strong>{money(plan.price_cents)}<small> por período</small></strong>
              <small>Após a confirmação, o acesso recebe validade padrão de {plan.billing_days} dias. A administração pode ajustar a validade em casos específicos.</small>
            </div>
            <ul>
              <li><CheckCircle2 size={17} /> Conteúdos e arquivos exclusivos</li>
              <li><CheckCircle2 size={17} /> Acesso à Comunidade VIP do JNE App</li>
              <li><CheckCircle2 size={17} /> Benefícios e materiais para membros</li>
              <li><CheckCircle2 size={17} /> Liberação vinculada à sua conta JNE</li>
            </ul>
          </section>

          {hasVip ? (
            <section className="subscription-access-status">
              <Crown size={24} />
              <div>
                <strong>Seu acesso VIP está ativo</strong>
                <p>
                  {entitlementData?.expires_at
                    ? `Validade atual: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(entitlementData.expires_at))}.`
                    : "Acesso sem data de expiração cadastrada."}
                </p>
              </div>
              <Link className="button button--secondary" href="/vip">Abrir área VIP</Link>
            </section>
          ) : null}

          <section className="subscription-payment-grid">
            {plan.recurring_payment_link ? (
              <article className="subscription-payment-card">
                <CreditCard size={28} />
                <span>RECOMENDADO</span>
                <h2>Link de assinatura</h2>
                <p>Faça o pagamento no provedor externo. O JNE App não recebe nem armazena os dados do seu cartão.</p>
                <a className="button button--primary" href={plan.recurring_payment_link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={17} /> Abrir pagamento
                </a>
              </article>
            ) : null}

            {plan.pix_enabled && plan.pix_key ? (
              <article className="subscription-payment-card">
                <QrCode size={28} />
                <span>ALTERNATIVA MANUAL</span>
                <h2>Pix mensal</h2>
                <p>Faça um Pix no valor de <strong>{money(plan.price_cents)}</strong> e envie o comprovante abaixo.</p>
                <div className="subscription-pix-box">
                  <small>{plan.pix_key_type?.toUpperCase()} · {plan.pix_holder_name}</small>
                  <code>{plan.pix_key}</code>
                  <CopyPixButton value={plan.pix_key} />
                </div>
                {plan.pix_instructions ? <p className="subscription-payment-note">{plan.pix_instructions}</p> : null}
              </article>
            ) : null}
          </section>

          <section className="subscription-request-section">
            <div>
              <span>CONFIRMAÇÃO</span>
              <h2>Já realizou o pagamento?</h2>
              <p>Envie uma referência ou comprovante. A liberação ainda é manual nesta fase inicial.</p>
            </div>
            <SubscriptionRequestForm
              userId={userId}
              paymentLinkEnabled={Boolean(plan.recurring_payment_link)}
              pixEnabled={plan.pix_enabled}
            />
          </section>
        </>
      )}

      <section className="subscription-history">
        <div><span>HISTÓRICO</span><h2>Seus pedidos</h2></div>
        {requests.length ? requests.map((item) => (
          <article key={item.id}>
            <div>
              <strong>{item.payment_method === "pix" ? "Pix" : "Link de assinatura"}</strong>
              <small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</small>
            </div>
            <span className={`subscription-status subscription-status--${item.status}`}>{statusLabels[item.status]}</span>
            <strong>{money(item.amount_cents)}</strong>
            {item.admin_notes ? <p>{item.admin_notes}</p> : null}
          </article>
        )) : <p>Nenhum pedido enviado até agora.</p>}
      </section>
    </div>
  );
}
