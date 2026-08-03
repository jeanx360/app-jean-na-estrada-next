import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { AuthForm } from "@/components/AuthForm";
import { getAuthContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie sua conta gratuita no JNE App.",
};

function safeNext(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/comecar";
}

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const { userId, profile } = await getAuthContext();
  if (userId && !profile?.is_blocked) redirect(next);

  return (
    <AuthCard
      eyebrow="CADASTRO GRATUITO"
      title="Crie sua conta em poucos passos"
      description="Informe os dados essenciais. Se você for motorista profissional, o veículo e o cartão inicial são preparados no mesmo cadastro."
    >
      <AuthForm mode="signup" next={next} />
    </AuthCard>
  );
}
