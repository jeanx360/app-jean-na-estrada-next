import { ShieldCheck } from "lucide-react";
import { AdminNav } from "@/components/AdminNav";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="page-stack">
      <PageHeader
        icon={<ShieldCheck size={24} />}
        eyebrow="ADMINISTRAÇÃO JNE"
        title="Painel administrativo"
        description="Gerencie membros, validade do VIP, assinaturas, pagamentos, publicações, manuais, aplicativos, carrossel e conteúdos exclusivos sem editar o código."
      />
      <AdminNav />
      {children}
    </div>
  );
}
