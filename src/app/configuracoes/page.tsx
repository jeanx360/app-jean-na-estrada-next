import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PushNotificationSettings } from "@/components/PushNotificationSettings";
import { PwaSettings } from "@/components/PwaSettings";

export const metadata: Metadata = {
  title: "Configurações",
  description: "Instalação, notificações, conexão e atualizações do JNE App.",
};

export default function ConfiguracoesPage() {
  return (
    <div className="page-stack">
      <PageHeader
        icon={<Settings size={24} />}
        eyebrow="Aplicativo"
        title="Configurações"
        description="Gerencie instalação, funcionamento offline, atualizações e notificações do JNE App."
      />
      <PwaSettings />
      <PushNotificationSettings />
    </div>
  );
}
