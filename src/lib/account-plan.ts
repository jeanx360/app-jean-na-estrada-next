import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import type { MemberProfile, MemberRole } from "@/types/auth";

export type AccountPlanCode = "free" | "professional" | "premium";
export type AccountSubscriptionStatus = "trial" | "active" | "past_due" | "suspended" | "cancelled" | "expired";
export type AccountFeature =
  | "driver_profile"
  | "qr_card"
  | "basic_reservations"
  | "calculator"
  | "basic_settings"
  | "crm"
  | "schedule"
  | "quotes"
  | "finance"
  | "exports"
  | "performance"
  | "marketing_campaigns"
  | "advanced_reports"
  | "customization";

export type AccountPlanAccess = {
  code: AccountPlanCode;
  name: string;
  status: AccountSubscriptionStatus | "active";
  startsAt: string | null;
  expiresAt: string | null;
  trialEndsAt: string | null;
  source: "default" | "assignment" | "assignment_inactive" | "legacy_vip" | "admin" | "fallback";
  features: AccountFeature[];
};

export type AppPlanCatalogItem = {
  code: AccountPlanCode;
  name: string;
  description: string;
  trial_days: number;
  features: AccountFeature[];
  sort_order: number;
  is_active: boolean;
};

export const ACCOUNT_PLAN_LABELS: Record<AccountPlanCode, string> = {
  free: "Gratuito",
  professional: "Profissional",
  premium: "Premium",
};

export const ACCOUNT_STATUS_LABELS: Record<AccountSubscriptionStatus, string> = {
  trial: "Período de teste",
  active: "Ativo",
  past_due: "Pagamento pendente",
  suspended: "Suspenso",
  cancelled: "Cancelado",
  expired: "Expirado",
};

export const ACCOUNT_FEATURE_LABELS: Record<AccountFeature, string> = {
  driver_profile: "Perfil profissional",
  qr_card: "QR Code e cartão digital",
  basic_reservations: "Reservas básicas",
  calculator: "Calculadora de viagens",
  basic_settings: "Configurações básicas",
  crm: "CRM de passageiros",
  schedule: "Agenda avançada",
  quotes: "Orçamentos profissionais",
  finance: "Financeiro profissional",
  exports: "Exportações CSV e PDF",
  performance: "Inteligência de desempenho",
  marketing_campaigns: "Campanhas rastreáveis",
  advanced_reports: "Relatórios avançados",
  customization: "Personalização ampliada",
};

export const ACCOUNT_FEATURE_REQUIRED_PLAN: Record<AccountFeature, AccountPlanCode> = {
  driver_profile: "free",
  qr_card: "free",
  basic_reservations: "free",
  calculator: "free",
  basic_settings: "free",
  crm: "professional",
  schedule: "professional",
  quotes: "professional",
  finance: "professional",
  exports: "professional",
  performance: "premium",
  marketing_campaigns: "premium",
  advanced_reports: "premium",
  customization: "premium",
};

const FREE_FEATURES: AccountFeature[] = [
  "driver_profile",
  "qr_card",
  "basic_reservations",
  "calculator",
  "basic_settings",
];

const PROFESSIONAL_FEATURES: AccountFeature[] = [
  ...FREE_FEATURES,
  "crm",
  "schedule",
  "quotes",
  "finance",
  "exports",
];

const PREMIUM_FEATURES: AccountFeature[] = [
  ...PROFESSIONAL_FEATURES,
  "performance",
  "marketing_campaigns",
  "advanced_reports",
  "customization",
];

export const DEFAULT_APP_PLANS: AppPlanCatalogItem[] = [
  {
    code: "free",
    name: "Gratuito",
    description: "Perfil profissional, QR Code, calculadora e reservas básicas para começar.",
    trial_days: 0,
    features: FREE_FEATURES,
    sort_order: 10,
    is_active: true,
  },
  {
    code: "professional",
    name: "Profissional",
    description: "CRM, agenda, orçamentos, financeiro e exportações para organizar a operação.",
    trial_days: 14,
    features: PROFESSIONAL_FEATURES,
    sort_order: 20,
    is_active: true,
  },
  {
    code: "premium",
    name: "Premium",
    description: "Todos os recursos profissionais, inteligência, campanhas e relatórios avançados.",
    trial_days: 14,
    features: PREMIUM_FEATURES,
    sort_order: 30,
    is_active: true,
  },
];

