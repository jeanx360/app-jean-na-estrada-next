import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Vídeos" };

export default function VideosPage() {
  return (
    <PlaceholderPage
      eyebrow="CONTEÚDO DO CANAL"
      title="Vídeos"
      description="Página preparada para integrar o canal, organizar destaques e separar conteúdos por tema."
      items={[
        { title: "Últimos vídeos", description: "Integração futura com a API ou feed oficial do YouTube." },
        { title: "Destaques", description: "Seleção manual dos vídeos mais estratégicos para o projeto." },
        { title: "Categorias", description: "Elétricos, tutoriais, manutenção, lançamentos e tecnologia." },
      ]}
    />
  );
}
