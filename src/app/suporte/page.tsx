import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Car,
  Download,
  KeyRound,
  Mail,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Central de Ajuda",
  description: "Orientações sobre conta, planos, instalação, motorista profissional e segurança no JNE App.",
};

const faqGroups = [
  {
    title: "Conta e acesso",
    items: [
      { question: "Não recebi o e-mail de confirmação. O que faço?", answer: "Confira Spam, Lixo Eletrônico e abas de promoções. Verifique se o endereço foi digitado corretamente. Caso o link tenha expirado, refaça o cadastro ou solicite um novo acesso pelo suporte." },
      { question: "Esqueci minha senha.", answer: "Abra Recuperar senha, informe o e-mail cadastrado e use o link enviado. Por segurança, o aplicativo não mostra se um e-mail existe na base." },
      { question: "Por que preciso aceitar os documentos novamente?", answer: "Quando Termos ou Política de Privacidade recebem uma nova versão relevante, o JNE App solicita um novo aceite antes das áreas privadas." },
    ],
  },
  {
    title: "Planos e acesso",
    items: [
      { question: "O cadastro é pago?", answer: "Não. A conta e os recursos do plano Gratuito podem ser usados sem cobrança. Recursos profissionais e Premium dependem do plano ativo." },
      { question: "A cobrança é automática?", answer: "Não nesta fase. Solicitações, pagamentos e liberações são conferidos pela administração. O JNE App não armazena dados completos de cartão." },
      { question: "Meu recurso ficou bloqueado.", answer: "Abra Planos para confirmar o nível exigido, a situação da assinatura e a validade. Administradores também podem revisar liberações manuais." },
    ],
  },
  {
    title: "Motorista profissional",
    items: [
      { question: "O JNE App define o preço da corrida?", answer: "Não. Calculadoras e orçamentos geram referências com base nos dados informados. O motorista decide o preço final e continua responsável pela operação do serviço." },
      { question: "O aplicativo recebe o pagamento da viagem?", answer: "Não. O módulo financeiro é um controle pessoal. O pagamento da corrida ocorre diretamente entre motorista e passageiro pelos meios combinados." },
      { question: "Outros motoristas veem meus clientes?", answer: "Não. CRM, agenda, orçamentos e financeiro são privados. Uma indicação só compartilha os dados necessários quando existe autorização registrada do passageiro." },
    ],
  },
  {
    title: "Instalação e atualização",
    items: [
      { question: "O botão Instalar não apareceu.", answer: "No Android, abra o menu do Chrome e use Instalar aplicativo. No iPhone, abra pelo Safari, toque em Compartilhar e escolha Adicionar à Tela de Início." },
      { question: "O aplicativo parece estar em uma versão antiga.", answer: "Feche e abra novamente. Quando aparecer o aviso Nova versão disponível, toque em Atualizar. Também é possível limpar os dados do site e instalar de novo." },
      { question: "O JNE App funciona sem internet?", answer: "A tela offline e alguns arquivos estáticos podem abrir. Conta, reservas, comunidade, notificações e dados profissionais exigem conexão." },
    ],
  },
];

export default function SupportPage() {
  return (
    <div className="page-stack support-page">
      <PageHeader
        icon={<BookOpenCheck size={24} />}
        eyebrow="CENTRAL DE AJUDA"
        title="Encontre a resposta antes de perder tempo"
        description="Orientações práticas para cadastro, acesso, planos, instalação, ferramentas profissionais e segurança."
      />

      <section className="support-quick-grid">
        <Link href="/comecar"><BookOpenCheck size={24} /><div><h2>Primeiros passos</h2><p>Escolha seu caminho dentro do aplicativo.</p></div><ArrowRight size={18} /></Link>
        <Link href="/recuperar-senha"><KeyRound size={24} /><div><h2>Recuperar acesso</h2><p>Solicite a redefinição da sua senha.</p></div><ArrowRight size={18} /></Link>
        <Link href="/planos"><ShieldCheck size={24} /><div><h2>Planos e recursos</h2><p>Veja o que está liberado em cada nível.</p></div><ArrowRight size={18} /></Link>
        <Link href="/instalar"><Download size={24} /><div><h2>Instalar ou atualizar</h2><p>Use o JNE App pela tela inicial.</p></div><ArrowRight size={18} /></Link>
        <Link href="/motorista"><Car size={24} /><div><h2>Área do motorista</h2><p>Acesse operação, agenda e financeiro.</p></div><ArrowRight size={18} /></Link>
        <Link href="/configuracoes"><Smartphone size={24} /><div><h2>Configurações</h2><p>Tema, notificações e preferências.</p></div><ArrowRight size={18} /></Link>
      </section>

      <section className="support-faq-section">
        <div className="section-heading">
          <span className="eyebrow">DÚVIDAS FREQUENTES</span>
          <h2>Respostas diretas</h2>
          <p>As respostas abaixo descrevem o funcionamento atual da versão 2.0.</p>
        </div>
        <div className="support-faq-groups">
          {faqGroups.map((group) => (
            <article key={group.title}>
              <h3>{group.title}</h3>
              <div>
                {group.items.map((item) => (
                  <details key={item.question}>
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="support-contact-card">
        <div className="support-contact-card__icon"><Mail size={27} /></div>
        <div>
          <span>ATENDIMENTO HUMANO</span>
          <h2>O problema não foi resolvido?</h2>
          <p>Informe o e-mail da conta, dispositivo, navegador, rota onde ocorreu o problema e uma descrição objetiva. Nunca envie senha ou chave secreta.</p>
        </div>
        <div className="support-contact-card__actions">
          <a className="button button--primary" href="mailto:contato.jeannaestrada@gmail.com?subject=Suporte%20JNE%20App%202.0"><Mail size={17} /> Enviar e-mail</a>
          <Link className="button button--secondary" href="/contato">Canais oficiais</Link>
        </div>
      </section>

      <section className="support-security-note">
        <RefreshCw size={21} />
        <p><strong>Antes de pedir suporte:</strong> atualize a página, confira a conexão e confirme que está usando o endereço oficial <span>jneapp.app</span>.</p>
      </section>
    </div>
  );
}
