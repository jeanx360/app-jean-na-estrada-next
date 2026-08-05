import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Edit3, TriangleAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminReleaseForm } from "@/components/AdminReleaseForm";
import { requireAdmin } from "@/lib/admin";
import type { AppReleaseRow } from "@/types/release-center";

export const metadata: Metadata = { title: "Editar atualização" };
export const dynamic = "force-dynamic";

const releaseSelect = [
  "id", "version", "title", "notification_title", "notification_message",
  "community_title", "community_body", "highlights", "audience", "action_url",
  "image_url", "publish_notification", "feature_notification", "send_push",
  "publish_community", "pin_community", "pin_days", "status", "scheduled_at",
  "published_at", "last_attempt_at", "community_pin_until", "community_unpinned_at",
  "notification_id", "community_post_id", "push_success_count", "push_failure_count",
  "error_message", "created_by", "updated_by", "created_at", "updated_at",
].join(", ");

export default async function EditReleasePage({ params }: { params: Promise<{ releaseId: string }> }) {
  const { releaseId } = await params;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("app_releases")
    .select(releaseSelect)
    .eq("id", releaseId)
    .maybeSingle();

  if (!data && !error) notFound();
  const release = data as AppReleaseRow | null;

  return (
    <div className="admin-section-stack release-center-edit-page">
      <Link className="button button--secondary release-center-edit-page__back" href="/admin/atualizacoes">
        <ArrowLeft size={17} /> Voltar à Central de Atualizações
      </Link>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>EDIÇÃO SEGURA</span><h2><Edit3 size={22} /> Atualização {release ? `v${release.version}` : ""}</h2></div>
        </div>
        {error ? <p className="auth-message auth-message--error"><TriangleAlert size={17} /> {error.message}</p> : null}
        {release ? <AdminReleaseForm release={release} /> : null}
      </section>
    </div>
  );
}
