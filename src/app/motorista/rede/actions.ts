"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertDriverFeature } from "@/lib/account-plan";
import {
  DRIVER_NETWORK_ACCESSIBILITY_FEATURES,
  DRIVER_NETWORK_SERVICE_TYPES,
  type DriverNetworkAccessibilityFeature,
  type DriverNetworkServiceType,
} from "@/lib/driver-network";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function readAllowedValues<T extends string>(formData: FormData, key: string, allowed: readonly T[]) {
  const allowedSet = new Set<string>(allowed);
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string" && allowedSet.has(value)) as T[];
}

function requireUuid(value: string, label: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${label} inválido.`);
  }
  return value;
}

function revalidateNetwork() {
  revalidatePath("/motoristas");
  revalidatePath("/motorista");
  revalidatePath("/motorista/rede");
  revalidatePath("/admin/motoristas");
}

export async function saveDriverNetworkSettingsAction(formData: FormData) {
  const { supabase } = await assertDriverFeature("driver_network");
  const serviceTypes = readAllowedValues<DriverNetworkServiceType>(formData, "serviceTypes", DRIVER_NETWORK_SERVICE_TYPES);
  const accessibilityFeatures = readAllowedValues<DriverNetworkAccessibilityFeature>(
    formData,
    "accessibilityFeatures",
    DRIVER_NETWORK_ACCESSIBILITY_FEATURES,
  );

  const { error } = await supabase.rpc("save_driver_network_settings", {
    selected_opted_in: readBoolean(formData, "optedIn"),
    selected_region: readText(formData, "region") || null,
    selected_service_types: serviceTypes,
    selected_accessibility_features: accessibilityFeatures,
    selected_network_note: readText(formData, "networkNote") || null,
    selected_accepts_referrals: readBoolean(formData, "acceptsReferrals"),
    selected_share_contact: readBoolean(formData, "shareContact"),
  });

  if (error) throw new Error(error.message);
  revalidateNetwork();
  redirect("/motorista/rede?salvo=1");
}

export async function createDriverReferralAction(formData: FormData) {
  const { supabase } = await assertDriverFeature("driver_network");
  const reservationId = requireUuid(readText(formData, "reservationId"), "Reserva");
  const recipientUserId = requireUuid(readText(formData, "recipientUserId"), "Motorista");
  const consentConfirmed = readBoolean(formData, "consentConfirmed");

  const { error } = await supabase.rpc("create_driver_referral", {
    selected_reservation_id: reservationId,
    selected_recipient_user_id: recipientUserId,
    selected_sender_message: readText(formData, "senderMessage") || null,
    consent_confirmed: consentConfirmed,
  });

  if (error) throw new Error(error.message);
  revalidateNetwork();
  revalidatePath(`/motorista/reservas/${reservationId}`);
  redirect(`/motorista/reservas/${reservationId}?indicacao=enviada`);
}

export async function respondDriverReferralAction(formData: FormData) {
  const { supabase } = await assertDriverFeature("driver_network");
  const referralId = requireUuid(readText(formData, "referralId"), "Indicação");
  const response = readText(formData, "response");
  if (response !== "accepted" && response !== "declined") throw new Error("Resposta inválida.");

  const { data, error } = await supabase.rpc("respond_driver_referral", {
    selected_referral_id: referralId,
    selected_response: response,
    selected_message: readText(formData, "recipientMessage") || null,
  });

  if (error) throw new Error(error.message);
  revalidateNetwork();
  revalidatePath("/motorista/reservas");
  revalidatePath("/motorista/agenda");

  if (response === "accepted" && typeof data === "string" && data) {
    redirect(`/motorista/reservas/${data}?origem=rede`);
  }
  redirect("/motorista/rede?resposta=registrada");
}

export async function cancelDriverReferralAction(formData: FormData) {
  const { supabase } = await assertDriverFeature("driver_network");
  const referralId = requireUuid(readText(formData, "referralId"), "Indicação");
  const { error } = await supabase.rpc("cancel_driver_referral", { selected_referral_id: referralId });
  if (error) throw new Error(error.message);
  revalidateNetwork();
  redirect("/motorista/rede?indicacao=cancelada");
}
