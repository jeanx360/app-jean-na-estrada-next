import type { Metadata } from "next";
import { FileCheck2 } from "lucide-react";
import { redirect } from "next/navigation";
import { LegalAcceptanceForm } from "@/components/LegalAcceptanceForm";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import { getLegalAcceptanceStatus, safeInternalPath } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Aceite dos documentos",
  description: "Confirmação dos termos, privacidade e aviso de segurança do JNE App.",
};

export default async function LegalAcceptancePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeInternalPath(params.next);
  const { supabase, userId } = await getAuthContext();

  if (!userId) redirect(`/entrar?next=${encodeURIComponent(`/aceite?next=${next}`)}`);

  const status = await getLegalAcceptanceStatus(supabase, userId);
  if (status.complete) redirect(next);

  return (
    <div className="page-stack legal-page">
      <PageHeader
        icon={<FileCheck2 size={24} />}
        eyebrow="PRIMEIRO ACESSO"
        title="Leia e confirme antes de continuar"
        description="Esses documentos explicam as regras de uso, o tratamento dos dados e os cuidados necessários com APKs e modificações em veículos."
      />
      <section className="legal-acceptance-card">
        <h2>Transparência antes do acesso</h2>
        <p>Abra cada documento, leia com atenção e marque as três confirmações.</p>
        {status.error ? (
          <p className="auth-message auth-message--error">
            A estrutura de aceite ainda não está disponível. Execute a migração 1.0.0 no Supabase.
          </p>
        ) : null}
        <LegalAcceptanceForm next={next} />
      </section>
    </div>
  );
}
