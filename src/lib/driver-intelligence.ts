import {
  DRIVER_MARKETING_SOURCE_LABELS,
  type DriverMarketingSource,
} from "@/lib/driver-marketing";

export type DriverPerformanceSummary = {
  period_days: number | string;
  profile_views: number | string;
  whatsapp_clicks: number | string;
  reservation_starts: number | string;
  reservation_submissions: number | string;
  reservations_total: number | string;
  confirmed_reservations: number | string;
  completed_trips: number | string;
  gross_revenue: number | string;
  net_result: number | string;
  recurring_customers: number | string;
  previous_profile_views: number | string;
  previous_reservation_submissions: number | string;
  previous_completed_trips: number | string;
  previous_net_result: number | string;
};

export type DriverPerformanceSource = {
  source: DriverMarketingSource;
  profile_views: number | string;
  whatsapp_clicks: number | string;
  reservation_starts: number | string;
  reservation_submissions: number | string;
  reservations_total: number | string;
  completed_trips: number | string;
  gross_revenue: number | string;
  net_result: number | string;
};

export type DriverPerformanceCampaign = {
  campaign_id: string;
  name: string;
  code: string;
  source: DriverMarketingSource;
  is_active: boolean;
  profile_views: number | string;
  whatsapp_clicks: number | string;
  reservation_submissions: number | string;
  reservations_total: number | string;
  completed_trips: number | string;
  net_result: number | string;
};

export type DriverPerformanceService = {
  package_id: string;
  title: string;
  reservation_count: number | string;
  completed_trips: number | string;
  gross_revenue: number | string;
  net_result: number | string;
};

export type DriverDemandPeriod = {
  dimension: "weekday" | "request_hour" | "travel_hour";
  bucket: number | string;
  total: number | string;
};

export type AdminDriverIntelligenceSummary = {
  active_drivers: number | string;
  profile_views: number | string;
  whatsapp_clicks: number | string;
  reservations_total: number | string;
  completed_trips: number | string;
  gross_revenue: number | string;
  net_result: number | string;
  recurring_customers: number | string;
};

export const DRIVER_SOURCE_LABELS = DRIVER_MARKETING_SOURCE_LABELS;

export const DRIVER_WEEKDAY_LABELS: Record<number, string> = {
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
  7: "Domingo",
};

export function intelligenceNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function percentage(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

export function periodChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}
