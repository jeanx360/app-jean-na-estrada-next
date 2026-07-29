import Link from "next/link";
import { ArrowRight, BellRing, Route } from "lucide-react";
import { HomeCarousel } from "@/components/HomeCarousel";
import { LiveVideoGrid } from "@/components/LiveVideoGrid";
import { videos } from "@/data/content";
import { quickAccessItems, trustItems } from "@/data/home";
import { getAuthContext } from "@/lib/auth";
import { getHomeCarouselSlides } from "@/lib/home-carousel";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ supabase }, carouselSlides] = await Promise.all([getAuthContext(), getHomeCarouselSlides()]);
  const { data: featuredNotifications } = await supabase
    .from("notifications")
    .select("id, title, message, action_url, category")
    .eq("is_published", true)
    .eq("is_featured", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(3);

  return (
    <div className="page-stack">
      <HomeCarousel slides={carouselSlides} />

      {featuredNotifications?.length ? (
        <section className="home-notification-strip">
          <div className="home-notification-strip__heading">
            <BellRing size={22} />
            <div><span>AVISOS IMPORTANTES</span><h2>Novidades do JNE App</h2></div>
            <Link href="/notificacoes" className="text-link">Ver central <ArrowRight size={16} /></Link>
          </div>
          <div className="home-notification-strip__grid">
            {featuredNotifications.map((item) => (
              <article key={item.id}>
                <span>{item.category === "videos" ? "VÍDEO" : item.category === "tutorials" ? "TUTORIAL" : item.category === "apps" ? "APP" : item.category === "benefits" ? "BENEFÍCIO" : "JNE APP"}</span>
                <h3>{item.title}</h3>
                <p>{item.message}</p>
                {item.action_url ? <Link href={item.action_url}>Abrir <ArrowRight size={15} /></Link> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">ACESSO RÁPIDO</span><h2>Encontre o que precisa sem perder tempo.</h2></div>
          <p>Conteúdo, ferramentas, manuais, parceiros e benefícios organizados em áreas próprias.</p>
        </div>
        <div className="quick-access-grid">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link href={item.href} className={`quick-card quick-card--${item.accent}`} key={item.title}>
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
