import type { Metadata } from "next";
import { Settings2 } from "lucide-react";
import { redirect } from "next/navigation";
import { DriverSettingsForm } from "@/components/DriverSettingsForm";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import { DEFAULT_DRIVER_SETTINGS, type DriverSettings } from "@/lib/driver";

export const metadata: Metadata = { title: "Configurações do motorista" };
export const dynamic = "force-dynamic";

export default async function DriverSettingsPage() {
  const { supabase, userId } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista/configuracoes");
  const { data } = await supabase.from("driver_settings").select("*").eq("user_id", userId).maybeSingle();
  const settings: DriverSettings = data
    ? data as DriverSettings
    : { user_id: userId, ...DEFAULT_DRIVER_SETTINGS };

  return (
    <div className="page-stack driver-page">
      <PageHeader icon={<Settings2 size={24} />} eyebrow="MOTORISTA PROFISSIONAL" title="Seus valores padrão" description="Configure uma vez e use esses parâmetros como ponto de partida em novos orçamentos." />
      <DriverSettingsForm userId={userId} initialSettings={settings} />
    </div>
  );
}
