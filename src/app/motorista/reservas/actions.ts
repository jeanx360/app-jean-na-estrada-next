"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DriverReservation, DriverReservationStatus } from "@/lib/driver-public";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validTimeInput(value: string) {
  if (!value) return true;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  return Number(match[1]) <= 23 && Number(match[2]) <= 59;
}

async function requireOwnedReservation(reservationId: string) {
  const context = await getAuthContext();
  if (!context.userId || !context.profile?.is_professional_driver || context.profile.is_blocked) {
    throw new Error("Acesso de motorista necessário.");
  }

  const { data, error } = await context.supabase
    .from("driver_reservations")
    .select("*")
    .eq("id", reservationId)
    .eq("driver_user_id", context.userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Reserva não encontrada.");

  return { ...context, reservation: data as DriverReservation };
}

function revalidateDriverReservationPaths(reservationId: string) {
  revalidatePath("/motorista");
  revalidatePath("/motorista/reservas");
  revalidatePath("/motorista/agenda");
  revalidatePath(`/motorista/reservas/${reservationId}`);
  revalidatePath("/motorista/orcamentos");
  revalidatePath("/motorista/financeiro");
}

export async function rescheduleDriverReservationAction(formData: FormData) {
  const reservationId = readText(formData, "reservationId");
  const travelDate = readText(formData, "travelDate");
  const travelTime = readText(formData, "travelTime");
  const durationMinutes = Math.max(15, Math.min(720, Number(readText(formData, "durationMinutes")) || 60));

  if (!reservationId) throw new Error("Reserva inválida.");
  if (!validDateInput(travelDate)) throw new Error("Informe uma data válida.");
  if (!validTimeInput(travelTime)) throw new Error("Informe um horário válido no padrão de 24 horas.");

  const { supabase, userId, reservation } = await requireOwnedReservation(reservationId);
  if (["completed", "cancelled", "declined"].includes(reservation.status)) {
    throw new Error("Uma reserva encerrada não pode ser remarcada.");
  }

  const admin = createAdminClient();
  if (travelTime) {
    const { data: conflicts, error: conflictError } = await admin.rpc("driver_schedule_conflicts", {
      p_driver_user_id: userId,
      p_travel_date: travelDate,
      p_travel_time: travelTime,
      p_duration_minutes: durationMinutes,
      p_exclude_reservation_id: reservationId,
    });
    if (conflictError) throw new Error(conflictError.message);
    const conflict = Array.isArray(conflicts) ? conflicts[0] as { conflict_label?: string } | undefined : undefined;
    if (conflict) throw new Error(`Este horario conflita com ${conflict.conflict_label || "outro compromisso"}. Escolha outro horario.`);
  }

  const { error } = await supabase
    .from("driver_reservations")
    .update({
      travel_date: travelDate,
      travel_time: travelTime || null,
      duration_minutes: durationMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId)
    .eq("driver_user_id", userId);

  if (error) throw new Error(error.message);

  if (reservation.quote_id) {
    const { error: quoteError } = await admin
      .from("driver_quotes")
      .update({ travel_date: travelDate, updated_at: new Date().toISOString() })
      .eq("id", reservation.quote_id)
      .eq("user_id", userId);
    if (quoteError) throw new Error(quoteError.message);
  }

  const { error: tripError } = await admin
    .from("driver_trips")
    .update({ travel_date: travelDate, updated_at: new Date().toISOString() })
    .eq("reservation_id", reservationId)
    .eq("user_id", userId);
  if (tripError) throw new Error(tripError.message);

  revalidateDriverReservationPaths(reservationId);
}

export async function cancelDriverReservationAction(formData: FormData) {
  const reservationId = readText(formData, "reservationId");
  const terminalStatus = readText(formData, "terminalStatus") as DriverReservationStatus;
  const reason = readText(formData, "reason");

  if (!reservationId) throw new Error("Reserva inválida.");
  if (!["cancelled", "declined"].includes(terminalStatus)) throw new Error("Situação de cancelamento inválida.");
  if (reason.length < 3 || reason.length > 400) {
    throw new Error("Informe um motivo entre 3 e 400 caracteres.");
  }

  const { userId, reservation } = await requireOwnedReservation(reservationId);
  if (reservation.status === "completed") throw new Error("Uma reserva concluída não pode ser cancelada.");

  const admin = createAdminClient();
  const cancelledAt = new Date().toISOString();
  const { data: linkedTrips, error: tripReadError } = await admin
    .from("driver_trips")
    .select("id")
    .eq("reservation_id", reservationId)
    .eq("user_id", userId);
  if (tripReadError) throw new Error(tripReadError.message);

  if (linkedTrips?.length) {
    const { error: tripError } = await admin
      .from("driver_trips")
      .update({ status: "cancelled", updated_at: cancelledAt })
      .in("id", linkedTrips.map((item: { id: string }) => item.id));
    if (tripError) throw new Error(tripError.message);
  }

  if (reservation.quote_id) {
    const { error: quoteError } = await admin
      .from("driver_quotes")
      .update({ status: "cancelled", updated_at: cancelledAt })
      .eq("id", reservation.quote_id)
      .eq("user_id", userId);
    if (quoteError) throw new Error(quoteError.message);
  }

  const { error: reservationError } = await admin
    .from("driver_reservations")
    .update({
      status: terminalStatus,
      cancellation_reason: reason,
      cancelled_at: cancelledAt,
      updated_at: cancelledAt,
    })
    .eq("id", reservationId)
    .eq("driver_user_id", userId);
  if (reservationError) throw new Error(reservationError.message);

  revalidateDriverReservationPaths(reservationId);
}

export async function duplicateDriverReservationAction(formData: FormData) {
  const reservationId = readText(formData, "reservationId");
  if (!reservationId) throw new Error("Reserva inválida.");

  const { userId, reservation } = await requireOwnedReservation(reservationId);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("driver_reservations")
    .insert({
      driver_user_id: userId,
      package_id: reservation.package_id,
      campaign_id: reservation.campaign_id,
      passenger_name: reservation.passenger_name,
      passenger_phone: reservation.passenger_phone,
      origin: reservation.origin,
      destination: reservation.destination,
      travel_date: null,
      travel_time: null,
      trip_type: reservation.trip_type,
      passengers: reservation.passengers,
      luggage: reservation.luggage,
      notes: reservation.notes,
      status: "negotiating",
      duration_minutes: reservation.duration_minutes || 60,
      source: reservation.source,
      quote_id: null,
      request_fingerprint_hash: null,
      contact_consent: reservation.contact_consent,
      cancellation_reason: null,
      cancelled_at: null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/motorista");
  revalidatePath("/motorista/reservas");
  revalidatePath("/motorista/agenda");
  redirect(`/motorista/reservas/${data.id}`);
}
