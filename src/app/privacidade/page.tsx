import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { LegalDocument } from "@/components/LegalDocument";
import { PageHeader } from "@/components/PageHeader";
import { LEGAL_VERSIONS } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de Privacidade", description: "Como o JNE App trata dados pessoais e pagamentos." };

export default function PrivacyPage() {
  return (
    <div className="page-stack legal-page">
      <PageHeader icon={<ShieldCheck size={24} />} eyebrow="LGPD E TRANSPARÊNCIA" title="Política de Privacidade" description="Informações sobre coleta, uso, armazenamento, compartilhamento e exclusão de dados no JNE App." />
      <LegalDocument
        version={LEGAL_VERSIONS.privacy}
        updatedAt="29 de julho de 2026"
        sections={[
          { title: "1. Controlador e contato", content: <p>O projeto Jean na Estrada é responsável pelas decisões sobre o tratamento dos dados no JNE App. Solicitações podem ser enviadas para contato.jeannaestrada@gmail.com.</p> },
          { title: "2. Dados tratados", content: <><p>Podemos tratar:</p><ul><li>nome, e-mail, identificador da conta, nível de acesso e avatar;</li><li>cookies e tokens necessários para autenticação e segurança;</li><li>preferências, notificações, convites, downloads e aceitações legais;</li><li>origem e validade do acesso VIP, incluindo verificação manual de membro do YouTube;</li><li>forma de pagamento escolhida, referência, observação e comprovante enviado voluntariamente;</li><li>registros administrativos de aprovação, bloqueio e exclusão.</li></ul></> },
          { title: "3. Finalidades", content: <p>Os dados são utilizados para criar e proteger contas, controlar acessos, conferir pagamentos, liberar ou encerrar benefícios VIP, prestar suporte, prevenir fraude, registrar decisões administrativas e cumprir obrigações legais.</p> },
          { title: "4. Pagamentos", content: <p>O JNE App não coleta nem armazena números completos de cartão. Pagamentos por link são processados pelo provedor externo. No Pix manual, o usuário pode enviar referência ou comprovante, armazenado de forma privada para conferência administrativa.</p> },
          { title: "5. Prestadores e transferências", content: <p>O funcionamento utiliza provedores como Supabase e Vercel e pode redirecionar para serviços de pagamento, YouTube, lojas e parceiros. Cada prestador trata dados conforme seus contratos e políticas.</p> },
          { title: "6. Retenção", content: <p>Comprovantes e registros de pagamento são mantidos pelo período necessário para conferência, suporte, prevenção a fraude, exercício de direitos e obrigações legais. Dados da conta são mantidos enquanto ela estiver ativa ou enquanto houver fundamento para retenção.</p> },
          { title: "7. Direitos do titular", content: <p>Você pode solicitar confirmação, acesso, correção, informações sobre compartilhamento, revogação de permissões e, quando aplicável, bloqueio ou eliminação. O perfil permite atualizar informações e excluir a conta.</p> },
          { title: "8. Segurança", content: <p>Adotamos autenticação, autorização por função, políticas de acesso no banco, arquivos privados, links temporários e registros administrativos. Segredos de pagamento e de infraestrutura não são expostos no navegador.</p> },
        ]}
      />
    </div>
  );
}
