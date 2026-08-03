import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { LegalDocument } from "@/components/LegalDocument";
import { PageHeader } from "@/components/PageHeader";
import { LEGAL_VERSIONS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o JNE App trata dados de conta, comunidade, motorista e suporte.",
};

export default function PrivacyPage() {
  return (
    <div className="page-stack legal-page">
      <PageHeader
        icon={<ShieldCheck size={24} />}
        eyebrow="PRIVACIDADE E TRANSPARÊNCIA"
        title="Política de Privacidade"
        description="Informações sobre coleta, uso, armazenamento, compartilhamento e exclusão de dados no JNE App."
      />
      <LegalDocument
        version={LEGAL_VERSIONS.privacy}
        updatedAt="3 de agosto de 2026"
        sections={[
          {
            title: "1. Responsável e canal de contato",
            content: <p>O projeto Jean na Estrada é responsável pelas decisões de tratamento no JNE App. Solicitações de privacidade e suporte podem ser enviadas para contato.jeannaestrada@gmail.com.</p>,
          },
          {
            title: "2. Dados de conta e autenticação",
            content: <p>Podemos tratar identificador da conta, nome, e-mail, avatar, biografia, nível de acesso, preferências, situação de bloqueio, datas de criação e atualização, além de cookies e tokens necessários para autenticação e segurança.</p>,
          },
          {
            title: "3. Dados de uso e preferências",
            content: <p>Podem ser registrados rota acessada, data e hora, identificador técnico transformado em hash, preferências de tema e tela inicial, notificações, instalação PWA, aceitações legais, convites e downloads.</p>,
          },
          {
            title: "4. Comunidade, conteúdo e moderação",
            content: <p>Publicações, imagens, comentários, respostas, curtidas, votos, denúncias e ações de moderação podem ser armazenados para operar a comunidade, prevenir abuso e manter histórico administrativo.</p>,
          },
          {
            title: "5. Dados profissionais do motorista",
            content: <><p>Quando o modo motorista é usado, podem ser tratados perfil público, foto, veículo, região, serviços, disponibilidade, QR Codes, campanhas, clientes, notas privadas, reservas, bloqueios de agenda, orçamentos, viagens, recibos, receitas, despesas, metas e resultados calculados.</p><p>Esses registros são protegidos por autenticação e políticas de acesso. Dados públicos aparecem somente conforme a configuração e publicação do próprio motorista.</p></>,
          },
          {
            title: "6. Rede de motoristas e indicações",
            content: <p>A participação no diretório é opcional. O telefone não é exibido publicamente. Quando uma indicação é criada com autorização do passageiro, os dados necessários podem ser disponibilizados ao motorista destinatário conforme as regras do recurso.</p>,
          },
          {
            title: "7. Notificações e automações",
            content: <p>Preferências de alertas, notificações lidas ou arquivadas, chaves de prevenção de duplicidade e registros de execução podem ser tratados para gerar lembretes internos e manter a confiabilidade técnica.</p>,
          },
          {
            title: "8. Planos, pagamentos e comprovantes",
            content: <p>Podemos tratar plano, origem da liberação, teste, validade, situação, histórico administrativo, pedido de assinatura, referência de pagamento e comprovante privado. Dados completos de cartão não são armazenados pelo JNE App.</p>,
          },
          {
            title: "9. Suporte e diagnóstico",
            content: <p>Mensagens de suporte podem conter e-mail da conta, dispositivo, navegador, rota, descrição do problema e arquivos enviados pelo usuário. Nunca solicitamos senha ou segredo de ambiente.</p>,
          },
          {
            title: "10. Finalidades do tratamento",
            content: <p>Os dados são usados para criar e proteger contas, fornecer recursos, controlar planos, operar comunidade e ferramentas profissionais, gerar notificações, prestar suporte, moderar conteúdo, investigar falhas, prevenir fraude e produzir estatísticas agregadas.</p>,
          },
          {
            title: "11. Visibilidade e compartilhamento",
            content: <><p>Nome, avatar e conteúdo publicado podem ficar visíveis conforme a área utilizada. Perfis de motoristas publicados mostram apenas os campos configurados para divulgação.</p><p>O funcionamento utiliza provedores de infraestrutura como Supabase e Vercel e pode direcionar para YouTube, serviços de pagamento, lojas e parceiros, que possuem políticas próprias.</p></>,
          },
          {
            title: "12. Administração e acesso técnico",
            content: <p>Administradores autorizados podem consultar informações necessárias para suporte, segurança, moderação, planos e operação da plataforma. Ações sensíveis devem permanecer registradas em logs administrativos.</p>,
          },
          {
            title: "13. Retenção e exclusão",
            content: <p>Dados são mantidos enquanto a conta ou o recurso estiver ativo, enquanto houver necessidade operacional, prevenção de fraude, segurança ou outra justificativa aplicável. A exclusão da conta remove registros vinculados conforme a estrutura do sistema, ressalvados logs, obrigações e backups temporários.</p>,
          },
          {
            title: "14. Direitos e escolhas do usuário",
            content: <p>O usuário pode atualizar dados do perfil, controlar preferências, deixar de publicar o perfil profissional, desativar categorias de notificações e solicitar informações, correção ou exclusão quando aplicável.</p>,
          },
          {
            title: "15. Segurança e atualizações desta política",
            content: <p>O JNE App utiliza autenticação, políticas de acesso no banco, arquivos privados, respostas sem cache para áreas de sessão, segredos no servidor e registros administrativos. Nenhum sistema é imune a falhas; mudanças relevantes nesta política exigirão novo aceite.</p>,
          },
          {
            title: "16. Localização, endereços e Google Maps",
            content: <><p>Quando solicitado pelo usuário, o navegador pode fornecer latitude e longitude para identificar o endereço de saída. Endereços digitados ou escolhidos, coordenadas necessárias, distância e duração estimada podem ser enviados à Plataforma Google Maps para completar endereços e calcular a rota.</p><p>Esses dados são usados para preparar a solicitação e o orçamento da viagem. O usuário pode negar a localização e informar os endereços manualmente. O tratamento realizado pelo Google segue a <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Política de Privacidade do Google</a> e os <a href="https://cloud.google.com/maps-platform/terms" target="_blank" rel="noreferrer">Termos da Plataforma Google Maps</a>.</p></>,
          },
        ]}
      />
    </div>
  );
}
