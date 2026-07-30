export type DriverTripType = "outbound" | "return" | "round_trip";
export type DriverQuoteStatus = "draft" | "sent" | "accepted" | "completed" | "cancelled";

export type DriverSettings = {
  user_id: string;
  hourly_rate: number;
  km_rate: number;
  minimum_fare: number;
  waiting_hour_rate: number;
  maintenance_reserve_percent: number;
  rounding_step: number;
  updated_at?: string;
};

export type DriverQuote = {
  id: string;
  user_id: string;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
  travel_date: string | null;
  trip_type: DriverTripType;
  distance_per_leg_km: number;
  duration_per_leg_minutes: number;
  waiting_minutes: number;
  tolls: number;
  parking: number;
  other_costs: number;
  discount: number;
  km_rate: number;
  hourly_rate: number;
  waiting_hour_rate: number;
  minimum_fare: number;
  maintenance_reserve_percent: number;
  rounding_step: number;
  total_distance_km: number;
  billable_hours: number;
  distance_charge: number;
  time_charge: number;
  waiting_charge: number;
  maintenance_reserve: number;
  direct_costs: number;
  suggested_total: number;
  rounded_total: number;
  status: DriverQuoteStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_DRIVER_SETTINGS: Omit<DriverSettings, "user_id"> = {
  hourly_rate: 50,
  km_rate: 1.5,
  minimum_fare: 100,
  waiting_hour_rate: 30,
  maintenance_reserve_percent: 10,
  rounding_step: 5,
};

export const TRIP_TYPE_LABELS: Record<DriverTripType, string> = {
  outbound: "Somente ida",
  return: "Somente volta",
  round_trip: "Ida e volta",
};

export function asNumber(value: unknown, fallback = 0) {
  const normalized = typeof value === "string" ? value.replace(",", ".") : value;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : fallback;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}
