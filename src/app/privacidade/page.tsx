import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { LegalDocument } from "@/components/LegalDocument";
import { PageHeader } from "@/components/PageHeader";
import { LEGAL_VERSIONS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o JNE App trata dados pessoais e protege a conta dos usuários.",
};

export default function PrivacyPage() {
  return (
    <div className="page-stack legal-page">
      <PageHeader
        icon={<ShieldCheck size={24} />}
        eyebrow="LGPD E TRANSPARÊNCIA"
        title="Política de Privacidade"
        description="Informações sobre coleta, uso, armazenamento, compartilhamento e exclusão de dados no JNE App."
      />
      <LegalDocument
        version={LEGAL_VERSIONS.privacy}
        updatedAt="28 de julho de 2026"
        sections={[
          {
            title: "1. Controlador e contato",
            content: <p>O projeto Jean na Estrada é responsável pelas decisões sobre o tratamento dos dados no JNE App. Solicitações relacionadas à privacidade podem ser enviadas para contato.jeannaestrada@gmail.com.</p>,
          },
          {
            title: "2. Dados tratados",
            content: <><p>Podemos tratar:</p><ul><li>nome, e-mail, identificador da conta, nível de acesso e avatar;</li><li>cookies e tokens estritamente necessários para autenticação e segurança;</li><li>preferências de tema e notificações;</li><li>assinatura Web Push, categoria de avisos e informações técnicas do navegador;</li><li>registros de convites, downloads VIP, aceitações legais e ações administrativas;</li><li>mensagens enviadas voluntariamente pelos canais de contato.</li></ul></>,
          },
          {
            title: "3. Finalidades",
            content: <p>Os dados são utilizados para criar e proteger contas, controlar acessos, entregar conteúdo autorizado, registrar aceites, enviar notificações solicitadas, prestar suporte, prevenir abuso, medir o funcionamento da plataforma e cumprir obrigações legais.</p>,
          },
          {
            title: "4. Prestadores e transferências",
            content: <p>O funcionamento utiliza provedores de infraestrutura e autenticação, como Supabase e Vercel, além de serviços externos acessados por links, como YouTube e lojas parceiras. Esses provedores podem processar dados em outros países conforme seus contratos e políticas, sempre limitados às finalidades necessárias ao serviço.</p>,
          },
          {
            title: "5. Cookies e armazenamento local",
            content: <p>Utilizamos cookies de sessão e armazenamento local necessários para login, segurança, tema, instalação PWA e preferências. O JNE App não depende de cookies publicitários próprios para liberar as funções essenciais.</p>,
          },
          {
            title: "6. Retenção e exclusão",
            content: <p>Os dados são mantidos enquanto a conta estiver ativa ou pelo período necessário para segurança, exercício de direitos e cumprimento de obrigação legal. A exclusão da conta remove os dados vinculados, ressalvados registros cuja conservação seja permitida ou exigida pela legislação.</p>,
          },
          {
            title: "7. Direitos do titular",
            content: <p>Você pode solicitar confirmação e acesso, corrigir dados, revogar permissões, pedir informações sobre compartilhamento e, quando aplicável, solicitar bloqueio ou eliminação. O perfil permite atualizar informações e excluir a conta.</p>,
          },
          {
            title: "8. Segurança e incidentes",
            content: <p>Adotamos autenticação, autorização por função, políticas de acesso no banco, links temporários para arquivos privados e registros administrativos. Nenhum sistema é totalmente imune a incidentes; ocorrências relevantes serão tratadas conforme a legislação e os riscos envolvidos.</p>,
          },
        ]}
      />
    </div>
  );
}
