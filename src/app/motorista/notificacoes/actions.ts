"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import type { NotificationActionState } from "@/types/notification";

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function integer(formData: FormData, key: string, minimum: number, maximum: number) {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? Number(raw) : Number.NaN;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Valor inválido em ${key}.`);
  }
  return value;
}

export async function updateDriverNotificationPreferencesAction(
  _previousState: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  const { userId, profile, supabase } = await getAuthContext();
  if (!userId || !profile?.is_professional_driver || profile.is_blocked) {
    return { error: "Acesso de motorista profissional necessário." };
  }

  try {
    const payload = {
      user_id: userId,
      agenda_enabled: checked(formData, "agendaEnabled"),
      customers_enabled: checked(formData, "customersEnabled"),
      quotes_enabled: checked(formData, "quotesEnabled"),
      finance_enabled: checked(formData, "financeEnabled"),
      network_enabled: checked(formData, "networkEnabled"),
      subscription_enabled: checked(formData, "subscriptionEnabled"),
      administration_enabled: checked(formData, "administrationEnabled"),
      reservation_upcoming_hours: integer(formData, "reservationUpcomingHours", 1, 168),
      reservation_unconfirmed_hours: integer(formData, "reservationUnconfirmedHours", 1, 336),
      quote_expiring_hours: integer(formData, "quoteExpiringHours", 1, 336),
      customer_inactive_days: integer(formData, "customerInactiveDays", 7, 365),
    };

    const { error } = await supabase
      .from("driver_notification_preferences")
      .upsert(payload, { onConflict: "user_id" });

    if (error) return { error: error.message };
    revalidatePath("/motorista/notificacoes");
    return { success: "Preferências de alertas salvas." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível salvar as preferências." };
  }
}
