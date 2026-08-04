import type { Metadata } from "next";
import { BriefcaseBusiness } from "lucide-react";
import { redirect } from "next/navigation";
import { DriverServicesManager } from "@/components/DriverServicesManager";
import { PageHeader } from "@/components/PageHeader";
import { SmartBackButton } from "@/components/SmartBackButton";
import { getAuthContext } from "@/lib/auth";
import type { DriverServicePackage } from "@/lib/driver-public";

export const metadata: Metadata = { title: "Rotas e serviços frequentes" };
export const dynamic = "force-dynamic";

export default async function DriverServicesPage() {
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista/servicos");
  if (!profile?.is_professional_driver || profile.is_blocked) redirect("/perfil");
  const { data } = await supabase.from("driver_service_packages").select("*").eq("user_id", userId).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  return <div className="page-stack driver-page"><SmartBackButton className="text-link driver-back-link" fallbackHref="/motorista" label="Voltar ao painel" /><PageHeader icon={<BriefcaseBusiness size={24} />} eyebrow="PERFIL PROFISSIONAL" title="Rotas e serviços frequentes" description="Cadastre trajetos que você faz com frequência e outros serviços. O passageiro escolhe uma opção ou informa outra rota." /><DriverServicesManager userId={userId} initialItems={(data ?? []) as DriverServicePackage[]} mapsEmbedKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY || ""} /></div>;
}
