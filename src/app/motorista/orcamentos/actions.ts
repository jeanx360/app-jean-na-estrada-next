"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertDriverFeature } from "@/lib/account-plan";
import { asNumber, type DriverQuote, type DriverQuoteStatus, type DriverTripType } from "@/lib/driver";
import { normalizeWhatsAppPhone } from "@/lib/driver-public";
import type { DriverQuoteLineItem, DriverQuoteLineItemKind } from "@/lib/driver-quote";
import { createAdminClient } from "@/lib/supabase/admin";

type QuoteCustomerContext = { id: string; display_name: string; custom_name: string | null; phone: string };
type QuoteReservationContext = {
  id: string;
  passenger_name: string;
  passenger_phone: string;
  origin: string | null;
  destination: string | null;
  travel_date: string | null;
  travel_time: string | null;
  trip_type: DriverTripType;
  customer_id: string | null;
  source: string | null;
  campaign_id: string | null;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readMoney(formData: FormData, key: string) {
  return Math.max(0, asNumber(readText(formData, key)));
}

function boundedNumber(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

async function requireProfessionalDriver() {
  return assertDriverFeature("quotes");
}

async function requireOwnedQuote(quoteId: string) {
  const context = await requireProfessionalDriver();
  const { data, error } = await context.supabase
    .from("driver_quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Orçamento não encontrado.");
  return { ...context, quote: data as DriverQuote };
}

function addLineItem(items: DriverQuoteLineItem[], kind: DriverQuoteLineItemKind, label: string, amount: number) {
  const safeAmount = Number(amount || 0);
  if (Math.abs(safeAmount) < 0.005) return;
  items.push({ kind, label, amount: Math.round(safeAmount * 100) / 100 });
}

async function quoteContext(userId: string, customerId: string, reservationId: string) {
  const admin = createAdminClient();
  let customer: QuoteCustomerContext | null = null;
  let reservation: QuoteReservationContext | null = null;

  if (customerId) {
    const result = await admin
      .from("driver_customers")
      .select("id,display_name,custom_name,phone")
      .eq("id", customerId)
      .eq("user_id", userId)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);
    customer = result.data as QuoteCustomerContext | null;
  }

  if (reservationId) {
    const result = await admin
      .from("driver_reservations")
      .select("id,passenger_name,passenger_phone,origin,destination,travel_date,travel_time,trip_type,customer_id,source,campaign_id")
      .eq("id", reservationId)
      .eq("driver_user_id", userId)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);
    reservation = result.data as QuoteReservationContext | null;
  }

  return { admin, customer, reservation };
}

function revalidateQuotePaths(quoteId?: string, reservationId?: string | null) {
  revalidatePath("/motorista");
  revalidatePath("/motorista/orcamentos");
  if (quoteId) revalidatePath(`/motorista/orcamentos/${quoteId}`);
  if (reservationId) {
    revalidatePath("/motorista/reservas");
    revalidatePath(`/motorista/reservas/${reservationId}`);
  }
}

