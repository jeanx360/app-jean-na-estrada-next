import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, QrCode } from "lucide-react";
import { redirect } from "next/navigation";
import { DriverCampaignManager } from "@/components/DriverCampaignManager";
import { DriverQrCard } from "@/components/DriverQrCard";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import type { DriverMarketingCampaign } from "@/lib/driver-marketing";
import type { DriverPublicProfile } from "@/lib/driver-public";

export const metadata: Metadata = { title: "Links, QR e campanhas" };
export const dynamic = "force-dynamic";

export default async function DriverCardPage() {
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista/cartao");
  if (!profile?.is_professional_driver || profile.is_blocked) redirect("/perfil");

  const [{ data: profileData }, campaignResult] = await Promise.all([
    supabase.from("driver_public_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("driver_marketing_campaigns")
      .select("*")
      .eq("user_id", userId)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (!profileData) redirect("/motorista/perfil-publico");
  const publicProfile = profileData as DriverPublicProfile;
  const campaigns = (campaignResult.data ?? []) as DriverMarketingCampaign[];

  return (
    <div className="page-stack driver-page driver-marketing-page">
      <Link className="text-link driver-back-link" href="/motorista"><ArrowLeft size={17} /> Voltar ao painel</Link>
      <PageHeader icon={<QrCode size={24} />} eyebrow="DIVULGAÇÃO RASTREÁVEL" title="Links, QR Codes e campanhas" description="Crie uma origem para cada canal e descubra quais divulgações realmente geram contatos e reservas." />
      <DriverQrCard profile={publicProfile} />
      <DriverCampaignManager profile={publicProfile} campaigns={campaigns} databaseAvailable={!campaignResult.error} />
    </div>
  );
}
