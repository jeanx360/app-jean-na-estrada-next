import type { Metadata } from "next";
import Link from "next/link";
import { Download, RefreshCw, ShieldCheck, Smartphone, WifiOff } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PwaInstallButton } from "@/components/PwaInstallButton";

export const metadata: Metadata = {
  title: "Instalar JNE App",
  description: "Instale o JNE App na tela inicial e saiba como receber atualizações.",
};

export default function InstallPage() {
  return (
    <div className="page-stack install-page">
      <PageHeader
        icon={<Download size={24} />}
        eyebrow="APLICATIVO INSTALÁVEL"
        title="Leve o JNE App para a tela inicial"
        description="A instalação PWA não exige loja de aplicativos. Você continua usando o endereço oficial, com abertura em tela própria e atualização controlada."
      />

      <section className="install-hero-card">
        <div className="install-hero-card__icon"><Smartphone size={34} /></div>
        <div>
          <span>INSTALAÇÃO SEGURA</span>
          <h2>Instale diretamente pelo navegador</h2>
          <p>O JNE App não pede APK para funcionar como aplicativo. Use o botão abaixo ou siga as instruções do seu aparelho.</p>
        </div>
        <PwaInstallButton />
      </section>

      <section className="install-device-grid">
        <article>
          <span>ANDROID · CHROME OU EDGE</span>
          <h2>Instalar aplicativo</h2>
          <ol>
            <li>Abra <strong>jneapp.app</strong> no navegador.</li>
            <li>Toque no menu de três pontos.</li>
            <li>Escolha <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
            <li>Confirme e abra pelo novo ícone.</li>
          </ol>
        </article>
        <article>
          <span>IPHONE · SAFARI</span>
          <h2>Adicionar à Tela de Início</h2>
          <ol>
            <li>Abra <strong>jneapp.app</strong> no Safari.</li>
            <li>Toque no botão <strong>Compartilhar</strong>.</li>
            <li>Escolha <strong>Adicionar à Tela de Início</strong>.</li>
            <li>Confirme o nome e toque em <strong>Adicionar</strong>.</li>
          </ol>
        </article>
        <article>
          <span>COMPUTADOR · CHROME OU EDGE</span>
          <h2>Instalar no desktop</h2>
          <ol>
            <li>Abra o endereço oficial.</li>
            <li>Procure o ícone de instalação na barra de endereço.</li>
            <li>Clique em <strong>Instalar</strong>.</li>
            <li>Fixe o atalho na barra de tarefas, se desejar.</li>
          </ol>
        </article>
      </section>

      <section className="install-guidance-grid">
        <article><RefreshCw size={23} /><div><h2>Atualizações</h2><p>Quando uma nova versão estiver pronta, o aplicativo mostrará um aviso. Toque em Atualizar para trocar os arquivos antigos.</p></div></article>
        <article><WifiOff size={23} /><div><h2>Uso sem conexão</h2><p>A tela offline e alguns recursos públicos podem abrir, mas conta e dados profissionais precisam de internet.</p></div></article>
        <article><ShieldCheck size={23} /><div><h2>Endereço oficial</h2><p>Instale somente a partir de <strong>jneapp.app</strong>. Nunca informe senha em páginas copiadas ou links desconhecidos.</p></div></article>
      </section>

      <section className="install-help-strip">
        <div><span>AINDA NÃO CONSEGUIU?</span><h2>Consulte a Central de Ajuda.</h2></div>
        <Link className="button button--secondary" href="/suporte">Abrir suporte</Link>
      </section>
    </div>
  );
}
