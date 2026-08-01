import type { Metadata } from "next";
import { AuthCard } from "@/components/AuthCard";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie sua conta no JNE App.",
};

export default function CadastroPage() {
  return (
    <AuthCard
      eyebrow="NOVO MEMBRO"
      title="Crie sua conta"
      description="O cadastro básico é gratuito. Benefícios VIP serão liberados somente para usuários autorizados."
    >
      <AuthForm mode="signup" />
    </AuthCard>
  );
}
