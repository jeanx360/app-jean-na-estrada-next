import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { NewsFeed } from "@/components/NewsFeed";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Notícias" };

export default function NewsPage() {
  return (
    <div className="page-stack">
      <PageHeader
        icon={<Newspaper size={24} />}
        eyebrow="MOBILIDADE E TECNOLOGIA"
        title="Notícias selecionadas"
        description="Uma leitura organizada de veículos elétricos, lançamentos, recarga, baterias e tecnologia automotiva, reunida a partir de fontes especializadas."
      />

      <section className="news-curation-note">
        <strong>Curadoria automática com foco automotivo</strong>
        <p>O sistema filtra assuntos relacionados a elétricos, híbridos, tecnologia, mercado e lançamentos. A publicação original sempre abre no site da fonte.</p>
      </section>

      <NewsFeed />
    </div>
  );
}
