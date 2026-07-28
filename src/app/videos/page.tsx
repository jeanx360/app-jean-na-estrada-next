import type { Metadata } from "next";
import { ExternalLink, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { VideoCard } from "@/components/VideoCard";
import { videos } from "@/data/content";

export const metadata: Metadata = { title: "Vídeos" };

export default function VideosPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="CONTEÚDO DO CANAL"
        title="Vídeos do Jean na Estrada"
        description="Uma seleção inicial de conteúdos que representam os principais pilares do canal: uso real, tutoriais e lançamentos."
      />

      <section className="content-summary" aria-label="Resumo da seção de vídeos">
        <div>
          <Video size={24} />
          <span>
            <strong>{videos.length}</strong>
            destaques cadastrados
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

      <section className="video-grid" aria-label="Vídeos em destaque">
        {videos.map((video) => (
          <VideoCard video={video} key={video.videoId} />
        ))}
      </section>

      <section className="info-panel">
        <div>
          <span>PRÓXIMA EVOLUÇÃO</span>
          <h2>Os últimos vídeos serão carregados automaticamente.</h2>
          <p>
            Nesta etapa os destaques ficam em um arquivo organizado. Depois, a camada Node buscará o feed do YouTube, aplicará cache e entregará os dados prontos para o aplicativo.
          </p>
        </div>
      </section>
    </div>
  );
}
