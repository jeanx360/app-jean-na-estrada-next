import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Play,
  Route,
  Sparkles,
  Zap,
} from "lucide-react";
import { LiveVideoGrid } from "@/components/LiveVideoGrid";
import { videos } from "@/data/content";
import { quickAccessItems, trustItems } from "@/data/home";
import { getAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { supabase } = await getAuthContext();
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
      <section className="hero-section">
        <div className="hero-section__content">
          <span className="eyebrow">
            <Sparkles size={15} />
            NOVO JNE APP
          </span>
          <h1>
            O universo do <span>Jean na Estrada</span> em um só lugar.
          </h1>
          <p>
            Vídeos, tutoriais, aplicativos automotivos, parceiros e benefícios organizados em uma plataforma preparada para crescer.
          </p>

          <div className="hero-section__actions">
            <Link href="/videos" className="button button--primary">
              <Play size={17} fill="currentColor" />
              Ver vídeos
            </Link>
            <Link href="/tutoriais" className="button button--secondary">
              Explorar tutoriais
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="hero-section__proof">
            <span><CheckCircle2 size={16} /> Conteúdo real</span>
            <span><CheckCircle2 size={16} /> Experiência prática</span>
            <span><CheckCircle2 size={16} /> Informação transparente</span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-visual__glow" />
          <div className="hero-visual__road">
            <span />
            <span />
            <span />
          </div>
          <div className="hero-visual__vehicle">
            <Zap size={34} />
            <strong>Mobilidade elétrica</strong>
            <span>tecnologia • estrada • vida real</span>
          </div>
          <div className="hero-visual__metric hero-visual__metric--top">
            <small>VERSÃO ATUAL</small>
            <strong>Conteúdo real</strong>
          </div>
          <div className="hero-visual__metric hero-visual__metric--bottom">
            <small>CONTEÚDO AUTOMÁTICO</small>
            <strong>Vídeos e notícias atualizados</strong>
          </div>
        </div>
      </section>

      {featuredNotifications?.length ? (
        <section className="home-notification-strip">
          <div className="home-notification-strip__heading">
            <BellRing size={22} />
            <div>
              <span>AVISOS IMPORTANTES</span>
              <h2>Novidades do JNE App</h2>
            </div>
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
          <div>
            <span className="eyebrow">ACESSO RÁPIDO</span>
            <h2>Encontre o que precisa sem perder tempo.</h2>
          </div>
          <p>As áreas principais já estão separadas e agora começam a receber os dados reais do projeto.</p>
        </div>

        <div className="quick-access-grid">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link href={item.href} className={`quick-card quick-card--${item.accent}`} key={item.title}>
                <div className="quick-card__icon"><Icon size={24} /></div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <ArrowRight className="quick-card__arrow" size={19} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section-block" id="videos">
        <div className="section-heading section-heading--inline">
          <div>
            <span className="eyebrow">DESTAQUES DO CANAL</span>
            <h2>Conteúdo que representa o projeto.</h2>
          </div>
          <Link href="/videos" className="text-link">
            Ver todos
            <ArrowRight size={17} />
          </Link>
        </div>

        <LiveVideoGrid fallback={videos} limit={3} />
      </section>

      <section className="community-section">
        <div className="community-section__icon"><Route size={30} /></div>
        <div className="community-section__content">
          <span className="eyebrow">PLATAFORMA PRÓPRIA</span>
          <h2>Mais que um aplicativo: um ponto de encontro da comunidade.</h2>
          <p>
            O novo JNE App será a casa oficial dos conteúdos, arquivos, parceiros e futuros benefícios exclusivos.
          </p>
        </div>
        <Link href="/membros" className="button button--primary">
          Conhecer a área VIP
          <ArrowRight size={17} />
        </Link>
      </section>

      <section className="trust-grid">
        {trustItems.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title}>
              <Icon size={23} />
              <div>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </div>
            </article>
          );
        })}
      </section>

      <footer className="site-footer">
        <p>JNE App — Jean na Estrada</p>
        <span>Versão de desenvolvimento 0.9.0</span>
      </footer>
    </div>
  );
}
