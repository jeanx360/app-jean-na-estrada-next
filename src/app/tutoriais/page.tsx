import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Guias e tutoriais" };

export default function TutorialsPage() {
  return (
    <PlaceholderPage
      eyebrow="APRENDA NA PRÁTICA"
      title="Guias e tutoriais"
      description="Tutoriais completos, arquivos de apoio e instruções organizadas por veículo e dificuldade."
      items={[
        { title: "Por montadora", description: "BYD, Geely, GWM e outras marcas em categorias separadas." },
        { title: "Passo a passo", description: "Instruções claras, imagens, vídeos e avisos importantes." },
        { title: "Materiais de apoio", description: "PDFs, links e arquivos associados a cada tutorial." },
      ]}
    />
  );
}
