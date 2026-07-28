import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PwaSettings } from "@/components/PwaSettings";

export const metadata: Metadata = {
  title: "Configurações",
  description: "Instalação, conexão e atualizações do JNE App.",
};

export default function ConfiguracoesPage() {
  return (
    <div className="page-stack">
      <PageHeader
        icon={<Settings size={24} />}
        eyebrow="Aplicativo"
        title="Configurações"
        description="Gerencie a instalação, o funcionamento offline e as atualizações do JNE App."
      />
      <PwaSettings />
    </div>
  );
}
