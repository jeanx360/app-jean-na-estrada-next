import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { EvCalculator } from "@/components/EvCalculator";

export const metadata: Metadata = { title: "Calculadora EV" };

export default function CalculatorPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="EV X COMBUSTÃO"
        title="Calculadora de custos"
        description="Insira seus próprios dados para comparar energia, combustível, manutenção e valor de compra ao longo do tempo."
      />
      <EvCalculator />
    </div>
  );
}
