import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { LegalDocument } from "@/components/LegalDocument";
import { PageHeader } from "@/components/PageHeader";
import { LEGAL_VERSIONS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Segurança de APKs",
  description: "Avisos importantes antes de instalar aplicativos ou modificar a central do veículo.",
};

export default function ApkSafetyPage() {
  return (
    <div className="page-stack legal-page">
      <PageHeader
        icon={<ShieldAlert size={24} />}
        eyebrow="LEIA ANTES DE INSTALAR"
        title="APKs, desbloqueios e modificações"
        description="Orientações para reduzir riscos ao instalar aplicativos ou acessar configurações avançadas do veículo."
      />
      <LegalDocument
        version={LEGAL_VERSIONS.apk_disclaimer}
        updatedAt="28 de julho de 2026"
        sections={[
          {
            title: "1. Risco técnico",
            content: <p>Instalar APKs, acessar menus de serviço ou alterar configurações pode causar incompatibilidade, travamentos, perda de dados, restauração de fábrica ou falhas na central multimídia. Nenhum procedimento é livre de risco.</p>,
          },
          {
            title: "2. Garantia e responsabilidade",
            content: <p>As regras de garantia variam por fabricante, concessionária, veículo e tipo de alteração. Confirme previamente as condições aplicáveis ao seu carro. A decisão de instalar, remover ou modificar qualquer recurso é do proprietário ou responsável pelo veículo.</p>,
          },
          {
            title: "3. Segurança ao dirigir",
            content: <p>Não instale, configure, teste vídeos, jogos ou aplicativos enquanto dirige. Recursos que desviem a atenção devem ser utilizados somente com o veículo parado e em local seguro. Respeite a legislação de trânsito e as limitações do fabricante.</p>,
          },
          {
            title: "4. Origem e integridade dos arquivos",
            content: <p>Use apenas arquivos cuja distribuição seja autorizada. Evite aplicativos pagos pirateados, modificados sem procedência ou obtidos em links desconhecidos. Quando disponível, confira versão, origem, compatibilidade e hash do arquivo.</p>,
          },
          {
            title: "5. Preparação e recuperação",
            content: <p>Antes de qualquer alteração, registre a configuração original, mantenha bateria suficiente, leia o tutorial completo e saiba como restaurar o sistema. Não altere opções que você não compreende.</p>,
          },
          {
            title: "6. Compatibilidade",
            content: <p>Um aplicativo funcionar em um modelo, versão de software ou país não garante funcionamento em outro. Atualizações do veículo podem alterar permissões e compatibilidade sem aviso.</p>,
          },
        ]}
      />
    </div>
  );
}
