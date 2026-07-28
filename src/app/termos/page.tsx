import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { LegalDocument } from "@/components/LegalDocument";
import { PageHeader } from "@/components/PageHeader";
import { LEGAL_VERSIONS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Regras para utilização do JNE App.",
};

export default function TermsPage() {
  return (
    <div className="page-stack legal-page">
      <PageHeader
        icon={<ScrollText size={24} />}
        eyebrow="DOCUMENTO OFICIAL"
        title="Termos de Uso"
        description="Regras para acesso às áreas públicas, conta de membro, conteúdo VIP, arquivos e notificações do JNE App."
      />
      <LegalDocument
        version={LEGAL_VERSIONS.terms}
        updatedAt="28 de julho de 2026"
        sections={[
          {
            title: "1. Sobre o JNE App",
            content: <p>O JNE App reúne conteúdos do projeto Jean na Estrada, incluindo vídeos, notícias, tutoriais, aplicativos, parceiros, benefícios, área de membros e materiais exclusivos.</p>,
          },
          {
            title: "2. Cadastro e segurança da conta",
            content: <p>Você deve informar dados verdadeiros, proteger sua senha e não compartilhar a conta. Atividades realizadas com a sessão autenticada serão consideradas vinculadas ao respectivo usuário. Contas com uso abusivo, fraude, distribuição indevida de arquivos ou tentativa de contornar controles de acesso poderão ser bloqueadas.</p>,
          },
          {
            title: "3. Acesso VIP e convites",
            content: <p>O acesso VIP depende de autorização administrativa ou convite válido. Convites podem ter prazo, limite de usos e ser revogados. O acesso é pessoal e não autoriza redistribuição de arquivos, códigos, links privados ou materiais exclusivos.</p>,
          },
          {
            title: "4. Conteúdo, propriedade intelectual e uso permitido",
            content: <p>Textos, identidade visual, vídeos, tutoriais e materiais próprios são protegidos pela legislação aplicável. Você pode utilizar o conteúdo para fins pessoais e informativos, mas não pode copiar, revender, publicar ou disponibilizar materiais exclusivos sem autorização.</p>,
          },
          {
            title: "5. Aplicativos, APKs e modificações",
            content: <p>Aplicativos, instruções e arquivos relacionados a centrais multimídia podem ter limitações técnicas, riscos de incompatibilidade e impacto em garantia ou funcionamento. O usuário deve ler o aviso específico de segurança antes de instalar qualquer arquivo.</p>,
          },
          {
            title: "6. Links externos, parceiros e afiliados",
            content: <p>O aplicativo pode apontar para YouTube, lojas, parceiros, mapas e outros serviços. Compras, contratos, suporte, disponibilidade, preço e tratamento de dados nesses ambientes são de responsabilidade dos respectivos fornecedores. Alguns links podem gerar comissão ao projeto sem alterar o preço para o usuário.</p>,
          },
          {
            title: "7. Disponibilidade e alterações",
            content: <p>Buscamos manter o serviço disponível e atualizado, mas não garantimos funcionamento ininterrupto. Funcionalidades, benefícios, conteúdos e estes termos podem ser alterados por razões técnicas, legais ou operacionais. Mudanças relevantes exigirão novo aceite quando aplicável.</p>,
          },
          {
            title: "8. Encerramento e contato",
            content: <p>Você pode solicitar ou executar a exclusão da conta pelo perfil. Dúvidas, solicitações e denúncias podem ser enviadas para contato.jeannaestrada@gmail.com.</p>,
          },
        ]}
      />
    </div>
  );
}