async function createReservationForQuote(quote: DriverQuote) {
  const admin = createAdminClient();
  const phone = normalizeWhatsAppPhone(quote.customer_phone || "");
  if (!phone || phone.length < 10) throw new Error("Informe o telefone do passageiro antes de converter o orçamento em reserva.");

  if (quote.reservation_id) {
    const { error } = await admin
      .from("driver_reservations")
      .update({ quote_id: quote.id, status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", quote.reservation_id)
      .eq("driver_user_id", quote.user_id);
    if (error) throw new Error(error.message);
    return quote.reservation_id;
  }

  const { data: linked } = await admin
    .from("driver_reservations")
    .select("id")
    .eq("quote_id", quote.id)
    .eq("driver_user_id", quote.user_id)
    .maybeSingle();
  if (linked?.id) {
    await admin.from("driver_reservations").update({ status: "confirmed", updated_at: new Date().toISOString() }).eq("id", linked.id);
    await admin.from("driver_quotes").update({ reservation_id: linked.id }).eq("id", quote.id);
    return linked.id as string;
  }

  const durationMinutes = boundedNumber(Math.round(Number(quote.billable_hours || 1) * 60), 15, 720);
  const source = ["profile", "qr", "shared_link", "whatsapp"].includes(quote.source || "") ? quote.source : "shared_link";
  const { data, error } = await admin
    .from("driver_reservations")
    .insert({
      driver_user_id: quote.user_id,
      passenger_name: quote.customer_name || "Passageiro",
      passenger_phone: phone,
      origin: quote.origin,
      destination: quote.destination,
      travel_date: quote.travel_date,
      travel_time: quote.travel_time,
      trip_type: quote.trip_type,
      passengers: 1,
      luggage: null,
      notes: quote.notes,
      status: "confirmed",
      duration_minutes: durationMinutes,
      source,
      campaign_id: quote.campaign_id,
      customer_id: quote.customer_id,
      quote_id: quote.id,
      contact_consent: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await admin.from("driver_quotes").update({ reservation_id: data.id, updated_at: new Date().toISOString() }).eq("id", quote.id);
  return data.id as string;
}

export async function saveProfessionalQuoteAction(formData: FormData) {
  const { userId } = await requireProfessionalDriver();
  const quoteId = readText(formData, "quoteId");
  const customerId = readText(formData, "customerId");
  const reservationId = readText(formData, "reservationId");
  const requestedStatus = readText(formData, "submitMode") === "send" ? "sent" : "draft";
  const customerNameInput = readText(formData, "customerName");
  const customerPhoneInput = normalizeWhatsAppPhone(readText(formData, "customerPhone"));
  const originInput = readText(formData, "origin");
  const destinationInput = readText(formData, "destination");
  const travelDateInput = readText(formData, "travelDate");
  const travelTimeInput = readText(formData, "travelTime");
  const tripTypeInput = readText(formData, "tripType");
  const tripType: DriverTripType = ["outbound", "return", "round_trip"].includes(tripTypeInput)
    ? tripTypeInput as DriverTripType
    : "outbound";

  const { admin, customer, reservation } = await quoteContext(userId, customerId, reservationId);
  const customerName = customerNameInput || customer?.custom_name || customer?.display_name || reservation?.passenger_name || "";
  const customerPhone = customerPhoneInput || normalizeWhatsAppPhone(customer?.phone || reservation?.passenger_phone || "");
  const origin = originInput || reservation?.origin || null;
  const destination = destinationInput || reservation?.destination || null;
  const travelDate = travelDateInput || reservation?.travel_date || null;
  const travelTime = travelTimeInput || reservation?.travel_time || null;

  if (customerName.length < 2 || customerName.length > 80) throw new Error("Informe o nome do passageiro.");
  if (customerPhone.length < 10 || customerPhone.length > 15) throw new Error("Informe um telefone válido para o passageiro.");
  if (origin && origin.length > 180) throw new Error("A origem pode ter no máximo 180 caracteres.");
  if (destination && destination.length > 180) throw new Error("O destino pode ter no máximo 180 caracteres.");

  const multiplier = tripType === "round_trip" ? 2 : 1;
  const distancePerLeg = readMoney(formData, "distancePerLegKm");
  const durationPerLegMinutes = Math.round(readMoney(formData, "durationHours") * 60 + readMoney(formData, "durationMinutes"));
  const waitingMinutes = Math.round(readMoney(formData, "waitingMinutes"));
  const kmRate = readMoney(formData, "kmRate");
  const hourlyRate = readMoney(formData, "hourlyRate");
  const waitingRate = readMoney(formData, "waitingRate");
  const minimumFare = readMoney(formData, "minimumFare");
  const reservePercent = boundedNumber(readMoney(formData, "reservePercent"), 0, 100);
  const roundingStep = readMoney(formData, "roundingStep");
  const tolls = readMoney(formData, "tolls");
  const parking = readMoney(formData, "parking");
  const nightSurcharge = readMoney(formData, "nightSurcharge");
  const extraStops = readMoney(formData, "extraStops");
  const returnService = readMoney(formData, "returnService");
  const luggageService = readMoney(formData, "luggageService");
  const otherCosts = readMoney(formData, "otherCosts");
  const discount = readMoney(formData, "discount");

  if (distancePerLeg <= 0 && durationPerLegMinutes <= 0) {
    throw new Error("Informe a distância ou o tempo estimado do serviço.");
  }

  const totalDistance = distancePerLeg * multiplier;
  const drivingHours = (durationPerLegMinutes * multiplier) / 60;
  const waitingHours = waitingMinutes / 60;
  const distanceCharge = totalDistance * kmRate;
  const timeCharge = drivingHours * hourlyRate;
  const waitingCharge = waitingHours * waitingRate;
  const serviceSubtotal = distanceCharge + timeCharge + waitingCharge;
  const maintenanceReserve = serviceSubtotal * (reservePercent / 100);
  const directCosts = tolls + parking + nightSurcharge + extraStops + returnService + luggageService + otherCosts;
  const rawTotal = Math.max(0, serviceSubtotal + maintenanceReserve + directCosts - discount);
  const suggestedTotal = Math.max(minimumFare, rawTotal);
  const roundedTotal = roundingStep > 0 ? Math.ceil(suggestedTotal / roundingStep) * roundingStep : suggestedTotal;

  const items: DriverQuoteLineItem[] = [];
  addLineItem(items, "distance", `Deslocamento (${totalDistance.toFixed(1).replace(".", ",")} km)`, distanceCharge);
  addLineItem(items, "travel_time", `Tempo em viagem (${drivingHours.toFixed(1).replace(".", ",")} h)`, timeCharge);
  addLineItem(items, "waiting", `Tempo de espera (${waitingMinutes} min)`, waitingCharge);
  addLineItem(items, "maintenance", "Reserva operacional e manutenção", maintenanceReserve);
  addLineItem(items, "toll", "Pedágios", tolls);
  addLineItem(items, "parking", "Estacionamento", parking);
  addLineItem(items, "night", "Adicional noturno", nightSurcharge);
  addLineItem(items, "stops", "Paradas adicionais", extraStops);
  addLineItem(items, "return_service", "Retorno ou disponibilidade", returnService);
  addLineItem(items, "luggage", "Bagagem ou serviço especial", luggageService);
  addLineItem(items, "other", readText(formData, "otherCostsLabel") || "Outros custos", otherCosts);
  addLineItem(items, "discount", "Desconto", -discount);

  const validDays = Math.round(boundedNumber(asNumber(readText(formData, "validDays"), 7), 1, 90));
  const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString();
  const notes = readText(formData, "notes");
  const conditions = readText(formData, "conditions");
  if (notes.length > 700) throw new Error("As observações podem ter no máximo 700 caracteres.");
  if (conditions.length > 2500) throw new Error("As condições podem ter no máximo 2.500 caracteres.");

  const payload = {
    user_id: userId,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_id: customer?.id || reservation?.customer_id || null,
    reservation_id: reservation?.id || null,
    origin,
    destination,
    travel_date: travelDate,
    travel_time: travelTime,
    trip_type: reservation?.trip_type || tripType,
    distance_per_leg_km: distancePerLeg,
    duration_per_leg_minutes: durationPerLegMinutes,
    waiting_minutes: waitingMinutes,
    tolls,
    parking,
    other_costs: nightSurcharge + extraStops + returnService + luggageService + otherCosts,
    discount,
    km_rate: kmRate,
    hourly_rate: hourlyRate,
    waiting_hour_rate: waitingRate,
    minimum_fare: minimumFare,
    maintenance_reserve_percent: reservePercent,
    rounding_step: roundingStep,
    total_distance_km: totalDistance,
    billable_hours: drivingHours + waitingHours,
    distance_charge: distanceCharge,
    time_charge: timeCharge,
    waiting_charge: waitingCharge,
    maintenance_reserve: maintenanceReserve,
    direct_costs: directCosts,
    suggested_total: suggestedTotal,
    rounded_total: roundedTotal,
    status: requestedStatus,
    notes: notes || null,
    conditions: conditions || null,
    line_items: items,
    valid_until: validUntil,
    source: reservation?.source || null,
    campaign_id: reservation?.campaign_id || null,
    sent_at: requestedStatus === "sent" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  let savedId = quoteId;
  if (quoteId) {
    const { quote } = await requireOwnedQuote(quoteId);
    if (!["draft", "sent", "viewed", "expired"].includes(quote.status)) {
      throw new Error("Este orçamento não pode mais ser editado.");
    }
    const { error } = await admin.from("driver_quotes").update({ ...payload, version: Number(quote.version || 1) + 1 }).eq("id", quoteId).eq("user_id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await admin.from("driver_quotes").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    savedId = data.id as string;
  }

  if (reservation?.id && savedId) {
    const { error } = await admin
      .from("driver_reservations")
      .update({ quote_id: savedId, status: "quoted", updated_at: new Date().toISOString() })
      .eq("id", reservation.id)
      .eq("driver_user_id", userId);
    if (error) throw new Error(error.message);
  }

  await admin.from("driver_quote_events").insert({
    quote_id: savedId,
    driver_user_id: userId,
    actor_type: "driver",
    event_type: quoteId ? "quote_updated" : requestedStatus === "sent" ? "quote_created_and_sent" : "quote_created",
    new_status: requestedStatus,
    metadata: { valid_days: validDays, total: roundedTotal },
  });

  revalidateQuotePaths(savedId, reservation?.id || reservationId || null);
  redirect(`/motorista/orcamentos/${savedId}`);
}

export async function setDriverQuoteStatusAction(formData: FormData) {
  const quoteId = readText(formData, "quoteId");
  const target = readText(formData, "status") as DriverQuoteStatus;
  if (!quoteId) throw new Error("Orçamento inválido.");
  if (!["draft", "sent", "accepted", "cancelled"].includes(target)) throw new Error("Situação inválida.");

  const { quote, userId } = await requireOwnedQuote(quoteId);
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { status: target, updated_at: now };
  if (target === "sent") {
    update.sent_at = now;
    if (new Date(quote.valid_until).getTime() < Date.now()) {
      update.valid_until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }
  }
  if (target === "accepted") {
    update.accepted_at = now;
    update.responded_at = now;
  }
  if (target === "cancelled") update.cancelled_at = now;

  const { error } = await admin.from("driver_quotes").update(update).eq("id", quoteId).eq("user_id", userId);
  if (error) throw new Error(error.message);

  let reservationId = quote.reservation_id;
  if (target === "accepted") {
    reservationId = await createReservationForQuote({ ...quote, status: target });
  }

  await admin.from("driver_quote_events").insert({
    quote_id: quoteId,
    driver_user_id: userId,
    actor_type: "driver",
    event_type: `driver_marked_${target}`,
    previous_status: quote.status,
    new_status: target,
  });

  revalidateQuotePaths(quoteId, reservationId);
}

export async function convertDriverQuoteToReservationAction(formData: FormData) {
  const quoteId = readText(formData, "quoteId");
  if (!quoteId) throw new Error("Orçamento inválido.");
  const { quote, userId } = await requireOwnedQuote(quoteId);
  const reservationId = await createReservationForQuote(quote);
  const admin = createAdminClient();
  if (quote.status !== "accepted") {
    await admin.from("driver_quotes").update({ status: "accepted", accepted_at: new Date().toISOString(), responded_at: new Date().toISOString() }).eq("id", quote.id).eq("user_id", userId);
  }
  await admin.from("driver_quote_events").insert({
    quote_id: quote.id,
    driver_user_id: userId,
    actor_type: "driver",
    event_type: "quote_converted_to_reservation",
    previous_status: quote.status,
    new_status: "accepted",
    metadata: { reservation_id: reservationId },
  });
  revalidateQuotePaths(quote.id, reservationId);
  redirect(`/motorista/reservas/${reservationId}`);
}
