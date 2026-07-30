import type { Metadata } from "next";
import { Calculator, Car } from "lucide-react";
import { DriverQuoteCalculator } from "@/components/DriverQuoteCalculator";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import { DEFAULT_DRIVER_SETTINGS, type DriverSettings } from "@/lib/driver";

export const metadata: Metadata = {
  title: "Calcular viagem particular",
  description: "Calcule um valor profissional para uma viagem particular usando quilômetros, horas e despesas.",
};

export const dynamic = "force-dynamic";

export default async function DriverCalculatorPage() {
  const { supabase, userId, profile } = await getAuthContext();
  let settings: DriverSettings = { user_id: userId ?? "guest", ...DEFAULT_DRIVER_SETTINGS };

  if (userId) {
    const { data } = await supabase.from("driver_settings").select("*").eq("user_id", userId).maybeSingle();
    if (data) settings = data as DriverSettings;
  }

  return (
    <div className="page-stack driver-page">
      <PageHeader
        icon={<Calculator size={24} />}
        eyebrow="MOTORISTA PROFISSIONAL"
        title="Quanto cobrar pela viagem?"
        description="Monte uma referência considerando distância, tempo trabalhado, espera, pedágios e custos extras."
      />
      {!userId ? (
        <div className="driver-public-notice"><Car size={20} /><div><strong>A calculadora é gratuita.</strong><p>Entre na conta para salvar seus valores padrão e manter um histórico de orçamentos.</p></div></div>
      ) : null}
      <DriverQuoteCalculator userId={userId} canSave={Boolean(userId && profile && !profile.is_blocked)} initialSettings={settings} />
    </div>
  );
}
