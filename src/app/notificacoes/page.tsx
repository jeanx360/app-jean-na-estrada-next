import type { Metadata } from "next";
import { BellRing } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import type { NotificationRow } from "@/types/notification";

export const metadata: Metadata = {
  title: "Notificações",
  description: "Avisos, vídeos, tutoriais, aplicativos e benefícios do JNE App.",
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { userId, supabase } = await getAuthContext();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, title, message, audience, category, action_url, image_url, is_published, is_featured, published_at, push_requested, push_sent_at, push_success_count, push_failure_count, source_key, created_at, updated_at",
    )
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(100);

  const items = ((data ?? []) as NotificationRow[]).map((item) => ({
    ...item,
    publishedLabel: new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(item.published_at)),
  }));

  let readIds: string[] = [];
  let dismissedIds: string[] = [];
  if (userId && items.length) {
    const { data: reads } = await supabase
      .from("notification_reads")
      .select("notification_id, dismissed_at")
      .eq("user_id", userId)
      .in("notification_id", items.map((item) => item.id));
    readIds = (reads ?? []).map((item) => item.notification_id as string);
    dismissedIds = (reads ?? []).filter((item) => Boolean(item.dismissed_at)).map((item) => item.notification_id as string);
  }

  return (
    <div className="page-stack">
      <PageHeader
        icon={<BellRing size={24} />}
        eyebrow="CENTRAL JNE"
        title="Notificações"
        description="Acompanhe os avisos importantes, novos vídeos, tutoriais, aplicativos e benefícios publicados no JNE App."
      />
      {error ? <p className="auth-message auth-message--error">{error.message}</p> : null}
      <NotificationCenter items={items} initialReadIds={readIds} initialDismissedIds={dismissedIds} authenticated={Boolean(userId)} />
    </div>
  );
}
