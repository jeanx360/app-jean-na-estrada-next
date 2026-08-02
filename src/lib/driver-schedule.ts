import type { DriverReservation } from "@/lib/driver-public";

export type DriverScheduleBlock = {
  id: string;
  user_id: string;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
  title: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverScheduleConflict = {
  conflict_type: "reservation" | "block";
  conflict_id: string;
  conflict_label: string;
  starts_at: string;
  ends_at: string;
};

export const ACTIVE_SCHEDULE_STATUSES = [
  "new",
  "negotiating",
  "quoted",
  "confirmed",
  "in_progress",
] as const;

export function normalizeMonthKey(value: string | null | undefined, fallback: string) {
  return /^\d{4}-\d{2}$/.test(value || "") ? String(value) : fallback;
}

export function normalizeDateKey(value: string | null | undefined, fallback: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? String(value) : fallback;
}

export function monthKeyInTimeZone(value = new Date(), timeZone = "America/Sao_Paulo") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}`;
}

export function dateKeyInTimeZone(value = new Date(), timeZone = "America/Sao_Paulo") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addMonths(monthKey: string, months: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return date.toISOString().slice(0, 7);
}

export function monthBounds(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const start = `${monthKey}-01`;
  const endDate = new Date(Date.UTC(year, month, 0));
  return { start, end: endDate.toISOString().slice(0, 10) };
}

export function calendarDays(monthKey: string) {
  const { start, end } = monthBounds(monthKey);
  const startDate = new Date(`${start}T12:00:00Z`);
  const endDate = new Date(`${end}T12:00:00Z`);
  const first = new Date(startDate);
  first.setUTCDate(first.getUTCDate() - first.getUTCDay());
  const last = new Date(endDate);
  last.setUTCDate(last.getUTCDate() + (6 - last.getUTCDay()));
  const days: string[] = [];
  for (const cursor = new Date(first); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    days.push(cursor.toISOString().slice(0, 10));
  }
  return days;
}

export function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

export function dateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

export function reservationScheduleLabel(item: Pick<DriverReservation, "origin" | "destination" | "passenger_name" | "driver_service_packages">) {
  return [item.origin, item.destination].filter(Boolean).join(" → ") || item.driver_service_packages?.title || item.passenger_name;
}

export function durationLabel(minutes: number) {
  const safe = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(safe / 60);
  const remainder = safe % 60;
  if (!hours) return `${remainder} min`;
  if (!remainder) return `${hours}h`;
  return `${hours}h ${remainder}min`;
}

export function scheduleSortKey(item: Pick<DriverReservation, "travel_date" | "travel_time">) {
  return `${item.travel_date ?? "9999-12-31"}T${item.travel_time?.slice(0, 5) ?? "23:59"}`;
}
