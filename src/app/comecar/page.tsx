import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Car,
  CheckCircle2,
  Crown,
  PlayCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PwaInstallChecklistItem } from "@/components/PwaInstallChecklistItem";
import { getAccountPlan } from "@/lib/account-plan";
import { getAuthContext } from "@/lib/auth";
import { getLegalAcceptanceStatus } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Comece aqui",
  description: "Primeiros passos para usar conteúdo, comunidade e ferramentas profissionais do JNE App.",
};
export const dynamic = "force-dynamic";

export default async function StartPage() {
  const { supabase, userId, profile } = await getAuthContext();
  const legal = userId ? await getLegalAcceptanceStatus(supabase, userId) : null;
  const accountPlan = userId ? await getAccountPlan(supabase, userId, profile?.role) : null;
  const displayName = profile?.full_name?.split(" ")[0] || "você";

  const accountReady = Boolean(userId && profile);
  const legalReady = Boolean(legal?.complete);
  const driverReady = Boolean(profile?.is_professional_driver);

  return (
    <div className="page-stack commercial-onboarding-page">
      <PageHeader
        icon={<PlayCircle size={24} />}
        eyebrow="PRIMEIROS PASSOS"
        title={userId ? `Bem-vindo, ${displayName}` : "Escolha como deseja usar o JNE App"}
        description={userId ? "Conteúdo, comunidade e operação profissional foram organizados em caminhos simples." : "Como passageiro, você pode encontrar um motorista e solicitar orçamento sem login. A conta continua opcional para recursos adicionais."}
      />

      <section className="onboarding-progress-card">
        <header>
          <div>
            <span>{userId ? "CONFIGURAÇÃO ESSENCIAL" : "ACESSO LIVRE PARA PASSAGEIROS"}</span>
            <h2>{userId ? "Sua conta está quase pronta" : "Comece sem criar uma conta"}</h2>
          </div>
          {accountPlan ? <strong>Plano {accountPlan.name}</strong> : <strong>Sem login</strong>}
        </header>
        <div className="onboarding-progress-grid">
          {userId ? (
            <>
              <article className={accountReady ? "is-complete" : ""}>
                {accountReady ? <CheckCircle2 size={21} /> : <UserRound size={21} />}
                <div><strong>Conta e perfil</strong><span>{accountReady ? "Conta conectada" : "Cadastro gratuito"}</span></div>
                <Link href={accountReady ? "/perfil" : "/cadastro"}>{accountReady ? "Revisar" : "Criar"}</Link>
              </article>
              <article className={legalReady ? "is-complete" : ""}>
                {legalReady ? <CheckCircle2 size={21} /> : <ShieldCheck size={21} />}
                <div><strong>Documentos</strong><span>{legalReady ? "Aceite atualizado" : "Termos e privacidade"}</span></div>
                <Link href="/aceite?next=/comecar">{legalReady ? "Revisar" : "Ler"}</Link>
              </article>
              <article className={driverReady ? "is-complete" : ""}>
                {driverReady ? <CheckCircle2 size={21} /> : <Car size={21} />}
                <div><strong>Modo motorista</strong><span>{driverReady ? "Ativado" : "Opcional"}</span></div>
                <Link href="/perfil">{driverReady ? "Configurar" : "Conhecer"}</Link>
              </article>
            </>
          ) : (
            <>
              <article className="is-complete">
                <Car size={21} />
                <div><strong>Encontre um motorista</strong><span>Perfis públicos e rotas disponíveis</span></div>
                <Link href="/motoristas">Abrir</Link>
              </article>
              <article className="is-complete">
                <CheckCircle2 size={21} />
                <div><strong>Solicite sem login</strong><span>Use somente nome e WhatsApp</span></div>
                <Link href="/motoristas">Começar</Link>
              </article>
              <article>
                <UserRound size={21} />
                <div><strong>Conta completa</strong><span>Opcional para recursos adicionais</span></div>
                <Link href="/cadastro">Conhecer</Link>
              </article>
            </>
          )}
          <PwaInstallChecklistItem />
        </div>
      </section>

      <section className="onboarding-path-grid" aria-label="Caminhos do JNE App">
        <article className="onboarding-path-card onboarding-path-card--passenger">
          <Car size={29} />
          <span>PASSAGEIRO</span>
          <h2>Solicitar corrida sem login</h2>
          <p>Escolha um motorista, informe seu nome e WhatsApp e siga o orçamento guiado com rota, data, horário, retorno e espera.</p>
          <div>
            <Link className="button button--primary" href="/motoristas">Encontrar motorista <ArrowRight size={17} /></Link>
            <Link className="button button--secondary" href="/cadastro">Cadastro opcional</Link>
          </div>
        </article>
        <article className="onboarding-path-card onboarding-path-card--content">
          <BookOpenCheck size={29} />
          <span>CONTEÚDO E FERRAMENTAS</span>
          <h2>Acompanhar o Jean na Estrada</h2>
          <p>Vídeos, notícias, tutoriais, aplicativos, manuais, parceiros e calculadora de economia para veículos elétricos.</p>
          <div>
            <Link className="button button--primary" href="/videos">Ver conteúdos <ArrowRight size={17} /></Link>
            <Link className="button button--secondary" href="/guia">Abrir guia</Link>
          </div>
        </article>

        <article className="onboarding-path-card onboarding-path-card--community">
          <Crown size={29} />
          <span>COMUNIDADE E BENEFÍCIOS</span>
          <h2>Participar como membro</h2>
          <p>Centralize sua conta, acompanhe comunicados, acesse a comunidade e consulte os benefícios liberados para seu plano.</p>
          <div>
            <Link className="button button--primary" href={userId ? "/membros" : "/cadastro"}>{userId ? "Abrir minha conta" : "Criar conta"} <ArrowRight size={17} /></Link>
            <Link className="button button--secondary" href="/planos">Comparar planos</Link>
          </div>
        </article>

        <article className="onboarding-path-card onboarding-path-card--driver">
          <Car size={29} />
          <span>MOTORISTA PROFISSIONAL</span>
          <h2>Organizar clientes e viagens</h2>
          <p>Perfil público, QR Code, CRM, agenda, reservas, orçamentos, financeiro, rede de motoristas e notificações internas.</p>
          <div>
            <Link className="button button--primary" href={driverReady ? "/motorista" : userId ? "/perfil" : "/cadastro"}>{driverReady ? "Abrir painel" : "Ativar modo motorista"} <ArrowRight size={17} /></Link>
            <Link className="button button--secondary" href="/planos">Ver recursos</Link>
          </div>
        </article>
      </section>

      <section className="onboarding-help-strip">
        <ShieldCheck size={27} />
        <div>
          <span>PRECISA DE ORIENTAÇÃO?</span>
          <h2>A Central de Ajuda reúne respostas e caminhos de suporte.</h2>
        </div>
        <Link className="button button--secondary" href="/suporte">Abrir ajuda</Link>
      </section>
    </div>
  );
}
