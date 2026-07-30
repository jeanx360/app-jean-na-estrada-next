import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { LegalDocument } from "@/components/LegalDocument";
import { PageHeader } from "@/components/PageHeader";
import { LEGAL_VERSIONS } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de Privacidade", description: "Como o JNE App trata dados pessoais, pagamentos e informações profissionais." };

export default function PrivacyPage() {
  return (
    <div className="page-stack legal-page">
      <PageHeader icon={<ShieldCheck size={24} />} eyebrow="LGPD E TRANSPARÊNCIA" title="Política de Privacidade" description="Informações sobre coleta, uso, armazenamento, compartilhamento e exclusão de dados no JNE App." />
      <LegalDocument
        version={LEGAL_VERSIONS.privacy}
        updatedAt="30 de julho de 2026"
        sections={[
          { title: "1. Controlador e contato", content: <p>O projeto Jean na Estrada é responsável pelas decisões sobre o tratamento dos dados no JNE App. Solicitações podem ser enviadas para contato.jeannaestrada@gmail.com.</p> },
          { title: "2. Dados tratados", content: <><p>Podemos tratar:</p><ul><li>nome, e-mail, identificador da conta, nível de acesso e avatar;</li><li>cookies e tokens necessários para autenticação e segurança;</li><li>preferências, notificações, convites, downloads e aceitações legais;</li><li>origem e validade do acesso VIP e registros de pagamento;</li><li>publicações, imagens, comentários, respostas, curtidas, votos, denúncias e moderação;</li><li>preferência de uso como motorista profissional;</li><li>valores padrão por hora e quilômetro;</li><li>orçamentos salvos, rotas informadas, datas, distâncias, tempos, pedágios, estacionamento, outros custos e observações.</li></ul></> },
          { title: "3. Finalidades", content: <p>Os dados são utilizados para criar e proteger contas, controlar acessos, conferir pagamentos, operar a comunidade, personalizar a tela inicial, calcular e salvar orçamentos de viagens, permitir compartilhamento e prestar suporte.</p> },
          { title: "4. Privacidade dos dados profissionais", content: <p>Os valores e orçamentos do módulo Motorista Profissional são protegidos por políticas de acesso e ficam disponíveis somente para o próprio usuário autenticado. O painel administrativo não recebe acesso comum aos valores financeiros individuais desses registros.</p> },
          { title: "5. Pagamentos", content: <p>O JNE App não coleta nem armazena números completos de cartão. Pagamentos por link são processados pelo provedor externo. No Pix manual, o usuário pode enviar referência ou comprovante privado para conferência administrativa.</p> },
          { title: "6. Visibilidade na comunidade", content: <p>Nome, avatar, nível de acesso e conteúdo publicado ficam visíveis aos membros VIP e administradores que possuem acesso à comunidade. Não publique dados pessoais que não devam ser vistos por esses participantes.</p> },
          { title: "7. Prestadores e transferências", content: <p>O funcionamento utiliza provedores como Supabase e Vercel e pode redirecionar para serviços de pagamento, YouTube, lojas e parceiros. Cada prestador trata dados conforme seus contratos e políticas.</p> },
          { title: "8. Retenção", content: <p>Dados da conta, comprovantes, publicações e orçamentos salvos são mantidos enquanto estiverem ativos ou enquanto houver fundamento para retenção. A exclusão da conta remove os registros vinculados, ressalvadas obrigações legais e backups temporários.</p> },
          { title: "9. Direitos do titular", content: <p>Você pode solicitar confirmação, acesso, correção, informações sobre compartilhamento, revogação de permissões e, quando aplicável, bloqueio ou eliminação. O perfil permite atualizar informações e excluir a conta.</p> },
          { title: "10. Segurança", content: <p>Adotamos autenticação, autorização por função, políticas de acesso no banco, arquivos privados, respostas sem cache de sessão e registros administrativos. Segredos de pagamento e infraestrutura não são expostos no navegador.</p> },
        ]}
      />
    </div>
  );
}
