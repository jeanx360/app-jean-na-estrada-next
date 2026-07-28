import type { Metadata } from "next";
import { AuthCard } from "@/components/AuthCard";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Solicite a redefinição da senha do JNE App.",
};

export default function RecuperarSenhaPage() {
  return (
    <AuthCard
      eyebrow="RECUPERAÇÃO"
      title="Redefina sua senha"
      description="Informe o e-mail usado no cadastro. Você receberá um link seguro para criar uma nova senha."
    >
      <AuthForm mode="reset" />
    </AuthCard>
  );
}
