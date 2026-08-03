export type AdminExecutivePeriodKey = "today" | "7d" | "30d" | "90d" | "month" | "year";

export type AdminExecutivePeriod = {
  key: AdminExecutivePeriodKey;
  label: string;
  start: string;
  end: string;
};

export type AdminExecutiveDashboard = {
  period: {
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
  };
  platform: {
    total_accounts: number;
    active_accounts: number;
    blocked_accounts: number;
    professional_drivers: number;
    published_drivers: number;
    verified_network_drivers: number;
    active_customers: number;
    reservations_total: number;
    quotes_total: number;
    trips_total: number;
  };
  plans: {
    free_count: number;
    professional_count: number;
    premium_count: number;
  };
  current: AdminExecutivePeriodMetrics;
  previous: AdminExecutivePeriodMetrics;
  attention: {
    pending_payments: number;
    pending_driver_verifications: number;
    subscriptions_expiring: number;
    subscriptions_attention: number;
    pending_community_reports: number;
    automation_failures_7d: number;
    unread_targeted_notifications: number;
    content_drafts: number;
    blocked_accounts: number;
  };
  generatedAt: string;
};

export type AdminExecutivePeriodMetrics = {
  new_accounts: number;
  customers_created: number;
  reservations_created: number;
  reservations_confirmed: number;
  reservations_completed: number;
  quotes_created: number;
  quotes_accepted: number;
  quotes_declined: number;
  trips_created: number;
  trips_completed: number;
  referrals_created: number;
  referrals_accepted: number;
  automation_notifications: number;
  automation_runs: number;
  automation_failures: number;
};

export type AdminExecutiveActivityPoint = {
  bucket_start: string;
  accounts: number | string;
  reservations: number | string;
  quotes: number | string;
  trips: number | string;
};

const PERIOD_LABELS: Record<AdminExecutivePeriodKey, string> = {
  today: "Hoje",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  month: "Mês atual",
  year: "Ano atual",
};

function brazilDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function brazilMidnightUtc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
}

export function normalizeAdminExecutivePeriodKey(value: string | string[] | undefined): AdminExecutivePeriodKey {
  const key = Array.isArray(value) ? value[0] : value;
  return key && key in PERIOD_LABELS ? key as AdminExecutivePeriodKey : "30d";
}

export function buildAdminExecutivePeriod(key: AdminExecutivePeriodKey, now = new Date()): AdminExecutivePeriod {
  const end = now;
  const brazil = brazilDateParts(now);
  let start: Date;

  switch (key) {
    case "today":
      start = brazilMidnightUtc(brazil.year, brazil.month, brazil.day);
      break;
    case "7d":
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      start = brazilMidnightUtc(brazil.year, brazil.month, 1);
      break;
    case "year":
      start = brazilMidnightUtc(brazil.year, 1, 1);
      break;
    case "30d":
    default:
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  return {
    key,
    label: PERIOD_LABELS[key],
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function numericRecord<T extends Record<string, unknown>>(value: unknown, keys: readonly (keyof T)[]) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(keys.map((key) => [key, Number(source[String(key)] || 0)])) as T;
}

const PERIOD_METRIC_KEYS = [
  "new_accounts",
  "customers_created",
  "reservations_created",
  "reservations_confirmed",
  "reservations_completed",
  "quotes_created",
  "quotes_accepted",
  "quotes_declined",
  "trips_created",
  "trips_completed",
  "referrals_created",
  "referrals_accepted",
  "automation_notifications",
  "automation_runs",
  "automation_failures",
] as const;

export function parseAdminExecutiveDashboard(value: unknown): AdminExecutiveDashboard | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const period = source.period && typeof source.period === "object" ? source.period as Record<string, unknown> : {};

  return {
    period: {
      start: String(period.start || ""),
      end: String(period.end || ""),
      previousStart: String(period.previousStart || ""),
      previousEnd: String(period.previousEnd || ""),
    },
    platform: numericRecord<AdminExecutiveDashboard["platform"]>(source.platform, [
      "total_accounts",
      "active_accounts",
      "blocked_accounts",
      "professional_drivers",
      "published_drivers",
      "verified_network_drivers",
      "active_customers",
      "reservations_total",
      "quotes_total",
      "trips_total",
    ]),
    plans: numericRecord<AdminExecutiveDashboard["plans"]>(source.plans, ["free_count", "professional_count", "premium_count"]),
    current: numericRecord<AdminExecutivePeriodMetrics>(source.current, PERIOD_METRIC_KEYS),
    previous: numericRecord<AdminExecutivePeriodMetrics>(source.previous, PERIOD_METRIC_KEYS),
    attention: numericRecord<AdminExecutiveDashboard["attention"]>(source.attention, [
      "pending_payments",
      "pending_driver_verifications",
      "subscriptions_expiring",
      "subscriptions_attention",
      "pending_community_reports",
      "automation_failures_7d",
      "unread_targeted_notifications",
      "content_drafts",
      "blocked_accounts",
    ]),
    generatedAt: String(source.generatedAt || ""),
  };
}

export function adminMetricChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}
