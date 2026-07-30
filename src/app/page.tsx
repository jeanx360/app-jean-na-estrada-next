import Link from "next/link";
import { ArrowRight, BatteryCharging, Calculator, Route } from "lucide-react";
import { redirect } from "next/navigation";
import { HomeCarousel } from "@/components/HomeCarousel";
import { LiveVideoGrid } from "@/components/LiveVideoGrid";
import { videos } from "@/data/content";
import { trustItems } from "@/data/home";
import { getAuthContext } from "@/lib/auth";
import { getHomeCarouselSlides } from "@/lib/home-carousel";
import {
  getHomeQuickAccessIcon,
  getHomeQuickAccessItems,
} from "@/lib/home-quick-access";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ modo?: string }> };

export default async function Home({ searchParams }: Props) {
  const { modo } = await searchParams;
  const { profile } = await getAuthContext();

  if (profile?.is_professional_driver && profile.preferred_home === "driver" && modo !== "conteudo") {
    redirect("/motorista");
  }

  const [carouselSlides, quickAccessItems] = await Promise.all([
    getHomeCarouselSlides(),
    getHomeQuickAccessItems(),
  ]);

  return (
    <div className="page-stack">
      <HomeCarousel slides={carouselSlides} />

      <section className="home-utility-section">
        <div className="home-utility-grid">
          <Link href="/calculadora" className="home-utility-card home-utility-card--ev">
            <div className="home-utility-card__icon"><BatteryCharging size={27} /></div>
            <div><span>PARA QUEM PENSA EM ELÉTRICO</span><h2>Vale a pena ter um elétrico?</h2><p>Compare energia, combustível e manutenção com base no seu uso.</p></div>
            <strong>Calcular economia <ArrowRight size={18} /></strong>
          </Link>
          <Link href="/motorista/calculadora" className="home-utility-card home-utility-card--driver">
            <div className="home-utility-card__icon"><Calculator size={27} /></div>
            <div><span>PARA MOTORISTAS</span><h2>Quanto cobrar por uma viagem?</h2><p>Monte uma referência profissional com quilômetros, horas e despesas.</p></div>
            <strong>Montar orçamento <ArrowRight size={18} /></strong>
          </Link>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">ACESSO RÁPIDO</span><h2>Encontre o que precisa sem perder tempo.</h2></div>
          <p>Conteúdo, ferramentas, manuais, parceiros e benefícios organizados em áreas próprias.</p>
        </div>
        <div className="quick-access-grid">
          {quickAccessItems.map((item) => {
            const Icon = getHomeQuickAccessIcon(item.icon);
            return (
              <Link href={item.href} className={`quick-card quick-card--${item.accent}`} key={item.id}>
                <div className="quick-card__icon"><Icon size={24} /></div>
                <div><h3>{item.title}</h3><p>{item.description}</p></div>
                <ArrowRight className="quick-card__arrow" size={19} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section-block" id="videos">
        <div className="section-heading section-heading--inline">
          <div><span className="eyebrow">DESTAQUES DO CANAL</span><h2>Conteúdo que representa o projeto.</h2></div>
          <Link href="/videos" className="text-link">Ver todos <ArrowRight size={17} /></Link>
        </div>
        <LiveVideoGrid fallback={videos} limit={3} />
      </section>

      <section className="community-section">
        <div className="community-section__icon"><Route size={30} /></div>
        <div className="community-section__content">
          <span className="eyebrow">PLATAFORMA PRÓPRIA</span>
          <h2>Mais que um aplicativo: um ponto de encontro da comunidade.</h2>
          <p>O JNE App é a casa oficial dos conteúdos, arquivos, parceiros e benefícios exclusivos.</p>
        </div>
        <Link href="/membros" className="button button--primary">Conhecer a área VIP <ArrowRight size={17} /></Link>
      </section>

      <section className="trust-grid">
        {trustItems.map((item) => {
          const Icon = item.icon;
          return <article key={item.title}><Icon size={23} /><div><h2>{item.title}</h2><p>{item.description}</p></div></article>;
        })}
      </section>
    </div>
  );
}
