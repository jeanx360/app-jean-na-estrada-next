import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CarFront, Crown, Database, Route, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Sobre o JNE App",
  description: "Conheça a plataforma oficial do Jean na Estrada.",
};

const pillars = [
  { icon: Route, title: "Conteúdo em um só lugar", text: "Vídeos, notícias, tutoriais, aplicativos, parceiros e ferramentas." },
  { icon: Crown, title: "Comunidade e área VIP", text: "Acesso segmentado, convites e arquivos privados para membros autorizados." },
  { icon: BellRing, title: "Comunicação direta", text: "Central de avisos e Web Push por categoria, controlados pelo usuário." },
  { icon: ShieldCheck, title: "Segurança por padrão", text: "Sessões protegidas, RLS, arquivos temporários e registros administrativos." },
  { icon: Database, title: "Plataforma administrável", text: "Conteúdos e membros são gerenciados sem alterar o código do aplicativo." },
  { icon: CarFront, title: "Foco automotivo real", text: "Experiência prática com veículos elétricos, tecnologia e uso no dia a dia." },
];

export default function AboutPage() {
  return (
    <div className="page-stack">
      <PageHeader
        icon={<Route size={24} />}
        eyebrow="JEAN NA ESTRADA"
        title="Sobre o JNE App"
        description="A plataforma oficial criada para organizar conteúdo, comunidade, parceiros e benefícios do projeto Jean na Estrada."
      />
      <section className="about-hero">
        <span>VERSÃO 2.0</span>
        <h2>Conteúdo, comunidade e operação profissional em uma plataforma própria.</h2>
        <p>O JNE App reúne a experiência do Jean na Estrada, benefícios para a comunidade e ferramentas para motoristas organizarem clientes, reservas, orçamentos, financeiro e indicações.</p>
        <div>
          <Link className="button button--primary" href="/comecar">Começar agora</Link>
          <Link className="button button--secondary" href="/planos">Conhecer os planos</Link>
        </div>
      </section>
      <section className="about-grid">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return <article key={pillar.title}><Icon size={24} /><h2>{pillar.title}</h2><p>{pillar.text}</p></article>;
        })}
      </section>
    </div>
  );
}
