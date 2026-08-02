export type DriverTripType = "outbound" | "return" | "round_trip";
export type DriverQuoteStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "expired"
  | "completed"
  | "cancelled";
export type DriverTripStatus = "planned" | "completed" | "cancelled";
export type DriverPaymentStatus = "unpaid" | "partial" | "paid";
export type DriverEntryType = "income" | "expense";
export type DriverPaymentMethod = "pix" | "cash" | "card" | "transfer" | "other";
export type DriverFinancialCategory =
  | "payment"
  | "deposit"
  | "tip"
  | "other_income"
  | "toll"
  | "fuel_or_charge"
  | "parking"
  | "food"
  | "lodging"
  | "washing"
  | "maintenance"
  | "commission"
  | "other_expense";

export type DriverSettings = {
  user_id: string;
  hourly_rate: number;
  km_rate: number;
  minimum_fare: number;
  waiting_hour_rate: number;
  maintenance_reserve_percent: number;
  rounding_step: number;
  schedule_buffer_minutes: number;
  default_reservation_duration_minutes: number;
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
  customer_phone: string | null;
  customer_id: string | null;
  reservation_id: string | null;
  public_token: string;
  valid_until: string;
  travel_time: string | null;
  conditions: string | null;
  line_items: Array<{ kind: string; label: string; amount: number }>;
  view_count: number;
  sent_at: string | null;
  viewed_at: string | null;
  responded_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  cancelled_at: string | null;
  response_message: string | null;
  version: number;
  source: string | null;
  campaign_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverTrip = {
  id: string;
  user_id: string;
  quote_id: string | null;
  reservation_id: string | null;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
  travel_date: string | null;
  distance_km: number;
  worked_minutes: number;
  agreed_amount: number;
  gross_revenue: number;
  total_expenses: number;
  net_result: number;
  pending_amount: number;
  status: DriverTripStatus;
  payment_status: DriverPaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverFinancialEntry = {
  id: string;
  trip_id: string;
  user_id: string;
  entry_type: DriverEntryType;
  category: DriverFinancialCategory;
  amount: number;
  payment_method: DriverPaymentMethod | null;
  occurred_at: string;
  description: string | null;
  created_at: string;
};

export const DEFAULT_DRIVER_SETTINGS: Omit<DriverSettings, "user_id"> = {
  hourly_rate: 50,
  km_rate: 1.5,
  minimum_fare: 100,
  waiting_hour_rate: 30,
  maintenance_reserve_percent: 10,
  rounding_step: 5,
  schedule_buffer_minutes: 30,
  default_reservation_duration_minutes: 60,
};

export const TRIP_TYPE_LABELS: Record<DriverTripType, string> = {
  outbound: "Somente ida",
  return: "Somente volta",
  round_trip: "Ida e volta",
};

export const DRIVER_TRIP_STATUS_LABELS: Record<DriverTripStatus, string> = {
  planned: "Planejada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const DRIVER_PAYMENT_STATUS_LABELS: Record<DriverPaymentStatus, string> = {
  unpaid: "Pendente",
  partial: "Parcial",
  paid: "Pago",
};

export const DRIVER_PAYMENT_METHOD_LABELS: Record<DriverPaymentMethod, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  card: "Cartão",
  transfer: "Transferência",
  other: "Outro",
};

export const DRIVER_FINANCIAL_CATEGORY_LABELS: Record<DriverFinancialCategory, string> = {
  payment: "Pagamento",
  deposit: "Sinal",
  tip: "Gorjeta",
  other_income: "Outra receita",
  toll: "Pedágio",
  fuel_or_charge: "Combustível ou recarga",
  parking: "Estacionamento",
  food: "Alimentação",
  lodging: "Hospedagem",
  washing: "Lavagem",
  maintenance: "Manutenção",
  commission: "Comissão",
  other_expense: "Outra despesa",
};

export function asNumber(value: unknown, fallback = 0) {
  const normalized = typeof value === "string" ? value.replace(",", ".") : value;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : fallback;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export function formatDriverHours(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  if (!hours) return `${remainder} min`;
  if (!remainder) return `${hours}h`;
  return `${hours}h ${remainder}min`;
}

export function monthKeyInTimeZone(value: Date | string, timeZone = "America/Sao_Paulo") {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return year && month ? `${year}-${month}` : "";
}

export function driverTripMonthKey(trip: Pick<DriverTrip, "travel_date" | "created_at">) {
  if (trip.travel_date) return trip.travel_date.slice(0, 7);
  return monthKeyInTimeZone(trip.created_at);
}
