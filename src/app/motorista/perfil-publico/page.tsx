import type { Metadata } from "next";
import { ContactRound } from "lucide-react";
import { redirect } from "next/navigation";
import { DriverPublicProfileForm } from "@/components/DriverPublicProfileForm";
import { PageHeader } from "@/components/PageHeader";
import { SmartBackButton } from "@/components/SmartBackButton";
import { getAuthContext } from "@/lib/auth";
import type { DriverPublicProfile } from "@/lib/driver-public";

export const metadata: Metadata = { title: "Meu cartão profissional" };
export const dynamic = "force-dynamic";

export default async function DriverPublicProfilePage() {
  const { supabase, userId, profile, email } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista/perfil-publico");
  if (!profile?.is_professional_driver || profile.is_blocked) redirect("/perfil");
  const { data } = await supabase.from("driver_public_profiles").select("*").eq("user_id", userId).maybeSingle();
  return <div className="page-stack driver-page"><SmartBackButton className="text-link driver-back-link" fallbackHref="/motorista" label="Voltar ao painel" /><PageHeader icon={<ContactRound size={24} />} eyebrow="PERFIL PROFISSIONAL" title="Seu cartão digital" description="Configure em três passos. O passageiro verá apenas as informações profissionais que você escolher publicar." /><DriverPublicProfileForm userId={userId} defaultName={profile.full_name || email?.split("@")[0] || "Motorista"} defaultPhotoUrl={profile.avatar_url} initialProfile={(data as DriverPublicProfile | null) ?? null} /></div>;
}
