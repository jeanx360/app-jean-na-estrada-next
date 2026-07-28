import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Notícias" };

export default function NewsPage() {
  return (
    <PlaceholderPage
      eyebrow="INFORMAÇÃO"
      title="Notícias"
      description="Uma central organizada de notícias sobre veículos elétricos, tecnologia e mobilidade."
      items={[
        { title: "Fontes selecionadas", description: "Conteúdo reunido de fontes confiáveis e relevantes." },
        { title: "Resumo objetivo", description: "Informações diretas para facilitar a leitura no celular." },
        { title: "Curadoria do Jean", description: "Destaques e comentários com contexto prático." },
      ]}
    />
  );
}
