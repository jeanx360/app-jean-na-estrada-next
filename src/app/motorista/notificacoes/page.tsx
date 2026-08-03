import type { Metadata } from "next";
import { BellRing, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { DriverNotificationCenter, type DriverNotificationItem } from "@/components/DriverNotificationCenter";
import { DriverNotificationPreferencesForm } from "@/components/DriverNotificationPreferencesForm";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import type { DriverNotificationPreferences, NotificationCategory, NotificationPriority } from "@/types/notification";

export const metadata: Metadata = { title: "Notificações do motorista" };
export const dynamic = "force-dynamic";

const DRIVER_CATEGORIES: NotificationCategory[] = [
  "agenda",
  "customers",
  "quotes",
  "finance",
  "network",
  "subscription",
  "administration",
  "reservations",
];

function defaultPreferences(userId: string): DriverNotificationPreferences {
  return {
    user_id: userId,
    agenda_enabled: true,
    customers_enabled: true,
    quotes_enabled: true,
    finance_enabled: true,
    network_enabled: true,
    subscription_enabled: true,
    administration_enabled: true,
    reservation_upcoming_hours: 24,
    reservation_unconfirmed_hours: 48,
    quote_expiring_hours: 48,
    customer_inactive_days: 30,
  };
}

export default async function DriverNotificationsPage() {
  const { userId, profile, supabase } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista/notificacoes");
  if (!profile?.is_professional_driver || profile.is_blocked) redirect("/motorista");

  const [{ data: notificationData, error: notificationError }, { data: preferenceData }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id,title,message,category,priority,action_url,automation_type,source_entity_type,source_entity_id,published_at,expires_at")
      .eq("target_user_id", userId)
      .eq("is_published", true)
      .in("category", DRIVER_CATEGORIES)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(250),
    supabase
      .from("driver_notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (notificationError) throw new Error(notificationError.message);

  const now = Date.now();
  const rows = (notificationData ?? []).filter((item) => {
    const expiresAt = typeof item.expires_at === "string" ? Date.parse(item.expires_at) : Number.NaN;
    return !Number.isFinite(expiresAt) || expiresAt > now;
  });
  const ids = rows.map((item) => item.id as string);
  const { data: stateData, error: stateError } = ids.length
    ? await supabase
        .from("notification_reads")
        .select("notification_id,read_at,dismissed_at")
        .eq("user_id", userId)
        .in("notification_id", ids)
    : { data: [], error: null };

  if (stateError) throw new Error(stateError.message);
  const stateMap = new Map((stateData ?? []).map((item) => [item.notification_id as string, item]));

  const items: DriverNotificationItem[] = rows.map((item) => {
    const state = stateMap.get(item.id as string);
    return {
      id: item.id as string,
      title: item.title as string,
      message: item.message as string,
      category: item.category as NotificationCategory,
      priority: (item.priority || "normal") as NotificationPriority,
      action_url: (item.action_url as string | null) ?? null,
      automation_type: (item.automation_type as string | null) ?? null,
      source_entity_type: (item.source_entity_type as string | null) ?? null,
      source_entity_id: (item.source_entity_id as string | null) ?? null,
      published_at: item.published_at as string,
      expires_at: (item.expires_at as string | null) ?? null,
      read_at: (state?.read_at as string | null) ?? null,
      dismissed_at: (state?.dismissed_at as string | null) ?? null,
    };
  });

  const preferences = preferenceData
    ? preferenceData as DriverNotificationPreferences
    : defaultPreferences(userId);

  return (
    <div className="page-stack driver-page driver-notifications-page">
      <PageHeader
        icon={<BellRing size={24} />}
        eyebrow="MOTORISTA PROFISSIONAL"
        title="Automações e notificações"
        description="Receba alertas internos de agenda, clientes, orçamentos, financeiro, rede e assinatura sem perder o controle das decisões."
      />

      <aside className="driver-automation-safety-note">
        <ShieldCheck size={21} />
        <div>
          <strong>Você continua no controle</strong>
          <p>As automações apenas criam lembretes no JNE App. Elas não enviam WhatsApp, não cobram clientes e não alteram reservas.</p>
        </div>
      </aside>

      <DriverNotificationCenter initialItems={items} />
      <DriverNotificationPreferencesForm preferences={preferences} />
    </div>
  );
}
