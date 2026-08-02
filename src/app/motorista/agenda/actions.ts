"use server";

import { revalidatePath } from "next/cache";
import { assertDriverFeature } from "@/lib/account-plan";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACTIVE_SCHEDULE_STATUSES } from "@/lib/driver-schedule";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function timeToMinutes(value: string | null | undefined) {
  const match = /^(\d{2}):(\d{2})/.exec(value || "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

async function requireDriver() {
  return assertDriverFeature("schedule");
}

export async function createDriverScheduleBlockAction(formData: FormData) {
  const blockDate = readText(formData, "blockDate");
  const isAllDay = formData.get("isAllDay") === "on";
  const startTime = readText(formData, "startTime");
  const endTime = readText(formData, "endTime");
  const title = readText(formData, "title");
  const notes = readText(formData, "notes");

  if (!validDate(blockDate)) throw new Error("Informe uma data valida.");
  if (title.length < 2 || title.length > 80) throw new Error("Informe um titulo entre 2 e 80 caracteres.");
  if (notes.length > 300) throw new Error("As observacoes podem ter ate 300 caracteres.");
  if (!isAllDay && (!validTime(startTime) || !validTime(endTime) || timeToMinutes(endTime) <= timeToMinutes(startTime))) {
    throw new Error("Informe um intervalo de horario valido.");
  }

  const { userId } = await requireDriver();
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("driver_settings")
    .select("schedule_buffer_minutes")
    .eq("user_id", userId)
    .maybeSingle();
  const buffer = Math.max(0, Number(settings?.schedule_buffer_minutes || 30));

  const { data: reservations, error: reservationError } = await admin
    .from("driver_reservations")
    .select("id,passenger_name,travel_time,duration_minutes,status")
    .eq("driver_user_id", userId)
    .eq("travel_date", blockDate)
    .in("status", [...ACTIVE_SCHEDULE_STATUSES]);
  if (reservationError) throw new Error(reservationError.message);

  const conflict = (reservations ?? []).find((reservation: {
    passenger_name: string;
    travel_time: string | null;
    duration_minutes: number | null;
  }) => {
    if (!reservation.travel_time) return isAllDay;
    if (isAllDay) return true;
    const reservationStart = timeToMinutes(reservation.travel_time);
    const reservationEnd = reservationStart + Math.max(15, Number(reservation.duration_minutes || 60));
    return timeToMinutes(startTime) < reservationEnd + buffer && timeToMinutes(endTime) + buffer > reservationStart;
  });

  if (conflict) {
    throw new Error(`Este bloqueio conflita com a reserva de ${conflict.passenger_name}. Remarque ou encerre a reserva antes.`);
  }

  const { error } = await admin.from("driver_schedule_blocks").insert({
    user_id: userId,
    block_date: blockDate,
    start_time: isAllDay ? null : startTime,
    end_time: isAllDay ? null : endTime,
    is_all_day: isAllDay,
    title,
    notes: notes || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/motorista");
  revalidatePath("/motorista/agenda");
  revalidatePath("/motorista/reservas");
}

export async function deleteDriverScheduleBlockAction(formData: FormData) {
  const blockId = readText(formData, "blockId");
  if (!blockId) throw new Error("Bloqueio invalido.");

  const { userId } = await requireDriver();
  const admin = createAdminClient();
  const { error } = await admin
    .from("driver_schedule_blocks")
    .delete()
    .eq("id", blockId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/motorista");
  revalidatePath("/motorista/agenda");
  revalidatePath("/motorista/reservas");
}
