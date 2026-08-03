import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { LegalDocument } from "@/components/LegalDocument";
import { PageHeader } from "@/components/PageHeader";
import { LEGAL_VERSIONS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Regras de conta, conteúdo, comunidade e ferramentas profissionais do JNE App.",
};

export default function TermsPage() {
  return (
    <div className="page-stack legal-page">
      <PageHeader
        icon={<ScrollText size={24} />}
        eyebrow="DOCUMENTO OFICIAL"
        title="Termos de Uso"
        description="Regras para conta, planos, comunidade, ferramentas profissionais, área VIP, arquivos e serviços do JNE App."
      />
      <LegalDocument
        version={LEGAL_VERSIONS.terms}
        updatedAt="3 de agosto de 2026"
        sections={[
          {
            title: "1. Sobre a plataforma",
            content: <p>O JNE App é a plataforma oficial do projeto Jean na Estrada. Ele reúne conteúdo automotivo, comunidade, benefícios, área de membros e ferramentas de organização para motoristas profissionais.</p>,
          },
          {
            title: "2. Cadastro, confirmação e segurança da conta",
            content: <><p>O usuário deve fornecer informações verdadeiras, manter o e-mail atualizado, proteger a senha e não compartilhar a conta.</p><p>Fraude, abuso, tentativa de contornar permissões, exploração de falhas, spam ou uso que coloque terceiros em risco pode resultar em limitação, suspensão ou encerramento do acesso.</p></>,
          },
          {
            title: "3. Planos, testes e liberações",
            content: <><p>O JNE App pode oferecer planos Gratuito, Profissional e Premium, períodos de teste, convites, benefícios de parceiros e liberações administrativas.</p><p>Os recursos, prazos, limites e condições exibidos na conta prevalecem para o acesso técnico. Nesta fase, pagamentos e ativações podem depender de conferência manual e não há renovação automática pelo JNE App.</p></>,
          },
          {
            title: "4. Pagamentos e cancelamentos de planos",
            content: <><p>Pagamentos podem ocorrer por provedores externos ou Pix informado pela administração. O JNE App não armazena números completos de cartão.</p><p>Pedidos de alteração, cancelamento, correção ou análise de pagamento devem ser enviados pelos canais oficiais. Valores de períodos já utilizados e condições comerciais serão avaliados conforme a oferta apresentada e a situação do pedido.</p></>,
          },
          {
            title: "5. Ferramentas para motoristas",
            content: <><p>Calculadoras, CRM, agenda, reservas, orçamentos, financeiro, recibos, desempenho e notificações são ferramentas de organização. Elas não transformam o JNE App em transportadora, aplicativo de despacho, instituição financeira ou intermediador do contrato de transporte.</p><p>O motorista define o preço final, aceita ou recusa serviços e permanece responsável por habilitação, autorizações, seguro, tributos, segurança, manutenção do veículo e cumprimento das regras aplicáveis à própria atividade.</p></>,
          },
          {
            title: "6. Orçamentos, reservas e pagamentos de viagens",
            content: <><p>Orçamentos são referências elaboradas com os dados informados pelo motorista. A aceitação pública registra uma manifestação do passageiro, mas detalhes finais ainda podem depender de confirmação entre as partes.</p><p>O pagamento da viagem ocorre diretamente entre motorista e passageiro. O JNE App apenas registra informações inseridas pelo usuário e não garante recebimento, execução da viagem ou identidade das partes.</p></>,
          },
          {
            title: "7. Rede de motoristas e indicações",
            content: <p>A participação no diretório é opcional. Indicações devem ocorrer somente quando o passageiro autorizou o compartilhamento dos dados necessários. O motorista que envia e o que recebe a indicação são responsáveis pelo contato, pela avaliação do serviço e pela proteção das informações recebidas.</p>,
          },
          {
            title: "8. Controle financeiro e relatórios",
            content: <p>Receitas, despesas, metas, resultados, custos por quilômetro, resultados por hora e exportações são controles pessoais e estimativas. Eles não substituem extratos, documentos fiscais, contabilidade ou orientação jurídica e financeira.</p>,
          },
          {
            title: "9. Notificações e automações",
            content: <p>O JNE App pode gerar lembretes internos com base nos registros do usuário. Esses alertas não executam automaticamente corridas, cobranças ou contatos externos. O usuário deve revisar cada informação antes de agir.</p>,
          },
          {
            title: "10. Conteúdo, arquivos e propriedade intelectual",
            content: <p>Vídeos, textos, identidade visual, materiais, arquivos VIP e demais conteúdos não podem ser copiados, revendidos, republicados ou redistribuídos sem autorização. O acesso individual não transfere direitos de propriedade.</p>,
          },
          {
            title: "11. Comunidade e conduta",
            content: <p>Não são permitidos golpes, assédio, discriminação, ameaças, spam, pirataria, exposição indevida de dados, conteúdo ilegal ou tentativas de manipular denúncias e moderação.</p>,
          },
          {
            title: "12. Aplicativos, modificações, parceiros e links externos",
            content: <p>Aplicativos, APKs, menus técnicos, modificações em veículos, produtos, serviços de parceiros e sites externos podem ter riscos, garantias e políticas próprias. O usuário deve avaliar compatibilidade, origem e consequências antes de instalar, comprar ou alterar qualquer sistema.</p>,
          },
          {
            title: "13. Disponibilidade, manutenção e alterações",
            content: <p>Funcionalidades podem ficar temporariamente indisponíveis por manutenção, atualização, falha de infraestrutura, segurança ou fatores externos. Recursos, planos e documentos podem ser ajustados quando necessário, com novo aceite em mudanças relevantes.</p>,
          },
          {
            title: "14. Suporte e encerramento",
            content: <><p>O suporte é prestado pelos canais oficiais e pode solicitar informações técnicas, sem nunca pedir a senha do usuário.</p><p>Contas comuns podem solicitar exclusão pelo próprio perfil, observadas retenções necessárias para segurança, prevenção de fraude, obrigações e backups temporários. Contato: contato.jeannaestrada@gmail.com.</p></>,
          },
          {
            title: "15. Endereços, localização e Google Maps",
            content: <><p>Quando o usuário escolhe buscar um endereço, calcular uma rota ou usar a localização atual, o JNE App pode utilizar serviços da Plataforma Google Maps. A localização somente é solicitada após uma ação do usuário e também é possível digitar os endereços manualmente.</p><p>Ao usar esses recursos, o usuário concorda com os <a href="https://cloud.google.com/maps-platform/terms" target="_blank" rel="noreferrer">Termos de Serviço da Plataforma Google Maps</a>. Distância, duração e trajeto são estimativas e devem ser confirmados antes da viagem.</p></>,
          },
        ]}
      />
    </div>
  );
}
