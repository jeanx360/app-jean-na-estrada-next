import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Área de membros" };

export default function MembersPage() {
  return (
    <PlaceholderPage
      eyebrow="CONTEÚDO EXCLUSIVO"
      title="Área de membros"
      description="A futura área protegida do JNE App para membros cadastrados e conteúdos VIP."
      items={[
        { title: "Login e perfil", description: "Acesso individual com permissões definidas no servidor." },
        { title: "Conteúdos VIP", description: "Tutoriais, arquivos, avisos e benefícios exclusivos." },
        { title: "Convites controlados", description: "Entrada autorizada, validade e gestão pelo painel administrativo." },
      ]}
    />
  );
}
