import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { LegalDocument } from "@/components/LegalDocument";
import { PageHeader } from "@/components/PageHeader";
import { LEGAL_VERSIONS } from "@/lib/legal";

export const metadata: Metadata = { title: "Termos de Uso", description: "Regras para utilização do JNE App." };

export default function TermsPage() {
  return (
    <div className="page-stack legal-page">
      <PageHeader icon={<ScrollText size={24} />} eyebrow="DOCUMENTO OFICIAL" title="Termos de Uso" description="Regras para conta, assinatura, comunidade, ferramentas profissionais, área VIP, arquivos e serviços do JNE App." />
      <LegalDocument version={LEGAL_VERSIONS.terms} updatedAt="30 de julho de 2026" sections={[
        { title: "1. Sobre o JNE App", content: <p>O JNE App reúne conteúdos do projeto Jean na Estrada, comunidade, ferramentas para motoristas, área de membros e materiais exclusivos.</p> },
        { title: "2. Cadastro e segurança", content: <p>Você deve informar dados verdadeiros, proteger sua senha e não compartilhar a conta. Fraude, abuso ou tentativa de contornar controles pode resultar em bloqueio ou exclusão.</p> },
        { title: "3. Acesso VIP e assinatura", content: <p>O acesso VIP pode ser concedido por assinatura direta, verificação manual de membro do YouTube, convite, parceria ou cortesia. Valores e formas de pagamento são exibidos antes da contratação.</p> },
        { title: "4. Ferramentas para motoristas", content: <><p>A calculadora fornece estimativas baseadas nos valores informados pelo usuário. O JNE App não define tarifas obrigatórias, não intermedeia corridas e não participa do contrato de transporte.</p><p>O motorista é responsável pelo preço final, autorizações, seguros, tributos, regras locais, segurança e condições do veículo.</p></> },
        { title: "5. Controle financeiro", content: <p>Receitas, despesas, resultados por hora, resultados por quilômetro e valores pendentes são controles pessoais e estimativas. Eles não substituem documentos fiscais, extratos bancários ou orientação contábil, jurídica e financeira.</p> },
        { title: "6. Responsabilidade pelos registros", content: <p>O usuário é responsável pela exatidão dos dados registrados, inclusive valores recebidos, despesas, clientes, rotas, datas, formas de pagamento e situação da viagem.</p> },
        { title: "7. Conteúdo e uso permitido", content: <p>O acesso é pessoal e não autoriza copiar, revender, publicar ou redistribuir materiais exclusivos sem autorização.</p> },
        { title: "8. Comunidade", content: <p>Não são permitidos golpes, spam, assédio, discriminação, pirataria, exposição indevida de dados pessoais ou conteúdo ilegal.</p> },
        { title: "9. Aplicativos, links e parceiros", content: <p>Aplicativos, instruções e serviços externos podem possuir riscos, limitações e políticas próprias.</p> },
        { title: "10. Disponibilidade e alterações", content: <p>Funcionalidades, valores, benefícios e estes termos podem ser alterados por razões técnicas, comerciais, legais ou operacionais.</p> },
        { title: "11. Encerramento e contato", content: <p>O usuário pode excluir a própria conta pelo perfil. Contato: contato.jeannaestrada@gmail.com.</p> },
      ]} />
    </div>
  );
}
