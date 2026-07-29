import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { LegalDocument } from "@/components/LegalDocument";
import { PageHeader } from "@/components/PageHeader";
import { LEGAL_VERSIONS } from "@/lib/legal";

export const metadata: Metadata = { title: "Termos de Uso", description: "Regras para utilização do JNE App." };

export default function TermsPage() {
  return (
    <div className="page-stack legal-page">
      <PageHeader icon={<ScrollText size={24} />} eyebrow="DOCUMENTO OFICIAL" title="Termos de Uso" description="Regras para conta, assinatura, comunidade, área VIP, arquivos e serviços do JNE App." />
      <LegalDocument
        version={LEGAL_VERSIONS.terms}
        updatedAt="29 de julho de 2026"
        sections={[
          { title: "1. Sobre o JNE App", content: <p>O JNE App reúne conteúdos do projeto Jean na Estrada, incluindo vídeos, notícias, tutoriais, aplicativos, parceiros, benefícios, comunidade, área de membros e materiais exclusivos.</p> },
          { title: "2. Cadastro e segurança da conta", content: <p>Você deve informar dados verdadeiros, proteger sua senha e não compartilhar a conta. Contas com fraude, abuso, distribuição indevida de arquivos ou tentativa de contornar controles de acesso poderão ser bloqueadas ou excluídas.</p> },
          { title: "3. Acesso VIP", content: <p>O acesso VIP pode ser concedido por assinatura direta, verificação manual de membro do YouTube, convite, parceria ou cortesia administrativa. Cada acesso pode possuir validade definida ou permanecer sem prazo, conforme a modalidade registrada no painel.</p> },
          { title: "4. Assinatura e pagamento", content: <p>O valor, a periodicidade e as formas disponíveis são exibidos antes do pagamento. Pagamentos podem ocorrer por link de provedor externo ou Pix manual. Durante a fase inicial, a confirmação e a liberação são realizadas pela administração após conferência da referência ou comprovante enviado.</p> },
          { title: "5. Renovação, cancelamento e reembolso", content: <p>A renovação depende da modalidade escolhida e das regras do provedor de pagamento. O usuário pode solicitar cancelamento e esclarecimentos pelo contato oficial. Pedidos de reembolso serão avaliados conforme a legislação aplicável, a situação do pagamento e o uso do benefício.</p> },
          { title: "6. Conteúdo e uso permitido", content: <p>O acesso é pessoal e não autoriza copiar, revender, publicar ou redistribuir arquivos, códigos, links privados, tutoriais ou materiais exclusivos sem autorização.</p> },
          { title: "7. Comunidade e conteúdo dos membros", content: <><p>Na Comunidade VIP, o usuário pode publicar textos, imagens, comentários, respostas, curtidas e enquetes. Ao publicar, declara possuir autorização para o conteúdo e concede ao JNE App permissão não exclusiva para armazená-lo e exibi-lo dentro da plataforma enquanto a publicação estiver ativa.</p><p>Não são permitidos golpes, spam, assédio, discriminação, pirataria, exposição de dados pessoais, conteúdo ilegal ou instruções que coloquem pessoas e veículos em risco. Publicações podem ser ocultadas, bloqueadas ou removidas, e contas podem ter a participação limitada após análise da moderação.</p></> },
          { title: "8. Aplicativos, links e parceiros", content: <p>Aplicativos, instruções e serviços externos podem possuir riscos, limitações e políticas próprias. Compras ou pagamentos em ambientes externos são processados pelos respectivos fornecedores.</p> },
          { title: "9. Disponibilidade e alterações", content: <p>Funcionalidades, valores, benefícios e estes termos podem ser alterados por razões técnicas, comerciais, legais ou operacionais. Mudanças relevantes exigirão novo aceite quando aplicável.</p> },
          { title: "10. Encerramento e contato", content: <p>O usuário pode excluir a própria conta pelo perfil. A administração também pode excluir contas mediante solicitação ou necessidade operacional, preservando registros cuja retenção seja exigida. Contato: contato.jeannaestrada@gmail.com.</p> },
        ]}
      />
    </div>
  );
}
