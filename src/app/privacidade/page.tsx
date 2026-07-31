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
      <LegalDocument version={LEGAL_VERSIONS.privacy} updatedAt="30 de julho de 2026" sections={[
        { title: "1. Controlador e contato", content: <p>O projeto Jean na Estrada é responsável pelas decisões sobre o tratamento dos dados no JNE App. Solicitações podem ser enviadas para contato.jeannaestrada@gmail.com.</p> },
        { title: "2. Dados tratados", content: <><p>Podemos tratar:</p><ul><li>nome, e-mail, identificador da conta, nível de acesso e avatar;</li><li>cookies e tokens necessários para autenticação e segurança;</li><li>preferências, notificações, convites, downloads e aceitações legais;</li><li>origem e validade do acesso VIP e registros de pagamento;</li><li>publicações, imagens, comentários, respostas, curtidas, votos, denúncias e moderação;</li><li>preferência de uso como motorista profissional e valores padrão;</li><li>orçamentos, viagens, clientes informados, rotas, datas, distância e tempo trabalhado;</li><li>receitas, despesas, formas de pagamento, valores pendentes e resultados calculados.</li></ul></> },
        { title: "3. Finalidades", content: <p>Os dados são utilizados para criar e proteger contas, controlar acessos, operar a comunidade, personalizar a tela inicial, calcular orçamentos e oferecer controle financeiro privado ao motorista.</p> },
        { title: "4. Privacidade dos dados profissionais", content: <p>Orçamentos, viagens e lançamentos financeiros são protegidos por políticas de acesso e ficam disponíveis somente para o próprio usuário autenticado. O painel administrativo não recebe acesso comum a esses valores individuais.</p> },
        { title: "5. Natureza do controle financeiro", content: <p>O módulo é uma ferramenta pessoal de organização. O JNE App não atua como instituição financeira, contador, intermediador de corridas ou processador dos pagamentos registrados pelo motorista.</p> },
        { title: "6. Pagamentos da assinatura", content: <p>O JNE App não coleta nem armazena números completos de cartão. Pagamentos por link são processados pelo provedor externo. No Pix manual, o usuário pode enviar referência ou comprovante privado para conferência administrativa.</p> },
        { title: "7. Visibilidade na comunidade", content: <p>Nome, avatar, nível de acesso e conteúdo publicado ficam visíveis aos membros VIP e administradores que possuem acesso à comunidade.</p> },
        { title: "8. Prestadores e transferências", content: <p>O funcionamento utiliza provedores como Supabase e Vercel e pode redirecionar para serviços de pagamento, YouTube, lojas e parceiros.</p> },
        { title: "9. Retenção", content: <p>Dados da conta, comprovantes, publicações, orçamentos e registros financeiros são mantidos enquanto estiverem ativos ou enquanto houver fundamento para retenção. A exclusão da conta remove os registros vinculados, ressalvadas obrigações legais e backups temporários.</p> },
        { title: "10. Direitos e segurança", content: <p>Você pode solicitar acesso, correção, informações, revogação e eliminação quando aplicável. Adotamos autenticação, políticas de acesso no banco, arquivos privados, respostas sem cache de sessão e registros administrativos.</p> },
      ]} />
    </div>
  );
}
