import type { Metadata } from "next";
import { ExternalLink, RefreshCw, Video } from "lucide-react";
import { LiveVideoGrid } from "@/components/LiveVideoGrid";
import { PageHeader } from "@/components/PageHeader";
import { videos } from "@/data/content";

export const metadata: Metadata = { title: "Vídeos" };

export default function VideosPage() {
  return (
    <div className="page-stack">
      <PageHeader
        icon={<Video size={24} />}
        eyebrow="CONTEÚDO DO CANAL"
        title="Vídeos do Jean na Estrada"
        description="Os conteúdos mais recentes do canal são sincronizados automaticamente, com os destaques salvos como segurança quando uma fonte externa estiver indisponível."
      />

      <section className="content-summary" aria-label="Resumo da seção de vídeos">
        <div>
          <RefreshCw size={24} />
          <span>
            <strong>Sincronização automática</strong>
            feed oficial do canal
          </span>
        </div>
        <a
          className="button button--secondary"
          href="https://www.youtube.com/@jeannaestrada"
          target="_blank"
          rel="noreferrer"
        >
          Abrir canal completo
          <ExternalLink size={16} />
        </a>
      </section>

      <LiveVideoGrid fallback={videos} showStatus />

      <section className="info-panel">
        <div>
          <span>CONTEÚDO SEM TRABALHO DUPLICADO</span>
          <h2>Publicou no YouTube, apareceu no JNE App.</h2>
          <p>
            O GitHub Actions consulta o feed oficial, gera um arquivo seguro e atualiza a versão publicada. O navegador recebe apenas dados já organizados, sem depender de proxies públicos durante o uso.
          </p>
        </div>
      </section>
    </div>
  );
}
