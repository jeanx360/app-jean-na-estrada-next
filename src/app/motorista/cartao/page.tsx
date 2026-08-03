import type { Metadata } from "next";
import Link from "next/link";
import { Crown, QrCode } from "lucide-react";
import { redirect } from "next/navigation";
import { DriverCampaignManager } from "@/components/DriverCampaignManager";
import { DriverQrCard } from "@/components/DriverQrCard";
import { PageHeader } from "@/components/PageHeader";
import { SmartBackButton } from "@/components/SmartBackButton";
import { getAuthContext } from "@/lib/auth";
import { accountHasFeature, getAccountPlan, planUpgradeUrl } from "@/lib/account-plan";
import type { DriverMarketingCampaign } from "@/lib/driver-marketing";
import type { DriverPublicProfile } from "@/lib/driver-public";

export const metadata: Metadata = { title: "Links, QR e campanhas" };
export const dynamic = "force-dynamic";

export default async function DriverCardPage() {
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista/cartao");
  if (!profile?.is_professional_driver || profile.is_blocked) redirect("/perfil");

  const accountPlan = await getAccountPlan(supabase, userId as string, profile!.role);
  const canUseCampaigns = accountHasFeature(accountPlan, "marketing_campaigns");
  const [{ data: profileData }, campaignResult] = await Promise.all([
    supabase.from("driver_public_profiles").select("*").eq("user_id", userId).maybeSingle(),
    canUseCampaigns
      ? supabase
        .from("driver_marketing_campaigns")
        .select("*")
        .eq("user_id", userId)
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (!profileData) redirect("/motorista/perfil-publico");
  const publicProfile = profileData as DriverPublicProfile;
  const campaigns = (campaignResult.data ?? []) as DriverMarketingCampaign[];

  return (
    <div className="page-stack driver-page driver-marketing-page">
      <SmartBackButton className="text-link driver-back-link" fallbackHref="/motorista" label="Voltar ao painel" />
      <PageHeader icon={<QrCode size={24} />} eyebrow="DIVULGAÇÃO RASTREÁVEL" title="Links, QR Codes e campanhas" description="Crie uma origem para cada canal e descubra quais divulgações realmente geram contatos e reservas." />
      <DriverQrCard profile={publicProfile} />
      {canUseCampaigns ? (
        <DriverCampaignManager profile={publicProfile} campaigns={campaigns} databaseAvailable={!campaignResult.error} />
      ) : (
        <section className="account-feature-locked-card">
          <Crown size={28} />
          <div><span>PLANO PREMIUM</span><h2>Campanhas rastreáveis</h2><p>O QR Code e os links básicos continuam disponíveis. Campanhas separadas por canal e relatório de conversão exigem o plano Premium.</p></div>
          <Link className="button button--primary" href={planUpgradeUrl("marketing_campaigns", "/motorista/cartao")}>Comparar planos</Link>
        </section>
      )}
    </div>
  );
}
