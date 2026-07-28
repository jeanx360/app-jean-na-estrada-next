import type { Metadata } from "next";
import { AuthCard } from "@/components/AuthCard";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta no JNE App.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/membros";

  return (
    <AuthCard
      eyebrow="CONTA JNE"
      title="Entre na sua conta"
      description="Acesse seu perfil, recados e os conteúdos liberados para sua categoria de membro."
    >
      {params.erro === "link-invalido" ? (
        <p className="auth-message auth-message--error">O link expirou ou já foi utilizado. Tente novamente.</p>
      ) : null}
      <AuthForm mode="login" next={next} />
    </AuthCard>
  );
}
