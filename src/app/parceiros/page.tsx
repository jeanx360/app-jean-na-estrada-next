import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Parceiros" };

export default function PartnersPage() {
  return (
    <PlaceholderPage
      eyebrow="REDE DE CONFIANÇA"
      title="Parceiros"
      description="Empresas, oficinas e serviços recomendados para a comunidade Jean na Estrada."
      items={[
        { title: "Perfil completo", description: "Logo, endereço, contato, mapa e serviços oferecidos." },
        { title: "Benefícios", description: "Vantagens e condições especiais para membros quando disponíveis." },
        { title: "Localização", description: "Organização por cidade e região para facilitar a busca." },
      ]}
    />
  );
}
