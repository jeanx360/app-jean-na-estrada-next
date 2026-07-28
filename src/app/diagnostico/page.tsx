import type { Metadata } from "next";
import { CheckCircle2, Database, Server, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Diagnóstico",
  description: "Diagnóstico do backend do JNE App.",
};

export const dynamic = "force-dynamic";

export default async function DiagnosticoPage() {
  const envReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const { userId, profile } = await getAuthContext();

  const checks = [
    {
      icon: Server,
      title: "Servidor Next.js",
      value: "Ativo na Vercel",
      ok: true,
    },
    {
      icon: Database,
      title: "Variáveis do Supabase",
      value: envReady ? "Configuradas" : "Ausentes",
      ok: envReady,
    },
    {
      icon: ShieldCheck,
      title: "Sessão de usuário",
      value: userId ? `Autenticado como ${profile?.role ?? "member"}` : "Visitante",
      ok: true,
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        icon={<CheckCircle2 size={24} />}
        eyebrow="BACKEND"
        title="Diagnóstico"
        description="Verificação rápida da estrutura Node, autenticação e conexão com o Supabase."
      />
      <section className="diagnostic-grid">
        {checks.map((check) => {
          const Icon = check.icon;
          return (
            <article className="diagnostic-card" key={check.title}>
              <Icon size={24} />
              <div>
                <h2>{check.title}</h2>
                <p>{check.value}</p>
              </div>
              <span className={check.ok ? "is-ok" : "is-error"}>{check.ok ? "OK" : "ATENÇÃO"}</span>
            </article>
          );
        })}
      </section>
    </div>
  );
}
