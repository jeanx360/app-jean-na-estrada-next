import Link from "next/link";
import { ArrowRight, Route } from "lucide-react";
import { HomeCarousel } from "@/components/HomeCarousel";
import { LiveVideoGrid } from "@/components/LiveVideoGrid";
import { videos } from "@/data/content";
import { trustItems } from "@/data/home";
import { getHomeCarouselSlides } from "@/lib/home-carousel";
import {
  getHomeQuickAccessIcon,
  getHomeQuickAccessItems,
} from "@/lib/home-quick-access";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [carouselSlides, quickAccessItems] = await Promise.all([
    getHomeCarouselSlides(),
    getHomeQuickAccessItems(),
  ]);

  return (
    <div className="page-stack">
      <HomeCarousel slides={carouselSlides} />

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