function fallbackPlan(role?: MemberRole | null): AccountPlanAccess {
  if (role === "admin") {
    return {
      code: "premium",
      name: ACCOUNT_PLAN_LABELS.premium,
      status: "active",
      startsAt: null,
      expiresAt: null,
      trialEndsAt: null,
      source: "admin",
      features: PREMIUM_FEATURES,
    };
  }

  if (role === "vip") {
    return {
      code: "premium",
      name: ACCOUNT_PLAN_LABELS.premium,
      status: "active",
      startsAt: null,
      expiresAt: null,
      trialEndsAt: null,
      source: "legacy_vip",
      features: PREMIUM_FEATURES,
    };
  }

  return {
    code: "free",
    name: ACCOUNT_PLAN_LABELS.free,
    status: "active",
    startsAt: null,
    expiresAt: null,
    trialEndsAt: null,
    source: "fallback",
    features: FREE_FEATURES,
  };
}

export async function getAccountPlan(
  supabase: any,
  userId: string,
  role?: MemberRole | null,
): Promise<AccountPlanAccess> {
  const { data, error } = await supabase.rpc("current_account_plan", { target_user_id: userId });

  if (error || !data) return fallbackPlan(role);

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (!row) return fallbackPlan(role);

  const code = row.plan_code === "professional" || row.plan_code === "premium" ? row.plan_code : "free";
  const features = Array.isArray(row.features)
    ? row.features.filter((feature): feature is AccountFeature => typeof feature === "string" && feature in ACCOUNT_FEATURE_LABELS)
    : fallbackPlan(role).features;

  return {
    code,
    name: typeof row.plan_name === "string" ? row.plan_name : ACCOUNT_PLAN_LABELS[code],
    status: typeof row.status === "string" ? row.status as AccountPlanAccess["status"] : "active",
    startsAt: typeof row.starts_at === "string" ? row.starts_at : null,
    expiresAt: typeof row.expires_at === "string" ? row.expires_at : null,
    trialEndsAt: typeof row.trial_ends_at === "string" ? row.trial_ends_at : null,
    source: typeof row.source === "string" ? row.source as AccountPlanAccess["source"] : "fallback",
    features,
  };
}

export function accountHasFeature(plan: AccountPlanAccess, feature: AccountFeature) {
  return plan.features.includes(feature);
}

export function planUpgradeUrl(feature: AccountFeature, nextPath: string) {
  const params = new URLSearchParams({ feature, next: nextPath });
  return `/planos?${params.toString()}`;
}

export async function requireDriverFeature(feature: AccountFeature, nextPath: string) {
  const context = await getAuthContext();
  if (!context.userId) redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  if (!context.profile?.is_professional_driver || context.profile.is_blocked) redirect("/perfil");

  const userId = context.userId as string;
  const profile = context.profile as MemberProfile;
  const accountPlan = await getAccountPlan(context.supabase, userId, profile.role);
  if (!accountHasFeature(accountPlan, feature)) redirect(planUpgradeUrl(feature, nextPath));

  return { ...context, userId, profile, accountPlan };
}

export async function assertDriverFeature(feature: AccountFeature) {
  const context = await getAuthContext();
  if (!context.userId || !context.profile?.is_professional_driver || context.profile.is_blocked) {
    throw new Error("Acesso de motorista profissional necessário.");
  }

  const userId = context.userId as string;
  const profile = context.profile as MemberProfile;
  const accountPlan = await getAccountPlan(context.supabase, userId, profile.role);
  if (!accountHasFeature(accountPlan, feature)) {
    const requiredPlan = ACCOUNT_PLAN_LABELS[ACCOUNT_FEATURE_REQUIRED_PLAN[feature]];
    throw new Error(`Este recurso exige o plano ${requiredPlan}.`);
  }

  return { ...context, userId, profile, accountPlan };
}
