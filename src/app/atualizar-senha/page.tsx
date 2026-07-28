import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { AuthForm } from "@/components/AuthForm";
import { getAuthContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Atualizar senha",
  description: "Defina uma nova senha para o JNE App.",
};

export default async function AtualizarSenhaPage() {
  const { userId } = await getAuthContext();

  if (!userId) {
    redirect("/entrar");
  }

  return (
    <AuthCard
      eyebrow="SEGURANÇA"
      title="Crie uma nova senha"
      description="Use pelo menos 8 caracteres e evite repetir uma senha utilizada em outros serviços."
    >
      <AuthForm mode="update-password" />
    </AuthCard>
  );
}
