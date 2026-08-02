import {
  DRIVER_FINANCIAL_CATEGORY_LABELS,
  type DriverFinancialCategory,
  type DriverFinancialEntry,
  type DriverTrip,
} from "@/lib/driver";

export type DriverFinancePeriod = "month" | "previous_month" | "30d" | "90d" | "year";

export type DriverFinanceWindow = {
  period: DriverFinancePeriod;
  startDate: string;
  endDate: string;
  previousStartDate: string;
  previousEndDate: string;
  monthKey: string;
  label: string;
  previousLabel: string;
};

export type DriverFinanceSummary = {
  completedTrips: number;
  activeTrips: number;
  gross: number;
  expenses: number;
  net: number;
  pending: number;
  distance: number;
  minutes: number;
  resultPerHour: number;
  resultPerKm: number;
  averageTicket: number;
  maintenanceProvision: number;
  adjustedNet: number;
};

export type DriverFinanceCategoryTotal = {
  category: DriverFinancialCategory;
  label: string;
  amount: number;
  percentage: number;
};

export type DriverFinanceTrendPoint = {
  key: string;
  label: string;
  gross: number;
  expenses: number;
  net: number;
};

const VALID_PERIODS: DriverFinancePeriod[] = ["month", "previous_month", "30d", "90d", "year"];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(value: string, days: number) {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function monthBounds(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

function previousMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return isoDate(date).slice(0, 7);
}

function formatMonth(monthKey: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseIsoDate(`${monthKey}-01`));
}

function formatDateRange(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
  return `${formatter.format(parseIsoDate(startDate))} a ${formatter.format(parseIsoDate(endDate))}`;
}

export function currentDateInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function normalizeDriverFinancePeriod(value: unknown): DriverFinancePeriod {
  return VALID_PERIODS.includes(value as DriverFinancePeriod) ? value as DriverFinancePeriod : "month";
}

export function normalizeFinanceMonth(value: unknown, fallback = currentDateInSaoPaulo().slice(0, 7)) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : fallback;
}

export function buildDriverFinanceWindow(periodValue: unknown, monthValue?: unknown): DriverFinanceWindow {
  const period = normalizeDriverFinancePeriod(periodValue);
  const today = currentDateInSaoPaulo();
  const currentMonth = today.slice(0, 7);
  let startDate = today;
  let endDate = today;
  let monthKey = normalizeFinanceMonth(monthValue, currentMonth);
  let label = "";

  if (period === "month") {
    const bounds = monthBounds(monthKey);
    startDate = bounds.startDate;
    endDate = bounds.endDate;
    label = formatMonth(monthKey);
  } else if (period === "previous_month") {
    monthKey = previousMonthKey(currentMonth);
    const bounds = monthBounds(monthKey);
    startDate = bounds.startDate;
    endDate = bounds.endDate;
    label = formatMonth(monthKey);
  } else if (period === "30d" || period === "90d") {
    const days = period === "30d" ? 30 : 90;
    startDate = addDays(today, -(days - 1));
    endDate = today;
    monthKey = currentMonth;
    label = `Ultimos ${days} dias`;
  } else {
    startDate = `${today.slice(0, 4)}-01-01`;
    endDate = `${today.slice(0, 4)}-12-31`;
    monthKey = currentMonth;
    label = `Ano de ${today.slice(0, 4)}`;
  }

  const days = Math.round((parseIsoDate(endDate).getTime() - parseIsoDate(startDate).getTime()) / 86400000) + 1;
  const previousEndDate = addDays(startDate, -1);
  const previousStartDate = addDays(previousEndDate, -(days - 1));

  return {
    period,
    startDate,
    endDate,
    previousStartDate,
    previousEndDate,
    monthKey,
    label,
    previousLabel: formatDateRange(previousStartDate, previousEndDate),
  };
}

export function driverTripMetricDate(trip: Pick<DriverTrip, "travel_date" | "created_at">) {
  return trip.travel_date || trip.created_at.slice(0, 10);
}

export function filterTripsByWindow(trips: DriverTrip[], startDate: string, endDate: string) {
  return trips.filter((trip) => {
    const date = driverTripMetricDate(trip);
    return date >= startDate && date <= endDate;
  });
}

export function filterEntriesByWindow(entries: DriverFinancialEntry[], startDate: string, endDate: string) {
  return entries.filter((entry) => {
    const date = entry.occurred_at.slice(0, 10);
    return date >= startDate && date <= endDate;
  });
}

export function summarizeDriverFinance(
  trips: DriverTrip[],
  maintenancePercent: number,
): DriverFinanceSummary {
  const completed = trips.filter((trip) => trip.status === "completed");
  const active = trips.filter((trip) => trip.status !== "cancelled");
  const gross = completed.reduce((sum, trip) => sum + Number(trip.gross_revenue || 0), 0);
  const expenses = completed.reduce((sum, trip) => sum + Number(trip.total_expenses || 0), 0);
  const net = completed.reduce((sum, trip) => sum + Number(trip.net_result || 0), 0);
  const pending = active.reduce((sum, trip) => sum + Number(trip.pending_amount || 0), 0);
  const distance = completed.reduce((sum, trip) => sum + Number(trip.distance_km || 0), 0);
  const minutes = completed.reduce((sum, trip) => sum + Number(trip.worked_minutes || 0), 0);
  const maintenanceProvision = gross * Math.max(0, maintenancePercent) / 100;

  return {
    completedTrips: completed.length,
    activeTrips: active.length,
    gross,
    expenses,
    net,
    pending,
    distance,
    minutes,
    resultPerHour: minutes > 0 ? net / (minutes / 60) : 0,
    resultPerKm: distance > 0 ? net / distance : 0,
    averageTicket: completed.length > 0 ? gross / completed.length : 0,
    maintenanceProvision,
    adjustedNet: net - maintenanceProvision,
  };
}

export function financeChangePercent(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function buildExpenseCategoryTotals(entries: DriverFinancialEntry[]): DriverFinanceCategoryTotal[] {
  const expenseEntries = entries.filter((entry) => entry.entry_type === "expense");
  const total = expenseEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const grouped = new Map<DriverFinancialCategory, number>();

  expenseEntries.forEach((entry) => {
    grouped.set(entry.category, (grouped.get(entry.category) ?? 0) + Number(entry.amount || 0));
  });

  return Array.from(grouped.entries())
    .map(([category, amount]) => ({
      category,
      label: DRIVER_FINANCIAL_CATEGORY_LABELS[category],
      amount,
      percentage: total > 0 ? amount / total * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function buildDriverFinanceTrend(trips: DriverTrip[]): DriverFinanceTrendPoint[] {
  const grouped = new Map<string, DriverFinanceTrendPoint>();

  trips.filter((trip) => trip.status === "completed").forEach((trip) => {
    const key = driverTripMetricDate(trip);
    const current = grouped.get(key) ?? {
      key,
      label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(parseIsoDate(key)),
      gross: 0,
      expenses: 0,
      net: 0,
    };
    current.gross += Number(trip.gross_revenue || 0);
    current.expenses += Number(trip.total_expenses || 0);
    current.net += Number(trip.net_result || 0);
    grouped.set(key, current);
  });

  return Array.from(grouped.values()).sort((a, b) => a.key.localeCompare(b.key)).slice(-31);
}
