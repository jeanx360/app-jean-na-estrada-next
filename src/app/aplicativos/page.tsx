import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Aplicativos" };

export default function AppsPage() {
  return (
    <PlaceholderPage
      eyebrow="APLICATIVOS AUTOMOTIVOS"
      title="Aplicativos para carros"
      description="Área preparada para organizar aplicativos, versões, compatibilidade e instruções de instalação."
      items={[
        { title: "Compatibilidade", description: "Identificação clara de modelos, centrais e versões suportadas." },
        { title: "Segurança", description: "Origem, versão, checksum e alertas antes do download." },
        { title: "Histórico de versões", description: "Controle de atualizações e versões anteriores dos arquivos." },
      ]}
    />
  );
}
