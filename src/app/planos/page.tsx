import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  Crown,
  Layers3,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import {
  ACCOUNT_FEATURE_LABELS,
  ACCOUNT_FEATURE_REQUIRED_PLAN,
  ACCOUNT_PLAN_LABELS,
  ACCOUNT_STATUS_LABELS,
  DEFAULT_APP_PLANS,
  getAccountPlan,
  type AccountFeature,
  type AppPlanCatalogItem,
} from "@/lib/account-plan";
import { getAuthContext } from "@/lib/auth";
import { formatBrazilDate } from "@/lib/date-time";

export const metadata: Metadata = {
  title: "Planos do JNE App",
  description: "Compare os planos Gratuito, Profissional e Premium do JNE App.",
};
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ feature?: string; next?: string }>;
};

const FEATURE_GROUPS: Array<{ title: string; features: AccountFeature[] }> = [
  {
    title: "Começar",
    features: ["driver_profile", "qr_card", "basic_reservations", "calculator", "basic_settings"],
  },
  {
    title: "Operação profissional",
    features: ["crm", "schedule", "quotes", "finance", "exports"],
  },
  {
    title: "Crescimento e inteligência",
    features: ["performance", "marketing_campaigns", "advanced_reports", "customization"],
  },
];

function planIcon(code: AppPlanCatalogItem["code"]) {
  if (code === "premium") return <Crown size={25} />;
  if (code === "professional") return <Sparkles size={25} />;
  return <Layers3 size={25} />;
}

function planStatusText(status: string) {
  return status in ACCOUNT_STATUS_LABELS
    ? ACCOUNT_STATUS_LABELS[status as keyof typeof ACCOUNT_STATUS_LABELS]
    : "Ativo";
}

export default async function PlansPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, userId, profile } = await getAuthContext();
  const requestedFeature = query.feature && query.feature in ACCOUNT_FEATURE_LABELS
    ? query.feature as AccountFeature
    : null;
  const requestedPlan = requestedFeature ? ACCOUNT_FEATURE_REQUIRED_PLAN[requestedFeature] : null;

  const { data: planData } = await supabase
    .from("app_plan_catalog")
    .select("code,name,description,trial_days,features,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const plans = ((planData?.length ? planData : DEFAULT_APP_PLANS) as AppPlanCatalogItem[])
    .filter((plan) => ["free", "professional", "premium"].includes(plan.code));
  const currentPlan = userId
    ? await getAccountPlan(supabase, userId, profile?.role)
    : null;
  const nextPath = query.next?.startsWith("/") ? query.next : "/motorista";

  return (
    <div className="page-stack account-plans-page">
      <PageHeader
        icon={<Layers3 size={24} />}
        eyebrow="PLANOS DO JNE APP"
        title="Comece grátis e evolua quando precisar"
        description="Cada plano libera uma etapa da operação do motorista. Não há cobrança automática nesta fase: ativações e mudanças são controladas pela administração."
      />

      {requestedFeature && requestedPlan ? (
        <section className="account-plan-required-notice">
          <LockKeyhole size={24} />
          <div>
            <span>RECURSO PROTEGIDO</span>
            <h2>{ACCOUNT_FEATURE_LABELS[requestedFeature]}</h2>
            <p>Este recurso exige o plano {ACCOUNT_PLAN_LABELS[requestedPlan]} ou superior.</p>
          </div>
          <Link className="button button--secondary" href={userId ? "/vip#assinar" : `/entrar?next=${encodeURIComponent(`/planos?feature=${requestedFeature}&next=${nextPath}`)}`}>
            {userId ? "Solicitar liberação" : "Entrar na conta"}
          </Link>
        </section>
      ) : null}

      {currentPlan ? (
        <section className={`account-current-plan account-current-plan--${currentPlan.code}`}>
          <div className="account-current-plan__icon"><BadgeCheck size={28} /></div>
          <div>
            <span>SEU PLANO ATUAL</span>
            <h2>{currentPlan.name}</h2>
            <p>{planStatusText(currentPlan.status)}{currentPlan.source === "legacy_vip" ? " · acesso VIP preservado" : ""}</p>
            {currentPlan.trialEndsAt ? <small><CalendarClock size={14} /> Teste até {formatBrazilDate(currentPlan.trialEndsAt)}</small> : null}
            {!currentPlan.trialEndsAt && currentPlan.expiresAt ? <small><CalendarClock size={14} /> Válido até {formatBrazilDate(currentPlan.expiresAt)}</small> : null}
          </div>
          {requestedFeature && currentPlan.features.includes(requestedFeature)
            ? <Link className="button button--primary" href={nextPath}>Continuar <ArrowRight size={17} /></Link>
            : <Link className="button button--secondary" href="/membros">Ver minha conta</Link>}
        </section>
      ) : null}

      <section className="account-plan-grid" aria-label="Comparação de planos">
        {plans.map((plan) => {
          const isCurrent = currentPlan?.code === plan.code;
          return (
            <article className={`account-plan-card account-plan-card--${plan.code}${isCurrent ? " is-current" : ""}`} key={plan.code}>
              <header>
                <div className="account-plan-card__icon">{planIcon(plan.code)}</div>
                <div><span>{plan.code === "free" ? "COMECE AGORA" : plan.code === "professional" ? "OPERAÇÃO" : "CRESCIMENTO"}</span><h2>{plan.name}</h2></div>
                {isCurrent ? <b>Plano atual</b> : null}
              </header>
              <p>{plan.description}</p>
              {plan.trial_days > 0 ? <small className="account-plan-trial"><CalendarClock size={14} /> Até {plan.trial_days} dias de teste configurável</small> : null}
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}><Check size={16} /> {ACCOUNT_FEATURE_LABELS[feature]}</li>
                ))}
              </ul>
              {isCurrent ? (
                <Link className="button button--secondary" href="/motorista">Abrir painel</Link>
              ) : plan.code === "free" ? (
                <Link className="button button--secondary" href={userId ? "/perfil" : "/cadastro"}>{userId ? "Configurar perfil" : "Criar conta"}</Link>
              ) : (
                <Link className="button button--primary" href={userId ? "/vip#assinar" : "/entrar?next=/planos"}>Solicitar {plan.name}</Link>
              )}
            </article>
          );
        })}
      </section>

      <section className="account-feature-matrix">
        <div className="section-heading"><span className="eyebrow">COMPARAÇÃO COMPLETA</span><h2>O que cada plano libera</h2></div>
        {FEATURE_GROUPS.map((group) => (
          <div className="account-feature-group" key={group.title}>
            <h3>{group.title}</h3>
            <div>
              {group.features.map((feature) => (
                <article key={feature}>
                  <span>{ACCOUNT_FEATURE_LABELS[feature]}</span>
                  <strong>{ACCOUNT_PLAN_LABELS[ACCOUNT_FEATURE_REQUIRED_PLAN[feature]]}</strong>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
