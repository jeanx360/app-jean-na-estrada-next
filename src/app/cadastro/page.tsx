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
      description="O cadastro é gratuito. Depois da confirmação, o JNE App orienta os primeiros passos e libera os recursos do seu plano."
    >
      <AuthForm mode="signup" />
    </AuthCard>
  );
}
